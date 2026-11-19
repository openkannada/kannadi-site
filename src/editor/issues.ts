// Problems in the document: unknown glyphs left by a conversion, tracked
// through edits, and malformed syllables and likely typos, found again after each edit.
// Each problem is highlighted inline and listed; selecting one offers fixes.
import { ICONS } from "../icons/icons.ts";
import type { EditorSurface } from "./editor.ts";
import type { Fix, Scheme, Typo } from "./kannadi.ts";
import { fmt, nodes, num, S } from "./strings.ts";
import { type Anchor, codePoints, type Edit, shiftAnchors, shiftRanges } from "./text.ts";

export interface Problem {
  kind: "unknown" | "malformed" | "typo";
  start: number;
  end: number;
}

export interface IssuesKannadi {
  malformed: (text: string) => ArrayLike<number>;
  fixes: (text: string, start: number, end: number) => Fix[];
  typos: (text: string) => Typo[];
  transliterate: (text: string, from: Scheme, to: Scheme) => string;
}

export interface IssuesUi {
  list: HTMLElement;
  more: HTMLElement;
  popover: HTMLElement;
  onChange: (issues: Issues) => void;
  scheme: () => Scheme;
}

const LIST_LIMIT = 200;

const NAMES = S.problems.names;

export class Issues {
  unknown: Anchor[] = [];
  malformed: number[] = [];
  typos: Typo[] = [];
  /** Likely typos the writer chose to keep, followed through edits. */
  kept: Anchor[] = [];
  open: Problem | null = null;
  private timer: ReturnType<typeof setTimeout> | 0 = 0;
  private readonly editor: EditorSurface;
  private readonly kannadi: IssuesKannadi;
  private readonly ui: IssuesUi;

