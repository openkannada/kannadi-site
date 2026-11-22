// The editor on ProseMirror, behind ?editor=next, with the same surface as DocEditor, so typing modes, suggestions,
// marks and files work on it unchanged, and formats from rich.ts. Its text is every textblock (paragraph, heading,
// list item line) joined by "\n"; a text offset maps to a document position through an index of the textblocks.
import { baseKeymap, chainCommands, joinBackward, splitBlock } from "prosemirror-commands";
import { closeHistory, history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { Fragment, type Node as PmNode, Slice } from "prosemirror-model";
import { type Command, EditorState, TextSelection, type Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import type { EditListener, EditorSurface, TextRange } from "./editor.ts";
import { FORMAT_KEYS, FORMATS, type Format, fromHtml, isActive, LIST_KEYS, schema, setLink, shortcuts, toHtml } from "./rich.ts";
import { diff } from "./text.ts";

/** Typing within this long after the last keystroke undoes as 1 step, as in DocEditor. */
const GROUP_MS = 1500;

/** The document for `text`, 1 paragraph per line. */
function docOf(text: string): PmNode {
  return schema.node("doc", null, text.split("\n").map((line) => schema.node("paragraph", null, line ? schema.text(line) : undefined)));
}

interface Index {
  text: string;
  /** For each textblock, the text offset and the document position where its text starts, and its length. */
  offsets: number[];
  positions: number[];
  sizes: number[];
}

// Built once per document, since every edit makes a new one; the text is read several times per keystroke.
const indexes = new WeakMap<PmNode, Index>();

function indexOf(doc: PmNode): Index {
  let index = indexes.get(doc);
  if (index) return index;
  const offsets: number[] = [];
  const positions: number[] = [];
  const sizes: number[] = [];
  const lines: string[] = [];
  let at = 0;
  doc.descendants((n, pos) => {
    if (!n.isTextblock) return true;
    offsets.push(at);
    positions.push(pos + 1);
    sizes.push(n.content.size);
    lines.push(n.textContent);
    at += n.content.size + 1;
    return false;
  });
  index = { text: lines.join("\n"), offsets, positions, sizes };
  indexes.set(doc, index);
  return index;
}

/** The text of a document, its paragraphs joined by "\n". */
function textOf(doc: PmNode): string {
  return indexOf(doc).text;
}

/** The last index in a sorted list whose value is at most `value`. */
function floor(list: number[], value: number): number {
  let lo = 0;
  let hi = list.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (list[mid]! <= value) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Document position of text offset `at`. */
function posOf(doc: PmNode, at: number): number {
  const { offsets, positions, sizes } = indexOf(doc);
  const i = floor(offsets, Math.max(0, at));
  return positions[i]! + Math.min(Math.max(0, at) - offsets[i]!, sizes[i]!);
}

/** Text offset of document position `pos`. */
function offsetOfPos(doc: PmNode, pos: number): number {
  const { offsets, positions, sizes } = indexOf(doc);
  const i = floor(positions, pos);
  return offsets[i]! + Math.max(0, Math.min(pos - positions[i]!, sizes[i]!));
}

/** The base keymap, its deletions reported as the browser reports its own. */
function withInputTypes(keys: Record<string, Command>): Record<string, Command> {
  return Object.fromEntries(
    Object.entries(keys).map(([key, command]) => {
      const back = /Backspace|Ctrl-h/.test(key);
      const forward = /Delete|Ctrl-d|Alt-d/.test(key);
      return [key, back ? as("deleteContentBackward", command) : forward ? as("deleteContentForward", command) : command];
    }),
  );
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
        keymap({ "Mod-z": as("historyUndo", undo), "Mod-y": as("historyRedo", redo), "Shift-Mod-z": as("historyRedo", redo) }),
        shortcuts(),
        keymap(FORMAT_KEYS),
        keymap({
          Enter: as("insertLineBreak", chainCommands(LIST_KEYS["Enter"]!, splitBlock)),
          "Shift-Enter": as("insertLineBreak", splitBlock),
          // The word being typed takes back a Latin letter first; ProseMirror would otherwise run its own Backspace too.
          Backspace: (state, dispatch, view) =>
            this.backspace() || as("deleteContentBackward", chainCommands(LIST_KEYS["Backspace"]!, joinBackward))(state, dispatch, view),
        }),
        keymap(withInputTypes(baseKeymap)),
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
    // A key the keymap handles has no beforeinput; an earlier one must not lend it its input type.
    el.addEventListener("keydown", () => (this.pending = ""), true);
    el.addEventListener(
      "beforeinput",
      (e) => {
        this.pending = e.inputType;
        // The word being typed takes back a Latin letter. ProseMirror, on Android, would run a Backspace of its own
        // after a Backspace it did not see change the text, so it does not see this one at all.
        if (e.inputType === "deleteContentBackward" && e.cancelable && this.backspace()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
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
    const lines = this.lines;
    this.lines = "";
    // The lines go in place of the spaces, and that change is reported with the insertion, as 1 edit.
    if (lines && after.slice(edit.start, edit.newEnd) === lines.replace(/\n/g, " ")) {
      this.replace(edit.start, edit.newEnd, lines, inputType);
      return;
    }
    this.before = after;
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

  /** Applies a format to the selection. */
  format(format: Format): boolean {
    this.focus();
    // A format is its own step to undo, apart from the typing around it.
    return FORMATS[format](this.view.state, (tr) => this.view.dispatch(closeHistory(tr).setMeta("inputType", "format")), this.view);
  }

  /** Whether a format applies at the selection. */
  active(format: Format): boolean {
    return isActive(this.view.state, format);
  }

  /** Links the selection to `href`, or removes the link when it is empty. */
  link(href: string): boolean {
    this.focus();
    return setLink(href)(this.view.state, (tr) => this.view.dispatch(closeHistory(tr).setMeta("inputType", "format")));
  }

  /** The selection's link, if it has 1. */
  linkAt(): string {
    const { $from } = this.view.state.selection;
    return ($from.marks().find((m) => m.type === schema.marks["link"])?.attrs["href"] as string | undefined) ?? "";
  }

  /** The document as JSON, with its formats, for keeping on this device. */
  toJSON(): unknown {
    return this.view.state.doc.toJSON();
  }

  /** Shows a document kept as JSON, without an undo step; false when it does not fit the schema. */
  loadJSON(json: unknown): boolean {
    let doc: PmNode;
    try {
      doc = schema.nodeFromJSON(json);
      doc.check();
    } catch {
      return false;
    }
    this.view.dispatch(this.view.state.tr.replaceWith(0, this.view.state.doc.content.size, doc.content).setMeta("addToHistory", false).setMeta("inputType", "restore"));
    return true;
  }

  /** The document as HTML, with its formats. */
  html(): string {
    return toHtml(this.view.state.doc);
  }

  /** Puts HTML in place of the selection, keeping the formats the editor can hold, as 1 undoable step. */
  insertHtml(html: string): void {
    if (!this.view.hasFocus()) this.focus();
    const doc = fromHtml(html);
    const { from, to } = this.view.state.selection;
    this.view.dispatch(this.view.state.tr.replaceRange(from, to, Slice.maxOpen(doc.content)).setMeta("inputType", "insertFromPaste").scrollIntoView());
  }

  /** Shows an HTML document with its formats, as 1 undoable step. */
  setHtml(html: string): void {
    const doc = fromHtml(html);
    const state = this.view.state;
    this.view.dispatch(state.tr.replaceWith(0, state.doc.content.size, doc.content).setMeta("inputType", "insertReplacementText"));
    this.select(0);
  }

  /** Scrolls a range into the middle third at once, so a popover can be placed next to it. */
  scrollTo(start: number, end: number): void {
    const r = this.rect(start, end);
    if (r.top < 160 || r.bottom > innerHeight - 80) scrollBy({ top: r.top - innerHeight / 3, behavior: "instant" });
  }
}
