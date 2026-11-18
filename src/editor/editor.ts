// A plain-text editor on a contenteditable element. The element holds 1 text
// node, so a text offset is a DOM offset. Typing is left to the browser; every
// other edit changes the text node directly, because Chrome's insertText drops
// line breaks in plaintext-only elements. The editor keeps its own undo
// history for both kinds, since the browser's history cannot see direct edits.
// Highlights use the CSS Custom Highlight API, which never changes the DOM.
import { diff, type Edit } from "./text.ts";

export type EditListener = (edit: Edit, after: string, inputType: string) => void;

interface Step {
  start: number;
  removed: string;
  inserted: string;
  typing: boolean;
  time: number;
}

export interface TextRange {
  start: number;
  end: number;
}

const HISTORY = 200;
const TYPING = new Set([
  "insertText",
  "insertCompositionText",
  "deleteContentBackward",
  "deleteContentForward",
  "compose",
]);

export class DocEditor {
  readonly el: HTMLElement;
  private readonly onEdit: EditListener;
  private before: string;
  /** Whether the element ends with the extra "\n" that gives an empty last line its place. */
  private tail = false;
  /** Whether a keyboard is composing; some send input events mid-composition without saying so. */
  composing = false;
  undoStack: Step[] = [];
  private redoStack: Step[] = [];