  constructor(editor: EditorSurface, kannadi: IssuesKannadi, ui: IssuesUi) {
    this.editor = editor;
    this.kannadi = kannadi;
    this.ui = ui;
    ui.popover.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.close(true);
      }
    });
    // A dialog left open behind the focus would be read out of place.
    document.addEventListener("focusin", (e) => {
      if (this.open && !ui.popover.contains(e.target as Node) && e.target !== editor.el) this.close(false);
    });
  }

  get total(): number {
    return this.unknown.length + this.malformed.length / 2 + this.typos.length;
  }

  /** Adds unknown glyphs at these text offsets. */
  addUnknown(offsets: number[]): void {
    const text = this.editor.text;
    for (const offset of offsets) {
      const code = text.codePointAt(offset);
      if (code !== undefined) this.unknown.push({ offset, glyph: String.fromCodePoint(code) });
    }
    this.unknown.sort((a, b) => a.offset - b.offset);
    this.check();
  }

  /** Stops marking the likely typos that start at these offsets, such as those kept in a saved draft. */
  keep(offsets: number[]): void {
    if (!offsets.length) return;
    this.flush();
    const text = this.editor.text;
    for (const t of this.typos) {
      if (offsets.includes(t.start)) this.kept.push({ offset: t.start, glyph: text.slice(t.start, t.end) });
    }
    this.check();
  }

  clear(): void {
    this.unknown = [];
    this.kept = [];
    this.check();
  }

  /** Follows an edit: moves unknown glyphs now, checks syllables shortly after. */
  edited(edit: Edit, after: string): void {
    this.unknown = shiftAnchors(this.unknown, edit, after);
    this.malformed = shiftRanges(this.malformed, edit);
    this.typos = this.typos.flatMap((t) => {
      const [start, end] = shiftRanges([t.start, t.end], edit);
      return start === undefined || end === undefined ? [] : [{ ...t, start, end }];
    });
    this.kept = shiftAnchors(this.kept, edit, after);
    this.close(false);
    clearTimeout(this.timer);
    // About 1 ms per 5,000 characters: check less often in large documents.
    this.timer = setTimeout(() => this.check(), Math.min(800, 150 + after.length / 5000));
    this.draw();
  }

  check(): void {
    clearTimeout(this.timer);
    this.timer = 0;
    const text = this.editor.text;
    this.malformed = Array.from(this.kannadi.malformed(text));
    this.typos = this.kannadi.typos(text).filter((t) => !this.kept.some((k) => k.offset === t.start));
    this.draw();
    this.list();
  }

  flush(): void {
    if (this.timer) this.check();
  }

  draw(): void {
    this.editor.highlight(
      "unknown",
      this.unknown.flatMap((u) => [u.offset, u.offset + u.glyph.length]),
    );
    this.editor.highlight("malformed", this.malformed);
    this.editor.highlight(
      "typo",
      this.typos.flatMap((t) => [t.start, t.end]),
    );
    this.ui.onChange(this);
  }

  /** All problems in text order. */
  items(): Problem[] {
    const out: Problem[] = this.unknown.map((u) => ({ kind: "unknown", start: u.offset, end: u.offset + u.glyph.length }));
    for (let i = 0; i + 1 < this.malformed.length; i += 2) {
      out.push({ kind: "malformed", start: this.malformed[i]!, end: this.malformed[i + 1]! });
    }
    for (const t of this.typos) out.push({ kind: "typo", start: t.start, end: t.end });
    return out.sort((a, b) => a.start - b.start);
  }

  /** The problem that contains or touches `offset`. */
  at(offset: number): Problem | null {
    const items = this.items();
    const exact = items.find((i) => i.start <= offset && offset <= i.end);
    if (exact) return exact;
    // A tap puts the caret at the edge of a syllable, never inside it, so a mark inside the syllable counts.
    const { start, end } = syllableAt(this.editor.text, offset);
    return items.find((i) => i.start < end && i.end > start) ?? null;
  }

  /**
   * The next problem after the range start..end, wrapping around; backward when
   * `dir` is -1. A problem exactly at the range counts as the current one, so
   * problems that touch it are reached in turn.
   */
  next(start: number, end: number, dir = 1): Problem | null {
    const items = this.items();
    if (!items.length) return null;
    if (dir > 0) return items.find((i) => i.start > start || (i.start === start && i.end > end)) ?? items[0]!;
    return [...items].reverse().find((i) => i.end < end || (i.end === end && i.start < start)) ?? items[items.length - 1]!;
  }

  list(): void {
    const text = this.editor.text;
    const items = this.items();
    const lineStarts = [0];
    for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) lineStarts.push(i + 1);
    const lineOf = (offset: number) => {
      let lo = 0;
      let hi = lineStarts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStarts[mid]! <= offset) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    };
    const nodes = items.slice(0, LIST_LIMIT).map((item) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `issue issue-${item.kind}`;
      const line = document.createElement("span");
      line.className = "issue-line";
      line.textContent = fmt(S.problems.line, { line: lineOf(item.start) });
      const what = document.createElement("span");
      what.className = "issue-what";
      what.textContent = NAMES[item.kind];
      const sample = document.createElement("span");
      sample.className = "issue-sample";
      sample.lang = "kn";
      sample.textContent = text.slice(item.start, item.end);
      button.append(line, what, sample);
      button.setAttribute("aria-label", fmt(S.problems.itemLabel, { line: lineOf(item.start), problem: NAMES[item.kind], codes: codePoints(sample.textContent) }));
      button.addEventListener("click", () => this.show(item, true));
      li.append(button);
      return li;
    });
    this.ui.list.replaceChildren(...nodes);
    this.ui.more.hidden = items.length <= LIST_LIMIT;
    this.ui.more.textContent = fmt(S.problems.more, { shown: LIST_LIMIT, total: num(items.length) });
  }

  /** Selects a problem and opens its fixes. */
  show(item: Problem, focus: boolean): void {
    this.flush();
    // The fix card sits under an open problems panel, so the panel goes first.
    const panel = this.ui.list.closest<HTMLElement>("[popover]");
    if (panel?.matches(":popover-open")) panel.hidePopover();
    const current = this.items().find((i) => i.start === item.start && i.kind === item.kind) ?? this.at(item.start);
    if (!current) return;
    this.editor.select(current.start, current.end);
    this.editor.scrollTo(current.start, current.end);
    this.popover(current, focus);
  }

  apply(start: number, end: number, replacement: string): void {
    this.close(false);
    this.editor.replace(start, end, replacement);
    this.check();
    this.editor.focus();
  }

  popover(item: Problem, focus: boolean): void {
    const text = this.editor.text;
    const bad = text.slice(item.start, item.end);
    const pop = this.ui.popover;
    const title = document.createElement("p");
    title.className = "pop-title";
    const sample = document.createElement("span");
    sample.lang = "kn";
    sample.className = `pop-sample pop-sample-${item.kind}`;
    sample.textContent = bad;
    title.append(...nodes(S.fix.title, { problem: NAMES[item.kind], sample, codes: codePoints(bad) }));
    const why = document.createElement("p");
    why.className = "pop-why";
    const typo = item.kind === "typo" ? this.typos.find((t) => t.start === item.start && t.end === item.end) : undefined;
    why.textContent = item.kind === "typo" ? (S.fix.typoWhy[typo?.rule ?? ""] ?? S.fix.why.typo) : S.fix.why[item.kind];

    const actions = document.createElement("div");
    actions.className = "pop-actions";
    const action = (label: string | Node, preview: string | null, run: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      if (preview) {
        const p = document.createElement("span");
        p.lang = "kn";
        p.className = "pop-preview";
        p.textContent = preview;
        b.append(p);
      }
      b.append(label);
      b.addEventListener("click", run);
      actions.append(b);
      return b;
    };
    if (item.kind === "malformed") {
      for (const f of this.kannadi.fixes(text, item.start, item.end)) {
        const word = wordAround(text, f.start, f.end, f.replacement);
        action(S.fix.actions[f.kind] ?? S.fix.fallback, word, () => this.apply(f.start, f.end, f.replacement));
      }
    } else if (item.kind === "typo") {
      if (typo) {
        const word = wordAround(text, typo.start, typo.end, typo.replacement);
        const letter = document.createElement("span");
        letter.lang = "kn";
        letter.textContent = typo.replacement;
        const label = document.createDocumentFragment();
        label.append(...nodes(S.fix.use, { letter }));
        action(label, word, () => this.apply(typo.start, typo.end, typo.replacement));
      }
      action(S.fix.keep, null, () => {
        this.close(true);
        this.keep([item.start]);
      });
    } else {
      action(S.fix.deleteGlyph, wordAround(text, item.start, item.end, ""), () => this.apply(item.start, item.end, ""));
      action(S.fix.keep, null, () => {
        this.unknown = this.unknown.filter((u) => u.offset !== item.start);
        this.close(true);
        this.draw();
        this.list();
      });
    }

    const form = document.createElement("form");
    form.className = "pop-replace";
    const label = document.createElement("label");
    const id = "pop-input";
    label.htmlFor = id;
    label.textContent = S.fix.replaceWith;
    const input = document.createElement("input");
    input.id = id;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = S.fix.placeholder;
    const preview = document.createElement("output");
    preview.lang = "kn";
    preview.htmlFor = id;
    const kannadaFor = (value: string) =>
      /[ಀ-೿]/.test(value) ? value : this.kannadi.transliterate(value, this.ui.scheme(), "kannada");
    input.addEventListener("input", () => {
      preview.textContent = input.value ? kannadaFor(input.value) : "";
    });
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = S.fix.replace;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value) this.apply(item.start, item.end, kannadaFor(input.value));
    });
    form.append(label, input, preview, submit);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "pop-close";
    close.setAttribute("aria-label", S.fix.close);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const cross = document.createElementNS("http://www.w3.org/2000/svg", "path");
    cross.setAttribute("d", ICONS.close.d);
    cross.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(cross);
    close.append(svg);
    close.addEventListener("click", () => this.close(true));

    pop.replaceChildren(close, title, why, actions, form);
    pop.hidden = false;
    this.open = item;
    this.place(item);
    if (focus) (actions.querySelector("button") ?? input).focus();
  }

  place(item: Problem): void {
    const pop = this.ui.popover;
    if (matchMedia("(max-width: 40rem)").matches) {
      pop.style.left = pop.style.top = "";
      // On phones the card is a bottom sheet; keep the mark visible above it.
      const mark = this.editor.rect(item.start, item.end);
      const cardTop = pop.getBoundingClientRect().top;
      if (mark.bottom > cardTop - 16) scrollBy({ top: mark.bottom - cardTop + 16, behavior: "instant" });
      return;
    }
    const r = this.editor.rect(item.start, item.end);
    const width = pop.offsetWidth;
    const left = Math.min(Math.max(8, r.left), innerWidth - width - 8);
    const below = r.bottom + 8;
    const top = below + pop.offsetHeight > innerHeight - 8 ? Math.max(8, r.top - pop.offsetHeight - 8) : below;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  close(returnFocus: boolean): void {
    if (!this.open) return;
    const item = this.open;
    this.open = null;
    this.ui.popover.hidden = true;
    if (returnFocus) {
      this.editor.focus();
      this.editor.select(item.end);
    }
  }
}

/** The word around start..end after replacing it, for previews. */
function wordAround(text: string, start: number, end: number, replacement: string): string {
  let from = start;
  while (from > 0 && !/\s/.test(text[from - 1]!) && start - from < 24) from--;
  let to = end;
  while (to < text.length && !/\s/.test(text[to]!) && to - end < 24) to++;
  return text.slice(from, start) + replacement + text.slice(end, to);
}

const graphemes = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("kn", { granularity: "grapheme" }) : null;

/** The user-perceived character that starts at `offset`, or ends there at the end of a line. */
export function syllableAt(text: string, offset: number): { start: number; end: number } {
  if (!graphemes) return { start: offset, end: offset };
  const from = Math.max(0, offset - 32);
  for (const g of graphemes.segment(text.slice(from, offset + 32))) {
    const start = from + g.index;
    const end = start + g.segment.length;
    if (start <= offset && offset < end && g.segment !== "\n") return { start, end };
  }
  return { start: offset, end: offset };
}
