// Phonetic typing: Latin letters turn into Kannada as you type. The word being
// typed is kept as Latin in `latin`, and each new letter re-renders the whole
// word, since a later letter can change an earlier one (k is ಕ್, ka is ಕ).

import type { EditorSurface } from "./editor.ts";
import type { Edit, TypingMode } from "./text.ts";

type LatinMode = Exclude<TypingMode, "kannada">;

const LETTERS: Record<LatinMode, RegExp> = {
  english: /^[A-Za-z]+$/,
  baraha: /^[A-Za-z~^_]+$/,
  iso15919: /^[\p{Script=Latin}\p{M}:]+$/u,
};

/** The word being typed: its Latin letters and where its Kannada rendering sits. */
export interface ComposingWord {
  latin: string;
  start: number;
  end: number;
}

export interface ComposerEvents {
  /** The rendered word's range, or [] when no word is being typed. */
  onComposing: (range: number[]) => void;
  /** The word being typed after each change, or null when it is done. */
  onWord?: (word: ComposingWord | null) => void;
  /** A word is done: kept as rendered, or put back in Latin letters. */
  onDone?: (word: ComposingWord, kept: boolean) => void;
}
// Phone keyboards that compose whole words often commit the word and the
// space after it as 1 insertion.
const WORD_AND_BREAK = /^(.+?)([\s.,;:!?]+)$/u;

/** The editor surface the composer needs; EditorSurface provides it. */
export type ComposerEditor = Pick<EditorSurface, "replace" | "selection" | "select" | "composing" | "text">;

const KANNADA = /[\u0C80-\u0CFF]/u;
const VIRAMA = "\u0CCD";
const ZWNJ = "\u200C";

/** Before a Kannada letter, a final virama would join it and the browser would move the caret past both. */
function stopJoin(kannada: string, next: string | undefined): string {
  return kannada.endsWith(VIRAMA) && KANNADA.test(next ?? "") ? kannada + ZWNJ : kannada;
}

interface Word {
  start: number;
  latin: string;
  rendered: string;
}

export class Composer {
  mode: TypingMode = "kannada";
  private word: Word | null = null;
  private busy = false;
  private readonly editor: ComposerEditor;
  private readonly spell: (latin: string, mode: LatinMode) => string;
  private readonly events: ComposerEvents;

  /** `spell` writes a word's Latin letters in Kannada for a typing mode. */
  constructor(editor: ComposerEditor, spell: (latin: string, mode: LatinMode) => string, events: ComposerEvents) {
    this.editor = editor;
    this.spell = spell;
    this.events = events;
  }

  get current(): ComposingWord | null {
    return this.word ? { latin: this.word.latin, start: this.word.start, end: this.end() } : null;
  }

  setMode(mode: TypingMode): void {
    this.commit();
    this.mode = mode;
  }

  get composing(): boolean {
    return this.editor.composing;
  }

  end(): number {
    return this.word ? this.word.start + this.word.rendered.length : -1;
  }

  commit(): void {
    this.finish(true);
  }

  private finish(kept: boolean): void {
    const w = this.word;
    if (!w) return;
    // A ZWNJ is meaningful only before a Kannada letter; before a space, punctuation or the end it goes.
    const text = this.editor.text;
    const end = this.end();
    if (w.rendered.endsWith(ZWNJ) && text[end - 1] === ZWNJ && !KANNADA.test(text[end] ?? "")) {
      const sel = this.editor.selection();
      this.write(end - 1, end, "");
      w.rendered = w.rendered.slice(0, -1);
      if (sel) this.editor.select(sel.start >= end ? sel.start - 1 : sel.start, sel.end >= end ? sel.end - 1 : sel.end);
    }
    const done = this.current;
    if (!done) return;
    this.word = null;
    this.events.onComposing([]);
    this.events.onWord?.(null);
    this.events.onDone?.(done, kept);
  }

