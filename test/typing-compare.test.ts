// Compares the 2 sources of suggestions for English letters, the word list and the typing engine, on the Dakshina
// Kannada test words and on the start of words as they are typed: npm test. Needs the kannadi checkout that
// scripts/build-wasm.sh builds from, in KANNADI_DIR or .kannadi, for the test words.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { strictSpelling } from "../src/editor/english.ts";
import { parseWords, SHOWN, Suggester } from "../src/editor/suggest.ts";
import { initSync as initTyping, TypingEngine } from "../src/editor/typing/kannadi_typing_wasm.js";
import { initSync, latinKey, phoneticKey, transliterate } from "../src/editor/wasm/kannadi_wasm.js";

const file = (path: string) => readFileSync(new URL(path, import.meta.url));
initSync({ module: file("../src/editor/wasm/kannadi_wasm_bg.wasm") });
initTyping({ module: file("../src/editor/typing/kannadi_typing_wasm_bg.wasm") });

const baraha = (latin: string) => transliterate(latin, "baraha", "kannada");
const sources = {
  list: await Suggester.create(
    { phoneticKey: (w) => phoneticKey(w, "medium"), latinKey: (l) => latinKey(l, "medium"), strict: (l) => strictSpelling(baraha, l) },
    parseWords(file("../data/words.tsv").toString()),
    [],
    async () => {},
  ),
  engine: new TypingEngine(new Uint8Array(file("../src/editor/typing/kn.typing"))),
};
const suggest = {
  list: (latin: string) => sources.list.suggest(latin),
  engine: (latin: string) => sources.engine.suggest(latin, undefined, SHOWN),
};
type Name = keyof typeof suggest;
const pct = (n: number, of: number) => `${((100 * n) / of).toFixed(2)}%`;

const kannadi = process.env.KANNADI_DIR ?? new URL("../.kannadi", import.meta.url).pathname;
const dakshina = `${kannadi}/crates/kannadi-typing/eval/dakshina-kn-test.tsv`;

test("on the Dakshina Kannada test words, the typing engine finds the word more often than the word list", { skip: !existsSync(dakshina) && `no ${dakshina}` }, (t) => {
  // Scored as IndicXlit scores it: each distinct romanization once, right when it gives any word listed for it.
  const wanted = new Map<string, Set<string>>();
  for (const line of readFileSync(dakshina, "utf8").split("\n")) {
    const [word, latin] = line.split("\t");
    if (!word || !latin) continue;
    wanted.set(latin, (wanted.get(latin) ?? new Set()).add(word));
  }
  const score: Record<Name, { top1: number; top5: number }> = { list: { top1: 0, top5: 0 }, engine: { top1: 0, top5: 0 } };
  for (const [latin, words] of wanted) {
    for (const name of ["list", "engine"] as const) {
      const got = suggest[name](latin);
      if (words.has(got[0] ?? "")) score[name].top1++;
      if (got.some((w) => words.has(w))) score[name].top5++;
    }
  }
  for (const name of ["list", "engine"] as const) t.diagnostic(`${name}: top-1 ${pct(score[name].top1, wanted.size)}, top-5 ${pct(score[name].top5, wanted.size)} of ${wanted.size}`);
  assert.ok(score.engine.top1 > score.list.top1);
});

test("what each source shows for the start of a word, beside what its letters spell in Baraha", (t) => {
  // A report, not a check: the word shown while typing is the first suggestion, and either source may put a common
  // word there, as the word list puts ಲಾ for la.
  const starts = ["ka", "ga", "na", "ma", "ta", "da", "pa", "ba", "ra", "la", "va", "sa", "ha", "ki", "ku", "ke", "ko", "ti", "be", "kaa", "nam", "til"];
  for (const name of ["list", "engine"] as const) {
    const differ = starts.filter((s) => suggest[name](s)[0] !== strictSpelling(baraha, s)).map((s) => `${s} ${suggest[name](s)[0]}`);
    t.diagnostic(`${name}: ${starts.length - differ.length} of ${starts.length} as spelled${differ.length ? `; others: ${differ.join(", ")}` : ""}`);
  }
});
