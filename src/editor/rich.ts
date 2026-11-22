// What a document can hold on the ProseMirror editor: headings, paragraphs, lists, quotes and rules, with bold, italic,
// underline and links; the commands, keys and typed shortcuts that make them; and HTML in and out of them.
import { chainCommands, lift, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { InputRule, inputRules, textblockTypeInputRule, undoInputRule, wrappingInputRule } from "prosemirror-inputrules";
import { DOMParser, DOMSerializer, type MarkType, type Node as PmNode, type NodeType, Schema } from "prosemirror-model";
import { addListNodes, liftListItem, sinkListItem, splitListItem, wrapInList } from "prosemirror-schema-list";
import type { Command, EditorState, Plugin } from "prosemirror-state";

import { parseHtml, STYLE } from "./html.ts";

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
    paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0], parseDOM: [{ tag: "p" }] },
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

/** A document from HTML, keeping what the schema can hold. HTML this editor saved keeps every space and tab. */
export function fromHtml(html: string): PmNode {
  const ours = /<meta name="generator" content="kannadi">/.test(html);
  const body = parseHtml(html).body;
  // The renamed <style>, which the parser moves into the body, and anything else that is not text to read.
  for (const el of body.querySelectorAll(`textarea[${STYLE}], script, noscript, template, title`)) el.remove();
  return DOMParser.fromSchema(schema).parse(body, { preserveWhitespace: ours });
}
