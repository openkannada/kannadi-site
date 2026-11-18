// Typing Kannada in plain English letters: the word list, the suggestions for the
// word being typed, and the strip that shows them. After a word is done its
// alternatives stay on the strip until the next edit, so a phone keyboard that
// commits the word with its space still leaves a chance to swap it.
import type { ComposingWord } from "./compose.ts";
import type { SuggestStrip } from "./strip.ts";
import { count, fmt, S } from "./strings.ts";
import { parseWords, Suggester, type SuggestKannadi } from "./suggest.ts";

export interface EnglishDeps {
  kannadi: Omit<SuggestKannadi, "strict"> & { transliterate: (latin: string) => string };
  /** The text of data/words.tsv. */
  loadWords: () => Promise<string>;
  picks: { read: () => unknown; write: (picks: [string, string][]) => void };
  strip: SuggestStrip;
  text: () => string;
  /** Replaces a finished word in the document. */
  replace: (start: number, end: number, text: string) => void;
  /** The collapsed caret, or null, and a way to put it back after a swap. */
  caret: () => number | null;
  select: (at: number) => void;
  announce: (message: string) => void;
}

/** What the composer offers this class: the word being typed and ways to change it. */
export interface EnglishComposer {
  readonly current: ComposingWord | null;
  /** The typing mode; only a word typed in English letters is respelled from the list. */
  readonly mode: string;
  respell: (kannada: string) => void;
  choose: (kannada: string) => void;
}

interface Shown {
  word: ComposingWord;
  choices: string[];
  chosen: number;
}

/** After a failed load, wait this long before fetching the word list again. */
const RETRY_MS = 30_000;

function validPicks(value: unknown): [string, string][] {
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is [string, string] => Array.isArray(p) && p.length === 2 && p.every((s) => typeof s === "string"));
}

export class EnglishTyping {
  private readonly deps: EnglishDeps;
  private composer: EnglishComposer | null = null;
  private suggester: Suggester | null = null;
  private loading: Promise<void> | null = null;
  private failedAt = -Infinity;
  /** Suggestions for the word being typed. */
  private choices: string[] = [];
  private chosen = 0;
  /** A finished word whose alternatives are still on the strip. */
  private last: Shown | null = null;
  private announceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(deps: EnglishDeps) {
    this.deps = deps;
  }

  attach(composer: EnglishComposer): void {
    this.composer = composer;
  }

  get ready(): boolean {
    return this.suggester !== null;
  }

  /** Starts loading the word list, unless it is loaded, loading, or failed a moment ago. */
  prepare(now = Date.now()): Promise<void> | null {
    if (this.suggester || this.loading || now - this.failedAt < RETRY_MS) return this.loading;
    this.loading = (async () => {
      const words = parseWords(await this.deps.loadWords());
      const k = { ...this.deps.kannadi, strict: (latin: string) => this.strict(latin) };
      this.suggester = await Suggester.create(k, words, validPicks(this.deps.picks.read()));
      this.respellCurrent();
    })()
      .catch(() => {
        this.failedAt = Date.now();
      })
      .finally(() => {
        this.loading = null;
      });
    return this.loading;
  }

  /** A word typed while the list loaded was spelled letter by letter; it gets its best spelling now. */
  private respellCurrent(): void {
    const word = this.composer?.current;
    if (!word || !this.suggester || this.composer?.mode !== "english") return;
    const best = this.spell(word.latin);
    if (best !== this.deps.text().slice(word.start, word.end)) this.composer?.respell(best);
    this.typing(this.composer?.current ?? null);
  }

  /** Baraha spelling of loosely typed letters, where capitals carry no meaning. */
  private strict(latin: string): string {
    return this.deps.kannadi.transliterate(latin.toLowerCase());
  }

  /** The Kannada shown for `latin` while it is typed: the best suggestion. */
  spell(latin: string): string {
    void this.prepare();
    const strict = this.strict(latin);
    this.choices = this.suggester?.suggest(latin) ?? [strict];
    this.chosen = 0;
    return this.choices[0] ?? strict;
  }

  typing(word: ComposingWord | null): void {
    if (!word) return;
    this.last = null;
    if (this.choices.length > 1) {
      this.deps.strip.show(word, this.choices, this.chosen);
      this.announceLater(count(this.choices.length, S.suggest.choices));
    } else {
      this.deps.strip.hide();
    }
  }

  /** A word is done. Remembers a choice the user kept, and leaves its alternatives showing. */
  done(word: ComposingWord, kept: boolean): void {
    clearTimeout(this.announceTimer);
    const shown = this.deps.text().slice(word.start, word.end);
    if (!kept || !word.latin || shown !== this.choices[this.chosen]) {
      this.hide();
      return;
    }
    if (this.chosen > 0) this.remember(word.latin, this.choices[this.chosen]!);
    if (this.choices.length > 1) {
      this.last = { word, choices: this.choices, chosen: this.chosen };
      this.deps.strip.show(word, this.choices, this.chosen);
    } else {
      this.hide();
    }
  }

  pick(index: number): void {
    const composer = this.composer;
    if (composer?.current) {
      this.chosen = index;
      composer.choose(this.choices[index]!);
      return;
    }
    const last = this.last;
    if (!last) return;
    const { word, choices, chosen } = last;
    this.hide();
    if (this.deps.text().slice(word.start, word.end) !== choices[chosen]) return;
    const caret = this.deps.caret();
    const next = choices[index]!;
    this.deps.replace(word.start, word.end, next);
    // The caret stays where it was, after the space, moved by the change in length.
    if (caret !== null && caret >= word.end) this.deps.select(caret + next.length - (word.end - word.start));
    if (index > 0) this.remember(word.latin, next);
  }

  /** Tab and Shift+Tab move through the suggestions; returns true when the key was used. */
  cycle(backward: boolean): boolean {
    const composer = this.composer;
    if (!composer?.current) return false;
    if (this.choices.length > 1) {
      const n = this.choices.length;
      this.chosen = (this.chosen + (backward ? n - 1 : 1)) % n;
      composer.respell(this.choices[this.chosen]!);
      this.deps.strip.select(this.chosen);
      this.deps.announce(fmt(S.suggest.choice, { word: this.choices[this.chosen]!, i: this.chosen + 1, n }));
    }
    return true;
  }

  /** Another edit happened: the finished word's alternatives go away. */
  edited(): void {
    if (this.last) this.hide();
  }

  /** The caret moved: the finished word's alternatives stay only while it is next to the word. */
  caretMoved(at: number | null): void {
    const last = this.last;
    if (!last) return;
    const gap = at === null ? -1 : at - last.word.end;
    if (gap < 0 || gap > 1) this.hide();
  }

  hide(): void {
    this.last = null;
    clearTimeout(this.announceTimer);
    this.deps.strip.hide();
  }

  private remember(latin: string, word: string): void {
    if (!this.suggester) return;
    this.suggester.remember(latin, word);
    this.deps.picks.write(this.suggester.remembered());
  }

  private announceLater(message: string): void {
    clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => this.deps.announce(message), 900);
  }
}
