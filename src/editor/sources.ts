// The 2 sources of suggestions for English letters: the word list, matched by sound, and the typing engine, a model
// of how people spell Kannada in English letters (?typing=next). Each keeps the words a person picked on this device.
import { type LoadSource, strictSpelling, type WordSource } from "./english.ts";
import { parseWords, SHOWN, Suggester, type SuggestKannadi } from "./suggest.ts";

/** localStorage, where a failure only loses a convenience. */
export interface Keep {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

/** The word list's picks: [latin, word] pairs, oldest first. */
export const PICKS = "kannadi.picks.v1";
/** The typing engine's picks, in its own text form. */
export const ENGINE_PICKS = "kannadi.typing.v1";

/** Fetches a file the editor needs; `what` names it in the error. */
export async function fetched(url: string, what: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status}`);
  return res;
}

/** The [latin, word] pairs kept by the word list, or none. */
export function listPicks(keep: Keep): [string, string][] {
  let value: unknown;
  try {
    value = JSON.parse(keep.read(PICKS) ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is [string, string] => Array.isArray(p) && p.length === 2 && p.every((s) => typeof s === "string"));
}

/** Words that sound like the letters, from the text of data/words.tsv, commonest first. */
export function wordList(kannadi: Omit<SuggestKannadi, "strict"> & { transliterate: (latin: string) => string }, keep: Keep, words: () => Promise<string>): LoadSource {
  return async () => {
    const text = await words();
    return async () => {
      const k = { ...kannadi, strict: (latin: string) => strictSpelling(kannadi.transliterate, latin) };
      const suggester = await Suggester.create(k, parseWords(text), listPicks(keep));
      return {
        suggest: (latin) => suggester.suggest(latin),
        remember(latin, word) {
          suggester.remember(latin, word);
          keep.write(PICKS, JSON.stringify(suggester.remembered()));
        },
      };
    };
  };
}

/** The typing engine from kannadi, with the bytes of its model; the word list's picks carry over the first time. */
export function typingEngine(keep: Keep, model: () => Promise<ArrayBuffer>): LoadSource {
  return async () => {
    // The engine compiles here, ahead of the first word, as the word list fetches ahead.
    const [wasm, bytes] = await Promise.all([import("./typing/kannadi_typing_wasm.js").then(async (w) => (await w.default(), w)), model()]);
    return async () => {
      const engine = new wasm.TypingEngine(new Uint8Array(bytes));
      const kept = keep.read(ENGINE_PICKS);
      if (!(kept && engine.importUser(kept))) {
        for (const [latin, word] of listPicks(keep)) engine.learn(latin, word);
      }
      return {
        suggest: (latin): string[] => engine.suggest(latin, undefined, SHOWN),
        remember(latin, word) {
          if (engine.learn(latin, word)) keep.write(ENGINE_PICKS, engine.exportUser());
        },
      } satisfies WordSource;
    };
  };
}
