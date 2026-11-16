// Phonetic typing: Latin letters typed in Baraha or ISO 15919 turn into Kannada
// as you type. The word being typed is kept as Latin in `latin`, and each new
// letter re-renders the whole word, since a later letter can change an earlier
// one (k is ಕ್, ka is ಕ).

import type { DocEditor } from "./editor.ts";
import type { Scheme } from "./kannadi.ts";
import type { Edit, TypingMode } from "./text.ts";

const LETTERS: Record<Exclude<TypingMode, "kannada">, RegExp> = {
  baraha: /^[A-Za-z~^_]+$/,
  iso15919: /^[\p{Script=Latin}\p{M}:]+$/u,
};
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
  private readonly transliterate: (text: string, from: Scheme, to: Scheme) => string;
  private readonly onComposing: (range: number[]) => void;

  constructor(
    editor: ComposerEditor,
    transliterate: (text: string, from: Scheme, to: Scheme) => string,
    onComposing: (range: number[]) => void,
  ) {
    this.editor = editor;
    this.transliterate = transliterate;
    this.onComposing = onComposing;
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
    this.onComposing([]);
  }

  private render(replaceEnd: number): void {
    const w = this.word;
    if (!w || this.mode === "kannada") return;
    const out = w.latin ? this.transliterate(w.latin, this.mode, "kannada") : "";
    this.busy = true;
    try {
      this.editor.replace(w.start, replaceEnd, out, "compose");
    } finally {
      this.busy = false;
    }
    w.rendered = out;
    if (out) this.onComposing([w.start, w.start + out.length]);
    else this.commit();
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
    this.onComposing([]);
    return true;
  }

  /** The caret left the word: the word is done. */
  selectionChanged(): void {
    if (!this.word || this.busy) return;
    const sel = this.editor.selection();
    if (!sel || sel.start !== sel.end || sel.end !== this.end()) this.commit();
  }
}