  constructor(el: HTMLElement, onEdit: EditListener) {
    this.el = el;
    this.onEdit = onEdit;
    el.contentEditable = "plaintext-only";
    if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
    this.before = this.text;

    el.addEventListener("beforeinput", (e) => this.beforeInput(e));
    el.addEventListener("input", (e) => {
      const input = e as InputEvent;
      if (input.isComposing) return;
      // Plain input means the composition is over, even when no compositionend came.
      if (this.composing && input.inputType !== "insertCompositionText") this.composing = false;
      if (!this.composing) this.sync(input.inputType);
    });
    el.addEventListener("compositionstart", () => {
      this.composing = true;
    });
    const endComposition = () => {
      if (!this.composing) return;
      this.composing = false;
      this.sync("insertCompositionText");
    };
    el.addEventListener("compositionend", () => {
      this.composing = true;
      endComposition();
    });
    el.addEventListener("focusout", endComposition);
    el.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.altKey || e.isComposing) return;
      const key = e.key.toLowerCase();
      if (key === "z" || key === "y") {
        e.preventDefault();
        if (key === "y" || e.shiftKey) this.redo();
        else this.undo();
      }
    });
  }

  beforeInput(e: InputEvent): void {
    if (e.isComposing) return;
    switch (e.inputType) {
      case "historyUndo":
        e.preventDefault();
        this.undo();
        break;
      case "historyRedo":
        e.preventDefault();
        this.redo();
        break;
      case "insertParagraph":
      case "insertLineBreak": {
        e.preventDefault();
        const sel = this.selection();
        if (sel) this.replace(sel.start, sel.end, "\n", "insertLineBreak");
        break;
      }
      case "insertFromDrop": {
        const text = e.dataTransfer?.getData("text/plain");
        const target = e.getTargetRanges()[0];
        if (!target) break;
        if (!text) break;
        e.preventDefault();
        const at = Math.min(this.offsetOf(target.startContainer, target.startOffset), this.text.length);
        this.replace(at, at, text, "insertFromDrop");
        break;
      }
    }
  }

  get text(): string {
    const dom = this.el.textContent ?? "";
    return this.tail && dom.endsWith("\n") ? dom.slice(0, -1) : dom;
  }

  /** While the text ends with "\n", 1 more "\n" follows in the element only, to give the empty last line a caret. */
  private keepTail(text: string): void {
    const want = text.endsWith("\n");
    const dom = this.el.textContent ?? "";
    if (want && dom === text) this.node().appendData("\n");
    else if (!want && dom.length > text.length) this.node().deleteData(text.length, dom.length - text.length);
    this.tail = want;
  }

  node(): Text {
    let node = this.el.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE || this.el.childNodes.length > 1) {
      this.flatten();
      node = this.el.firstChild;
    }
    if (!node) node = this.el.appendChild(document.createTextNode(""));
    return node as Text;
  }

  /** Reads the DOM after a change, records it for undo and reports it. */
  sync(inputType = "", record = true): void {
    this.flatten();
    const after = this.text;
    this.keepTail(after);
    if (after === this.before) return;
    const sel = this.selection();
    const edit = diff(this.before, after, sel && sel.start === sel.end ? sel.start : -1);
    if (record) this.record(edit, this.before, after, inputType);
    this.before = after;
    this.onEdit(edit, after, inputType);
  }

  record(edit: Edit, before: string, after: string, inputType: string): void {
    const entry: Step = {
      start: edit.start,
      removed: before.slice(edit.start, edit.oldEnd),
      inserted: after.slice(edit.start, edit.newEnd),
      typing: TYPING.has(inputType),
      time: Date.now(),
    };
    this.redoStack = [];
    const last = this.undoStack[this.undoStack.length - 1];
    const touches =
      last && entry.start <= last.start + last.inserted.length && entry.start + entry.removed.length >= last.start;
    const breaksWord = /\s/.test(entry.inserted) && !/\s/.test(last?.inserted ?? " ");
    if (last && entry.typing && last.typing && touches && !breaksWord && entry.time - last.time < 1500) {
      // Merge into 1 step covering both edits, in the coordinates of the text before `last`.
      const lo = Math.min(last.start, entry.start);
      const hiMid = Math.max(last.start + last.inserted.length, entry.start + entry.removed.length);
      last.removed =
        before.slice(lo, last.start) + last.removed + before.slice(last.start + last.inserted.length, hiMid);
      last.inserted = after.slice(lo, hiMid - entry.removed.length + entry.inserted.length);
      last.start = lo;
      last.time = entry.time;
      return;
    }
    this.undoStack.push(entry);
    if (this.undoStack.length > HISTORY) this.undoStack.shift();
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.splice(entry.start, entry.start + entry.inserted.length, entry.removed);
    this.redoStack.push(entry);
    this.sync("historyUndo", false);
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.splice(entry.start, entry.start + entry.removed.length, entry.inserted);
    this.undoStack.push(entry);
    this.sync("historyRedo", false);
  }

  /** Changes the text node and puts the caret after the new text. */
  splice(start: number, end: number, text: string): void {
    const node = this.node();
    node.replaceData(start, end - start, text);
    if (document.activeElement === this.el) this.select(start + text.length);
  }

  /** Replaces any element the browser inserted with plain text. */
  flatten(): void {
    const nodes = this.el.childNodes;
    if (nodes.length === 1 && nodes[0]!.nodeType === Node.TEXT_NODE) return;
    if (nodes.length === 0) return;
    const sel = this.selection();
    let text = "";
    const walk = (node: Node, first: boolean) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) text += (child as Text).data;
        else if (child.nodeName === "BR") text += "\n";
        else {
          if (text && !text.endsWith("\n") && !first) text += "\n";
          walk(child, false);
        }
      }
    };
    walk(this.el, true);
    this.el.textContent = text;
    if (sel) this.select(Math.min(sel.start, text.length), Math.min(sel.end, text.length));
  }

  offsetOf(container: Node, offset: number): number {
    if (container === this.el) {
      let at = 0;
      for (let i = 0; i < offset && i < container.childNodes.length; i++) at += container.childNodes[i]!.textContent?.length ?? 0;
      return at;
    }
    let at = 0;
    for (const node of this.el.childNodes) {
      if (node === container) return at + offset;
      if (node.contains(container)) return at;
      at += node.textContent?.length ?? 0;
    }
    return at;
  }

  /** The selection as text offsets, or null when it is outside the editor. */
  selection(): TextRange | null {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!this.el.contains(range.startContainer) || !this.el.contains(range.endContainer)) return null;
    const length = this.text.length;
    const a = Math.min(this.offsetOf(range.startContainer, range.startOffset), length);
    const b = Math.min(this.offsetOf(range.endContainer, range.endOffset), length);
    return { start: Math.min(a, b), end: Math.max(a, b) };
  }

  range(start: number, end: number): Range {
    const node = this.node();
    const range = document.createRange();
    range.setStart(node, Math.min(start, node.length));
    range.setEnd(node, Math.min(end, node.length));
    return range;
  }

  select(start: number, end = start): void {
    const sel = document.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(this.range(start, end));
  }

  /** Replaces start..end with `text` as 1 undoable step, and reports the edit. */
  replace(start: number, end: number, text: string, inputType = "insertReplacementText"): void {
    if (document.activeElement !== this.el) this.el.focus({ preventScroll: true });
    this.splice(start, end, text);
    this.sync(inputType);
  }

  /** Replaces the whole text as 1 undoable step. */
  setText(text: string): void {
    this.replace(0, this.text.length, text);
    this.select(0);
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
    return rects[0] ?? this.el.getBoundingClientRect();
  }

  /** Scrolls a range into the middle third at once, so a popover can be placed next to it. */
  scrollTo(start: number, end: number): void {
    const r = this.rect(start, end);
    if (r.top < 160 || r.bottom > innerHeight - 80) scrollBy({ top: r.top - innerHeight / 3, behavior: "instant" });
  }
}
