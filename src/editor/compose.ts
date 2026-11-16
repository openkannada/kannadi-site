// Phonetic typing: Latin letters turn into Kannada as you type. The word being
// typed is kept as Latin in `latin`, and each new letter re-renders the whole
// word, since a later letter can change an earlier one (k is ಕ್, ka is ಕ).

import type { DocEditor } from "./editor.ts";
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
}
// Phone keyboards that compose whole words often commit the word and the
// space after it as 1 insertion.
const WORD_AND_BREAK = /^(.+?)([\s.,;:!?]+)$/u;

/** The editor surface the composer needs; DocEditor provides it. */
export type ComposerEditor = Pick<DocEditor, "replace" | "selection">;

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

  /** The word being typed, or null. */
  get current(): ComposingWord | null {
    return this.word ? { latin: this.word.latin, start: this.word.start, end: this.end() } : null;
  }

  setMode(mode: TypingMode): void {
    this.commit();
    this.mode = mode;
  }

  end(): number {
    return this.word ? this.word.start + this.word.rendered.length : -1;
  }

  commit(): void {
    if (!this.word) return;
    this.word = null;
    this.events.onComposing([]);
    this.events.onWord?.(null);
  }

  /** Shows `kannada` for the word being typed and keeps typing it, for cycling through suggestions. */
  respell(kannada: string): void {
    const w = this.word;
    if (!w || !kannada) return;
    this.busy = true;
    try {
      this.editor.replace(w.start, this.end(), kannada, "compose");
    } finally {
      this.busy = false;
    }
    w.rendered = kannada;
    this.events.onComposing([w.start, w.start + kannada.length]);
  }

  /** Puts `kannada` in place of the word being typed, and ends the word. */
  choose(kannada: string): void {
    const w = this.word;
    if (!w) return;
    this.busy = true;
    try {
      this.editor.replace(w.start, this.end(), kannada, "compose");
    } finally {
      this.busy = false;
    }
    this.commit();
  }

  private render(replaceEnd: number): void {
    const w = this.word;
    if (!w || this.mode === "kannada") return;
    const out = w.latin ? this.spell(w.latin, this.mode) : "";
    this.busy = true;
    try {
      this.editor.replace(w.start, replaceEnd, out, "compose");
    } finally {
      this.busy = false;
    }
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
    const insertOnly = edit.oldEnd === edit.start && inserted;
    const letters = LETTERS[this.mode];
    if (insertOnly && letters.test(inserted)) {
      this.extend(edit.start, inserted);
      this.render(edit.newEnd);
      return;
    }
    const m = insertOnly && inserted.match(WORD_AND_BREAK);
    if (m && m[1] && letters.test(m[1])) {
      this.extend(edit.start, m[1]);
      this.render(edit.start + m[1].length);
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
    const end = this.end();
    this.word = null;
    this.busy = true;
    try {
      this.editor.replace(start, end, latin, "compose");
    } finally {
      this.busy = false;
    }
    this.events.onComposing([]);
    this.events.onWord?.(null);
    return true;
  }

  /** The caret left the word: the word is done. */
  selectionChanged(): void {
    if (!this.word || this.busy) return;
    const sel = this.editor.selection();
    if (!sel || sel.start !== sel.end || sel.end !== this.end()) this.commit();
  }
}
