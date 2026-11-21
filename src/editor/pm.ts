// The editor on ProseMirror, behind ?editor=next: plain paragraphs, with the same surface as DocEditor, so typing
// modes, suggestions, marks and files work on it unchanged. The text is the paragraphs joined by "\n"; a text offset
// maps to a document position by counting 1 for each "\n" where ProseMirror counts 2 for a paragraph boundary.
import { baseKeymap, chainCommands, joinBackward, splitBlock } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { Fragment, type Node as PmNode, Schema, Slice } from "prosemirror-model";
import { type Command, EditorState, TextSelection, type Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import type { EditListener, EditorSurface, TextRange } from "./editor.ts";
import { diff } from "./text.ts";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*", toDOM: () => ["p", 0], parseDOM: [{ tag: "p" }] },
    text: {},
  },
});

/** Typing within this long after the last keystroke undoes as 1 step, as in DocEditor. */
const GROUP_MS = 1500;

/** The document for `text`, 1 paragraph per line. */
function docOf(text: string): PmNode {
  return schema.node("doc", null, text.split("\n").map((line) => schema.node("paragraph", null, line ? schema.text(line) : undefined)));
}

/** The text of a document, its paragraphs joined by "\n". */
function textOf(doc: PmNode): string {
  return doc.textBetween(0, doc.content.size, "\n");
}

/** Document position of text offset `at`. */
function posOf(doc: PmNode, at: number): number {
  let pos = 0;
  let left = Math.max(0, at);
  for (let i = 0; i < doc.childCount; i++) {
    const p = doc.child(i);
    if (left <= p.content.size || i === doc.childCount - 1) return pos + 1 + Math.min(left, p.content.size);
    left -= p.content.size + 1;
    pos += p.nodeSize;
  }
  return 1;
}

/** Text offset of document position `pos`. */
function offsetOfPos(doc: PmNode, pos: number): number {
  let at = 0;
  let start = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const p = doc.child(i);
    const end = start + p.nodeSize;
    if (pos < end || i === doc.childCount - 1) return at + Math.max(0, Math.min(pos - start - 1, p.content.size));
    at += p.content.size + 1;
    start = end;
  }
  return at;
}

/** Runs `command` with an inputType on its transaction, so the edit is reported like the browser's own. */
function as(inputType: string, command: Command): Command {
  return (state, dispatch, view) => command(state, dispatch && ((tr) => dispatch(tr.setMeta("inputType", inputType))), view);
}

export class PmEditor implements EditorSurface {
  readonly el: HTMLElement;
  readonly view: EditorView;
  private readonly onEdit: EditListener;
  /** The inputType of the last beforeinput, for the transaction the browser's change turns into. */
  private pending = "";
  private before = "";
  /** Between compositionstart and the report of the composed word. */
  private composed = false;
  /** The pending report of a word whose composition ended. */
  private ending: ReturnType<typeof setTimeout> | undefined;
  /** Text with line breaks that the browser is inserting with spaces in their place. */
  private lines = "";

  /** Handles Backspace before ProseMirror does, as the composer does for the word being typed; true when it did. */
  backspace: () => boolean = () => false;

  constructor(el: HTMLElement, onEdit: EditListener) {
    this.el = el;
    this.onEdit = onEdit;
    const state = EditorState.create({
      schema,
      plugins: [
        history({ newGroupDelay: GROUP_MS }),
        keymap({ "Mod-z": undo, "Mod-y": redo, "Shift-Mod-z": redo }),
        keymap({
          Enter: as("insertLineBreak", splitBlock),
          "Shift-Enter": as("insertLineBreak", splitBlock),
          // The word being typed takes back a Latin letter first; ProseMirror would otherwise run its own Backspace too.
          Backspace: (state, dispatch, view) => this.backspace() || as("deleteContentBackward", chainCommands(joinBackward))(state, dispatch, view),
        }),
        keymap(baseKeymap),
      ],
    });
    this.view = new EditorView(
      { mount: el },
      {
        state,
        dispatchTransaction: (tr) => this.apply(tr),
        // Paste, and the legacy-font conversion it needs, is handled by the page; the editor only inserts the result.
        handlePaste: () => true,
        attributes: { spellcheck: "false" },
      },
    );
    el.addEventListener(
      "beforeinput",
      (e) => {
        this.pending = e.inputType;
        if (!e.data?.includes("\n")) return;
        // Firefox commits text with line breaks as a composition it will not cancel, and puts spaces for the breaks.
        if (!e.cancelable) {
          this.lines = e.data.replace(/\r\n?/g, "\n");
          return;
        }
        // Text with line breaks, as from dictation, goes in as lines, with the caret after it.
        if (e.inputType !== "insertText") return;
        e.preventDefault();
        const sel = this.selection();
        if (sel) this.replace(sel.start, sel.end, e.data.replace(/\r\n?/g, "\n"), "insertText");
      },
      true,
    );
    // A composition counts from its start, before ProseMirror sees it, until its word is reported. ProseMirror applies
    // the last change after compositionend, so the word is reported once it has.
    const ended = () => {
      clearTimeout(this.ending);
      this.ending = undefined;
      this.composed = false;
      this.report("insertCompositionText");
    };
    // A keyboard can start the next word before the last one is reported; that one is reported first.
    el.addEventListener(
      "compositionstart",
      () => {
        if (this.ending !== undefined) ended();
        this.composed = true;
      },
      true,
    );
    el.addEventListener("compositionend", () => (this.ending = setTimeout(ended)), true);
    // A composition the keyboard abandons, with no compositionend, ends when the editor loses focus.
    el.addEventListener("focusout", () => {
      if (!this.composed) return;
      this.composed = false;
      this.report("insertCompositionText");
    });
  }

