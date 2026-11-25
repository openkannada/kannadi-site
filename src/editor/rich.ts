// What a document can hold on the ProseMirror editor: headings, paragraphs, lists, quotes and rules, with bold, italic,
// underline and links; the commands, keys and typed shortcuts that make them; and HTML in and out of them.
import { chainCommands, lift, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { InputRule, inputRules, textblockTypeInputRule, undoInputRule, wrappingInputRule } from "prosemirror-inputrules";
import { DOMParser, DOMSerializer, type MarkType, type Node as PmNode, type NodeType, Schema } from "prosemirror-model";
import { addListNodes, liftListItem, sinkListItem, splitListItem, wrapInList } from "prosemirror-schema-list";
import type { Command, EditorState, Plugin } from "prosemirror-state";

import type { RichLine } from "./docx.ts";
import { parseHtml, STYLE } from "./html.ts";
import type { LineBlock, RunFormat, Span } from "./text.ts";

/** A link goes only to the web or to an email address. */
export function safeHref(href: string | null | undefined): string | null {
  const value = href?.trim();
  return value && /^(https?:|mailto:)/i.test(value) ? value : null;
}

/** Whether a renamed style attribute sets a property to a value matching `value`. */
const styled = (el: HTMLElement, property: string, value: RegExp) => {
  const style = el.getAttribute(STYLE) ?? "";
  const m = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i"));
  return !!m && value.test(m[1]!);
};
const BOLD = /bold|[6-9]00/i;

const base = new Schema({
  nodes: {
    doc: { content: "block+" },
    // Preformatted text reads as paragraphs that keep their spaces.
    paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0], parseDOM: [{ tag: "p" }, { tag: "pre", preserveWhitespace: true }] },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
      defining: true,
      toDOM: (n) => [`h${n.attrs["level"] as number}`, 0],
      parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}`, attrs: { level: Math.min(level, 3) } })),
    },
    blockquote: { group: "block", content: "block+", defining: true, toDOM: () => ["blockquote", 0], parseDOM: [{ tag: "blockquote" }] },
    horizontal_rule: { group: "block", toDOM: () => ["hr"], parseDOM: [{ tag: "hr" }] },
    text: { group: "inline" },
  },
  marks: {
    link: {
      attrs: { href: {} },
      inclusive: false,
      toDOM: (m) => ["a", { href: m.attrs["href"] as string, rel: "noopener noreferrer" }, 0],
      parseDOM: [{ tag: "a[href]", getAttrs: (el) => (safeHref((el as HTMLElement).getAttribute("href")) ? { href: safeHref((el as HTMLElement).getAttribute("href")) } : false) }],
    },
    strong: {
      toDOM: () => ["strong", 0],
      parseDOM: [
        { tag: "strong" },
        // Google Docs wraps a whole copy in <b style="font-weight:normal">.
        { tag: "b", getAttrs: (el) => (styled(el as HTMLElement, "font-weight", /normal|[1-5]00/) ? false : null) },
        { tag: "span", getAttrs: (el) => (styled(el as HTMLElement, "font-weight", BOLD) ? null : false) },
      ],
    },
    em: {
      toDOM: () => ["em", 0],
      parseDOM: [{ tag: "em" }, { tag: "i" }, { tag: "span", getAttrs: (el) => (styled(el as HTMLElement, "font-style", /italic/) ? null : false) }],
    },
    underline: {
      toDOM: () => ["u", 0],
      parseDOM: [{ tag: "u" }, { tag: "span", getAttrs: (el) => (styled(el as HTMLElement, "text-decoration(?:-line)?", /underline/) ? null : false) }],
    },
  },
});

export const schema = new Schema({ nodes: addListNodes(base.spec.nodes, "paragraph block*", "block"), marks: base.spec.marks });

const node = (name: string): NodeType => schema.nodes[name]!;
const mark = (name: string): MarkType => schema.marks[name]!;

/** The formats the menu and the keys apply. */
export type Format = "h1" | "h2" | "h3" | "paragraph" | "bold" | "italic" | "underline" | "bullet" | "ordered" | "quote";

export const FORMATS: Record<Format, Command> = {
  h1: setBlockType(node("heading"), { level: 1 }),
  h2: setBlockType(node("heading"), { level: 2 }),
  h3: setBlockType(node("heading"), { level: 3 }),
  paragraph: chainCommands(liftListItem(node("list_item")), setBlockType(node("paragraph"))),
  bold: toggleMark(mark("strong")),
  italic: toggleMark(mark("em")),
  underline: toggleMark(mark("underline")),
  bullet: chainCommands(liftListItem(node("list_item")), wrapInList(node("bullet_list"))),
  ordered: chainCommands(liftListItem(node("list_item")), wrapInList(node("ordered_list"))),
  quote: chainCommands(lift, wrapIn(node("blockquote"))),
};

/** Sets or removes a link on the selection; an empty or unsafe address removes it. */
export function setLink(href: string): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection;
    if (empty) return false;
    const safe = safeHref(href);
    if (dispatch) {
      const tr = state.tr.removeMark(from, to, mark("link"));
      dispatch(safe ? tr.addMark(from, to, mark("link").create({ href: safe })) : tr);
    }
    return true;
  };
}

/** Whether a format applies at the selection, for the menu's pressed state. */
export function isActive(state: EditorState, format: Format): boolean {
  const { $from, from, to, empty } = state.selection;
  const marks: Partial<Record<Format, MarkType>> = { bold: mark("strong"), italic: mark("em"), underline: mark("underline") };
  const m = marks[format];
  if (m) return empty ? !!m.isInSet(state.storedMarks ?? $from.marks()) : state.doc.rangeHasMark(from, to, m);
  const block = $from.parent;
  if (format === "h1" || format === "h2" || format === "h3") return block.type === node("heading") && block.attrs["level"] === Number(format[1]);
  if (format === "paragraph") return block.type === node("paragraph");
  const ancestor = (type: NodeType) => {
    for (let d = $from.depth; d > 0; d--) if ($from.node(d).type === type) return true;
    return false;
  };
  if (format === "bullet") return ancestor(node("bullet_list"));
  if (format === "ordered") return ancestor(node("ordered_list"));
  return ancestor(node("blockquote"));
}

/** The keys for the formats, as in common word processors; Tab stays with the suggestions. */
export const FORMAT_KEYS: Record<string, Command> = {
  "Mod-b": FORMATS.bold,
  "Mod-i": FORMATS.italic,
  "Mod-u": FORMATS.underline,
  "Mod-Alt-1": FORMATS.h1,
  "Mod-Alt-2": FORMATS.h2,
  "Mod-Alt-3": FORMATS.h3,
  "Mod-Alt-0": FORMATS.paragraph,
  "Mod-Shift-8": FORMATS.bullet,
  "Mod-Shift-7": FORMATS.ordered,
  "Mod-Shift-9": FORMATS.quote,
  "Mod-]": sinkListItem(node("list_item")),
  "Mod-[": liftListItem(node("list_item")),
};

/** Enter in a list starts the next item, and in an empty item leaves the list; Backspace right after a typed shortcut takes it back. */
export const LIST_KEYS: Record<string, Command> = {
  Enter: chainCommands(splitListItem(node("list_item")), (state, dispatch) =>
    state.selection.empty && state.selection.$from.parent.content.size === 0 ? liftListItem(node("list_item"))(state, dispatch) : false,
  ),
  Backspace: undoInputRule,
};

/** Markdown-like shortcuts typed at the start of a line: #, ##, ###, - or *, 1. and >. */
export function shortcuts(): Plugin {
  const rules: InputRule[] = [
    textblockTypeInputRule(/^(#{1,3})\s$/, node("heading"), (m) => ({ level: m[1]!.length })),
    wrappingInputRule(/^\s*([-*])\s$/, node("bullet_list")),
    wrappingInputRule(/^(\d+)\.\s$/, node("ordered_list"), (m) => ({ order: Number(m[1]) }), (m, n) => n.childCount + (n.attrs["order"] as number) === Number(m[1])),
    wrappingInputRule(/^\s*>\s$/, node("blockquote")),
  ];
  return inputRules({ rules });
}

/** The document's HTML body. */
export function toHtml(doc: PmNode): string {
  const box = document.createElement("div");
  box.append(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  return box.innerHTML;
}

const BLOCKS = "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div, td, th, dd, dt";

/** Each <br> ends a line: its block splits there, as the editor holds 1 line per textblock. */
function splitAtBreaks(body: HTMLElement): void {
  // Lines at the top level go in a block of their own first.
  const top = body.ownerDocument.createElement("div");
  top.append(...body.childNodes);
  body.append(top);
  for (let br = body.querySelector("br"); br; br = body.querySelector("br")) {
    const block = br.parentElement!.closest(BLOCKS) ?? top;
    const rest = body.ownerDocument.createRange();
    rest.setStartAfter(br);
    rest.setEnd(block, block.childNodes.length);
    // A break with nothing after it in its block ends that line, as a browser shows it, and starts no new one.
    const after = rest.cloneContents();
    if (!after.querySelector("br") && !(block.closest("pre") ? after.textContent : after.textContent?.trim())) {
      br.remove();
      continue;
    }
    const next = block.cloneNode(false) as Element;
    next.append(rest.extractContents());
    br.remove();
    block.after(next);
  }
}

/** A document from HTML, keeping what the schema can hold. HTML this editor saved keeps every space and tab. */
export function fromHtml(html: string): PmNode {
  const ours = /<meta name="generator" content="kannadi">/.test(html);
  const body = parseHtml(html).body;
  // The renamed <style>, which the parser moves into the body, and anything else that is not text to read.
  for (const el of body.querySelectorAll(`textarea[${STYLE}], script, noscript, template, title`)) el.remove();
  // Preformatted text keeps its lines and spaces.
  for (const pre of body.querySelectorAll("pre")) {
    const walker = body.ownerDocument.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);
    for (const t of texts) {
      const parts = t.data.replace(/\r\n?/g, "\n").split("\n");
      if (parts.length > 1) t.replaceWith(...parts.flatMap((p, i) => (i ? [body.ownerDocument.createElement("br"), p] : [p])));
    }
  }
  splitAtBreaks(body);
  return DOMParser.fromSchema(schema).parse(body, { preserveWhitespace: ours });
}

/** ProseMirror JSON with every link that is not to the web or to an email address taken out, as kept documents are. */
export function safeJson(json: unknown): unknown {
  if (Array.isArray(json)) return json.map(safeJson);
  if (!json || typeof json !== "object") return json;
  const node = { ...(json as Record<string, unknown>) };
  if (Array.isArray(node["marks"])) {
    node["marks"] = (node["marks"] as { type?: string; attrs?: { href?: string } }[]).filter((m) => m.type !== "link" || safeHref(m.attrs?.href));
  }
  if (Array.isArray(node["content"])) node["content"] = (node["content"] as unknown[]).map(safeJson);
  return node;
}

interface Json {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Json[];
  marks?: Json[];
  text?: string;
}

/** The marks of a run's format, as ProseMirror JSON; a link only to the web or to an email address. */
function marksOf(format: RunFormat): Json[] {
  const marks: Json[] = [];
  const href = safeHref(format.href);
  if (href) marks.push({ type: "link", attrs: { href } });
  if (format.bold) marks.push({ type: "strong" });
  if (format.italic) marks.push({ type: "em" });
  if (format.underline) marks.push({ type: "underline" });
  return marks;
}

/** A line's text, from `start` in the whole text, as text nodes carrying the formats of the spans over them. */
function inlineOf(line: string, start: number, spans: Span[]): Json[] {
  const cuts = new Set([0, line.length]);
  for (const s of spans) {
    if (s.end <= start || s.start >= start + line.length) continue;
    cuts.add(Math.max(0, s.start - start));
    cuts.add(Math.min(line.length, s.end - start));
  }
  const at = [...cuts].sort((a, b) => a - b);
  const nodes: Json[] = [];
  for (let i = 0; i + 1 < at.length; i++) {
    const [a, b] = [at[i]!, at[i + 1]!];
    if (a === b) continue;
    const over = spans.filter((s) => s.start <= start + a && s.end >= start + b);
    const marks = over.flatMap((s) => marksOf(s.format));
    const unique = marks.filter((m, j) => marks.findIndex((n) => n.type === m.type) === j);
    nodes.push({ type: "text", text: line.slice(a, b), ...(unique.length ? { marks: unique } : {}) });
  }
  return nodes;
}

/**
 * A document from text with the block of each line and formatted ranges, as a Word file reads: consecutive list
 * lines make nested lists by level, and consecutive quote lines 1 quote. The text stays exactly as given, line for
 * line, so offsets into it, such as marks for unknown glyphs, keep their place.
 */
export function docFromLines(text: string, lines: LineBlock[], spans: Span[]): PmNode {
  const out: Json[] = [];
  let lists: Json[] = [];
  let quote: Json | null = null;
  let at = 0;
  for (const [i, line] of text.split("\n").entries()) {
    const info = lines[i] ?? { block: "p" };
    const content = inlineOf(line, at, spans);
    at += line.length + 1;
    const heading = info.block === "h1" || info.block === "h2" || info.block === "h3";
    const paragraph: Json = { type: "paragraph", content };
    if (info.list) {
      quote = null;
      // A level cannot open below 1 that is not there.
      const level = Math.min(info.list.level, lists.length);
      const type = info.list.ordered ? "ordered_list" : "bullet_list";
      lists.length = Math.min(lists.length, level + 1);
      if (lists.length === level + 1 && lists[level]!.type !== type) lists.length = level;
      if (lists.length === level) {
        const list: Json = { type, content: [] };
        if (level === 0) out.push(list);
        else lists[level - 1]!.content!.at(-1)!.content!.push(list);
        lists.push(list);
      }
      // A list item starts with a paragraph; a heading in a list keeps its text and formats.
      lists[level]!.content!.push({ type: "list_item", content: [paragraph] });
      continue;
    }
    lists = [];
    if (info.block === "quote") {
      if (!quote) out.push((quote = { type: "blockquote", content: [] }));
      quote.content!.push(paragraph);
      continue;
    }
    quote = null;
    out.push(heading ? { type: "heading", attrs: { level: Number(info.block[1]) }, content } : paragraph);
  }
  return schema.nodeFromJSON({ type: "doc", content: out.length ? out : [{ type: "paragraph" }] });
}

/** The document as lines with their blocks and formatted runs, for writing a Word file. */
export function linesOf(doc: PmNode): RichLine[] {
  const lines: RichLine[] = [];
  const runsOf = (block: PmNode) => {
    const runs: RichLine["runs"] = [];
    block.forEach((n) => {
      const has = (name: string) => n.marks.some((m) => m.type.name === name);
      const href = n.marks.find((m) => m.type.name === "link")?.attrs["href"] as string | undefined;
      const format: RunFormat = { ...(has("strong") ? { bold: true } : {}), ...(has("em") ? { italic: true } : {}), ...(has("underline") ? { underline: true } : {}), ...(href ? { href } : {}) };
      runs.push(Object.keys(format).length ? { text: n.text ?? "", format } : { text: n.text ?? "" });
    });
    return runs;
  };
  const walk = (node: PmNode, quote: boolean, list: LineBlock["list"]) => {
    node.forEach((child) => {
      const name = child.type.name;
      if (child.isTextblock) {
        const level = Math.min(child.attrs["level"] as number, 3);
        const block = name === "heading" ? (`h${level}` as LineBlock["block"]) : quote ? "quote" : "p";
        lines.push({ block: list ? { block, list } : { block }, runs: runsOf(child) });
      } else if (name === "bullet_list" || name === "ordered_list") {
        const level = list ? Math.min(list.level + 1, 2) : 0;
        child.forEach((item) => walk(item, quote, { ordered: name === "ordered_list", level }));
      } else if (name === "blockquote") {
        walk(child, true, list);
      } else if (name === "horizontal_rule") {
        lines.push({ block: { block: "p" }, runs: [] });
      }
    });
  };
  walk(doc, false, undefined);
  return lines;
}