  /** Writes the composer's own change, which must not start or extend a word. */
  private write(start: number, end: number, text: string): void {
    this.busy = true;
    try {
      this.editor.replace(start, end, text, "compose");
    } finally {
      this.busy = false;
    }
  }

  /** Shows `kannada` for the word being typed and keeps typing it, for cycling through suggestions. */
  respell(kannada: string): void {
    const w = this.word;
    if (!w || !kannada) return;
    const out = stopJoin(kannada, this.editor.text[this.end()]);
    this.write(w.start, this.end(), out);
    w.rendered = out;
    this.events.onComposing([w.start, w.start + out.length]);
  }

  /** Puts `kannada` in place of the word being typed, and ends the word. */
  choose(kannada: string): void {
    this.respell(kannada);
    this.commit();
  }

  private render(replaceEnd: number, after = this.editor.text): void {
    const w = this.word;
    if (!w || this.mode === "kannada") return;
    const spelled = w.latin ? this.spell(w.latin, this.mode) : "";
    const out = stopJoin(spelled, after[replaceEnd]);
    this.write(w.start, replaceEnd, out);
    w.rendered = out;
    if (!out) {
      this.commit();
      return;
    }
    this.events.onComposing([w.start, w.start + out.length]);
    this.events.onWord?.(this.current);
  }

  /** Called after every edit; turns newly typed Latin letters into Kannada. */
  handle(edit: Edit, after: string, inputType: string): void {
    if (this.mode === "kannada" || this.busy) return;
    if (inputType !== "insertText" && inputType !== "insertCompositionText") {
      this.commit();
      return;
    }
    const inserted = after.slice(edit.start, edit.newEnd);
    // A phone keyboard can take back the word being typed and send it again whole, in place of its Kannada.
    const retyped = this.word && edit.start === this.word.start && edit.oldEnd === this.end() && inserted;
    if (retyped && this.word) this.word = { start: this.word.start, latin: "", rendered: "" };
    // Letters typed over a selection start a word in its place.
    const overSelection = !this.word && edit.oldEnd > edit.start && inputType === "insertText";
    const insertOnly = (edit.oldEnd === edit.start || retyped || overSelection) && inserted;
    const letters = LETTERS[this.mode];
    if (insertOnly && letters.test(inserted)) {
      this.extend(edit.start, inserted);
      this.render(edit.newEnd, after);
      return;
    }
    const m = insertOnly && inserted.match(WORD_AND_BREAK);
    if (m && m[1] && letters.test(m[1])) {
      this.extend(edit.start, m[1]);
      this.render(edit.start + m[1].length, after);
      // The caret goes after the space or punctuation that came with the word.
      const caret = this.end() + (m[2]?.length ?? 0);
      this.commit();
      this.editor.select(caret);
      return;
    }
    this.commit();
  }

  private extend(at: number, letters: string): void {
    if (this.word && at === this.end()) this.word.latin += letters;
    else this.word = { start: at, latin: letters, rendered: "" };
  }

  /** Backspace inside the word removes the last Latin letter, not a Kannada sign. */
  beforeInput(e: InputEvent): void {
    if (!this.word || e.inputType !== "deleteContentBackward" || !e.cancelable) return;
    const sel = this.editor.selection();
    if (!sel || sel.start !== sel.end || sel.end !== this.end()) return;
    e.preventDefault();
    this.word.latin = Array.from(this.word.latin).slice(0, -1).join("");
    this.render(this.end());
  }

  /** Escape keeps the word as typed, in Latin letters. */
  revert(): boolean {
    if (!this.word) return false;
    const { start, latin } = this.word;
    this.write(start, this.end(), latin);
    this.word.rendered = latin;
    this.finish(false);
    return true;
  }

  /** The caret left the word: the word is done. */
  selectionChanged(): void {
    // A keyboard composing the rest of the word moves the caret past it; the word goes on.
    if (!this.word || this.busy || this.editor.composing) return;
    const sel = this.editor.selection();
    if (!sel || sel.start !== sel.end || sel.end !== this.end()) this.commit();
  }
}
