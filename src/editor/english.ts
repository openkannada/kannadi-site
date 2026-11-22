// Typing Kannada in plain English letters: the suggestions for the word being
// typed, from the word list or the typing engine, and the strip that shows them. After a word is done its
// alternatives stay on the strip until the next edit, so a phone keyboard that
// commits the word with its space still leaves a chance to swap it.
import type { ComposingWord } from "./compose.ts";
import type { SuggestStrip } from "./strip.ts";
import { count, fmt, S } from "./strings.ts";

/** Where suggestions come from: the word list or the typing engine. */
export interface WordSource {
  /** Kannada words for `latin`, best first; the first is the one shown while it is typed. */
  suggest(latin: string): string[];
  /** Remembers that `word` was chosen for `latin`, so it comes first next time. */
  remember(latin: string, word: string): void;
}

/** Fetches what a word source needs, without building it; the builder it gives makes the source. */
export type LoadSource = () => Promise<() => Promise<WordSource>>;

/** The literal Baraha spelling, where capitals carry no meaning; English x and q have no Baraha letter, so they read as ks and k. */
export const strictSpelling = (transliterate: (latin: string) => string, latin: string) =>
  transliterate(latin.toLowerCase().replace(/x/g, "ks").replace(/q/g, "k"));

export interface EnglishDeps {
  /** Baraha letters to Kannada, for the literal spelling shown until suggestions are ready. */
  transliterate: (latin: string) => string;
  loadSource: LoadSource;
  strip: SuggestStrip;
  text: () => string;
  /** Replaces a finished word in the document. */
  replace: (start: number, end: number, text: string) => void;
  /** The collapsed caret, or null, and a way to put it back after a swap. */
  caret: () => number | null;
  select: (at: number) => void;
  announce: (message: string) => void;
  /** Suggestions are ready. */
  onReady?: () => void;
}

/** What the composer offers this class: the word being typed and ways to change it. */
export interface EnglishComposer {
  readonly current: ComposingWord | null;
  /** The typing mode; only a word typed in English letters is respelled from the list. */
  readonly mode: string;
  /** Whether a keyboard is composing; text under a composition is never rewritten. */
  readonly composing: boolean;
  respell: (kannada: string) => void;
  choose: (kannada: string) => void;
}

interface Shown {
  word: ComposingWord;
  choices: string[];
  chosen: number;
}

/** After a failed load, wait this long before fetching again. */
const RETRY_MS = 30_000;

export class EnglishTyping {
  private readonly deps: EnglishDeps;
  private composer: EnglishComposer | null = null;
  private suggester: WordSource | null = null;
  private loading: Promise<void> | null = null;
  /** What the source needs, fetched ahead of use; building it waits for the first use. */
  private fetched: Promise<() => Promise<WordSource>> | null = null;
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

  /** Fetches what suggestions need, and only prepares them, so a page that opens in English letters stays responsive. */
  prefetch(): void {
    if (this.suggester || this.fetched) return;
    this.fetched = this.deps.loadSource();
    this.fetched.catch(() => (this.fetched = null));
  }

  /** Starts loading the suggestions, unless they are loaded, loading, or failed a moment ago. */
  prepare(now = Date.now()): Promise<void> | null {
    if (this.suggester || this.loading || now - this.failedAt < RETRY_MS) return this.loading;
    this.loading = (async () => {
      const build = await (this.fetched ?? this.deps.loadSource());
      this.suggester = await build();
      this.respellCurrent();
      this.deps.onReady?.();
    })()
      .catch(() => {
        this.failedAt = Date.now();
        // What was fetched may be what failed, as a page in place of the file, so the next try fetches again.
        this.fetched = null;
      })
      .finally(() => {
        this.loading = null;
      });
    return this.loading;
  }

  /** A word typed while suggestions loaded was spelled letter by letter; it gets its best spelling now. */
  private respellCurrent(): void {
    const word = this.composer?.current;
    if (!word || !this.suggester || this.composer?.mode !== "english" || this.composer.composing) return;
    const best = this.spell(word.latin);
    if (best !== this.deps.text().slice(word.start, word.end).replace(/\u200C$/, "")) this.composer?.respell(best);
    this.typing(this.composer?.current ?? null);
  }

  private strict(latin: string): string {
    return strictSpelling(this.deps.transliterate, latin);
  }

  /** The Kannada shown for `latin` while it is typed: the best suggestion. */
  spell(latin: string): string {
    void this.prepare();
    const strict = this.strict(latin);
    const choices = this.suggester?.suggest(latin) ?? [];
    this.choices = choices.length ? choices : [strict];
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
    // A ZWNJ that keeps a final virama from joining the next word is not part of the spelling.
    const shown = this.deps.text().slice(word.start, word.end).replace(/\u200C$/, "");
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
    this.suggester?.remember(latin, word);
  }

  private announceLater(message: string): void {
    clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => this.deps.announce(message), 900);
  }
}
