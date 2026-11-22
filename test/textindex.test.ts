// Tests for mapping text offsets to ProseMirror positions and back: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { type Node as PmNode, Schema } from "prosemirror-model";

import { offsetOfPos, posOf, textOf } from "../src/editor/textindex.ts";

const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} } });
const docOf = (text: string) => schema.node("doc", null, text.split("\n").map((l) => schema.node("paragraph", null, l ? schema.text(l) : undefined)));

// The plain walk the index replaces, paragraph by paragraph.
function linearPos(doc: PmNode, at: number): number {
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
function linearOffset(doc: PmNode, pos: number): number {
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

test("offsets and positions map as the plain walk does, at every place in every sample", () => {
  for (const text of ["", "a", "ab", "\n", "a\n", "\na", "ab\ncd", "ab\n\ncd", "abc\n\n\n", "ಕನ್ನಡ\nನಾಡು\n\nನುಡಿ"]) {
    const doc = docOf(text);
    assert.equal(textOf(doc), text);
    for (let at = 0; at <= text.length + 1; at++) assert.equal(posOf(doc, at), linearPos(doc, at), `${JSON.stringify(text)} offset ${at}`);
    for (let pos = 0; pos <= doc.content.size; pos++) assert.equal(offsetOfPos(doc, pos), linearOffset(doc, pos), `${JSON.stringify(text)} position ${pos}`);
  }
});

test("in headings, lists and quotes, every line is in the text, and every offset maps to a position and back", async () => {
  const { schema: rich } = await import("../src/editor/rich.ts");
  const p = (text: string) => rich.node("paragraph", null, text ? rich.text(text) : undefined);
  const item = (...content: PmNode[]) => rich.node("list_item", null, content);
  const doc = rich.node("doc", null, [
    rich.node("heading", { level: 1 }, rich.text("ಶೀರ್ಷಿಕೆ")),
    rich.node("bullet_list", null, [item(p("ಒಂದು")), item(p("ಎರಡು"), rich.node("ordered_list", null, [item(p("ಒಳಗೆ"))]))]),
    rich.node("horizontal_rule"),
    rich.node("blockquote", null, [p(""), p("ಉಲ್ಲೇಖ")]),
  ]);
  const text = "ಶೀರ್ಷಿಕೆ\nಒಂದು\nಎರಡು\nಒಳಗೆ\n\nಉಲ್ಲೇಖ";
  assert.equal(textOf(doc), text);
  for (let at = 0; at <= text.length; at++) {
    const pos = posOf(doc, at);
    assert.ok(doc.resolve(pos).parent.isTextblock, `offset ${at} lands in a line`);
    assert.equal(offsetOfPos(doc, pos), at, `offset ${at} comes back`);
  }
});