  /** Reports a change to the text since the last report, as 1 edit. */
  private report(inputType: string): void {
    if (this.composing) return;
    const after = textOf(this.view.state.doc);
    if (after === this.before) return;
    const sel = this.selection();
    const edit = diff(this.before, after, sel && sel.start === sel.end ? sel.start : -1);
    this.before = after;
    const lines = this.lines;
    this.lines = "";
    if (lines && after.slice(edit.start, edit.newEnd) === lines.replace(/\n/g, " ")) {
      this.replace(edit.start, edit.newEnd, lines, inputType);
      return;
    }
    this.onEdit(edit, after, inputType);
  }

  private apply(tr: Transaction): void {
    const state = this.view.state.apply(tr);
    this.view.updateState(state);
    if (!tr.docChanged) return;
    const inputType = (tr.getMeta("inputType") as string | undefined) ?? (this.composing ? "insertCompositionText" : this.pending || "insertText");
    this.pending = "";
    // A keyboard composing a word is left alone until it ends, as in DocEditor.
    this.report(inputType);
  }

  focus(): void {
    this.view.focus();
  }

  get text(): string {
    return textOf(this.view.state.doc);
  }

  get composing(): boolean {
    return this.composed || this.view.composing;
  }

  /** The selection as text offsets, or null when it is outside the editor. */
  selection(): TextRange | null {
    const dom = document.getSelection();
    if (!dom?.rangeCount || !this.el.contains(dom.anchorNode)) return null;
    const { from, to } = this.view.state.selection;
    const doc = this.view.state.doc;
    return { start: offsetOfPos(doc, from), end: offsetOfPos(doc, to) };
  }

  select(start: number, end = start): void {
    const doc = this.view.state.doc;
    this.view.dispatch(this.view.state.tr.setSelection(TextSelection.create(doc, posOf(doc, start), posOf(doc, end))));
  }

  offsetOf(node: Node, offset: number): number {
    return offsetOfPos(this.view.state.doc, this.view.posAtDOM(node, offset));
  }

  /** Replaces start..end with `text` as 1 undoable step, and reports the edit. */
  replace(start: number, end: number, text: string, inputType = "insertReplacementText"): void {
    if (!this.view.hasFocus()) this.focus();
    const doc = this.view.state.doc;
    const lines = text.split("\n");
    const content = Fragment.from(lines.map((line) => schema.node("paragraph", null, line ? schema.text(line) : undefined)));
    const tr = this.view.state.tr.replace(posOf(doc, start), posOf(doc, end), new Slice(content, 1, 1));
    tr.setSelection(TextSelection.create(tr.doc, posOf(tr.doc, start + text.length)));
    this.view.dispatch(tr.setMeta("inputType", inputType).scrollIntoView());
  }

  /** Replaces the whole text as 1 undoable step. */
  setText(text: string): void {
    this.replace(0, this.text.length, text);
    this.select(0);
  }

  /** Shows saved text, without an undo step. */
  load(text: string): void {
    const state = this.view.state;
    const tr = state.tr.replaceWith(0, state.doc.content.size, docOf(text).content).setMeta("addToHistory", false).setMeta("inputType", "restore");
    this.view.dispatch(tr);
  }

  /** A DOM range over text offsets start..end. */
  private range(start: number, end: number): Range {
    const doc = this.view.state.doc;
    const a = this.view.domAtPos(posOf(doc, start));
    const b = this.view.domAtPos(posOf(doc, end));
    const range = document.createRange();
    range.setStart(a.node, a.offset);
    range.setEnd(b.node, b.offset);
    return range;
  }

  /** Draws the named highlight over [start, end, start, end, ...]. */
  highlight(name: string, ranges: ArrayLike<number>): void {
    if (!globalThis.CSS?.highlights) return;
    const h = new Highlight();
    for (let i = 0; i + 1 < ranges.length; i += 2) h.add(this.range(ranges[i]!, ranges[i + 1]!));
    CSS.highlights.set(name, h);
  }

  /** Screen rectangle of a text range, for placing a popover. */
  rect(start: number, end: number): DOMRect {
    const rects = this.range(start, end).getClientRects();
    if (rects[0]) return rects[0];
    const c = this.view.coordsAtPos(posOf(this.view.state.doc, start));
    return new DOMRect(c.left, c.top, 0, c.bottom - c.top);
  }

  /** Screen box of the caret's line, or null when the caret is outside the editor. */
  caretRect(): DOMRect | null {
    const dom = document.getSelection();
    if (!dom?.rangeCount || !dom.focusNode || !this.el.contains(dom.focusNode)) return null;
    // The browser's caret is what shows; ProseMirror's own selection can trail it just after a click.
    const c = this.view.coordsAtPos(this.view.posAtDOM(dom.focusNode, dom.focusOffset));
    return new DOMRect(c.left, c.top, 0, c.bottom - c.top);
  }

  /** Scrolls a range into the middle third at once, so a popover can be placed next to it. */
  scrollTo(start: number, end: number): void {
    const r = this.rect(start, end);
    if (r.top < 160 || r.bottom > innerHeight - 80) scrollBy({ top: r.top - innerHeight / 3, behavior: "instant" });
  }
}
