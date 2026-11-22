// Tests for Word files with headings, lists, quotes, bold, italic, underline and links: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { readDocxRich, type RichLine, writeRichDocx } from "../src/editor/docx.ts";
import { joinRich } from "../src/editor/text.ts";
import { writeZip } from "../src/editor/zip.ts";

const LINES: RichLine[] = [
  { block: { block: "h1" }, runs: [{ text: "ವರದಿ" }] },
  { block: { block: "p" }, runs: [{ text: "ಕನ್ನಡ " }, { text: "ನಾಡು", format: { bold: true } }, { text: " ಮತ್ತು\t" }, { text: "ನುಡಿ", format: { italic: true, underline: true } }] },
  { block: { block: "quote" }, runs: [{ text: "ಉಲ್ಲೇಖ" }] },
  { block: { block: "p", list: { ordered: false, level: 0 } }, runs: [{ text: "ಒಂದು" }] },
  { block: { block: "p", list: { ordered: false, level: 1 } }, runs: [{ text: "ಒಳಗೆ" }] },
  { block: { block: "p", list: { ordered: true, level: 0 } }, runs: [{ text: "ಮೊದಲು" }] },
  { block: { block: "p" }, runs: [{ text: "ಜಾಲ", format: { href: "https://openkannada.org/" } }] },
];

test("a formatted document written as a Word file reads back the same, line for line", async () => {
  const { segments, lines } = await readDocxRich(await writeRichDocx(LINES));
  assert.deepEqual(lines, LINES.map((l) => l.block));
  const joined = joinRich(segments, lines, () => assert.fail("nothing to convert"));
  assert.equal(joined.text, LINES.map((l) => l.runs.map((r) => r.text).join("")).join("\n"));
  const formatted = (text: string) => joined.spans.find((s) => joined.text.slice(s.start, s.end) === text)?.format;
  assert.deepEqual(formatted("ನಾಡು"), { bold: true });
  assert.deepEqual(formatted("ನುಡಿ"), { italic: true, underline: true });
  assert.deepEqual(formatted("ಜಾಲ"), { href: "https://openkannada.org/" });
});

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

test("headings by Word's built-in names in any language of Word, real numbering, and a bold Nudi run that converts", async () => {
  // German Word names the style id Überschrift1; its built-in name stays "heading 1".
  const styles = `<w:styles ${W}><w:style w:type="paragraph" w:styleId="berschrift1"><w:name w:val="heading 1"/></w:style></w:styles>`;
  const numbering = `<w:numbering ${W}><w:abstractNum w:abstractNumId="7"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:num w:numId="3"><w:abstractNumId w:val="7"/></w:num></w:numbering>`;
  const body =
    `<w:p><w:pPr><w:pStyle w:val="berschrift1"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:t>Titel</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="BRH Kannada"/><w:b/></w:rPr><w:t>PÀ£ÀßqÀ</w:t></w:r><w:r><w:t xml:space="preserve"> plain</w:t></w:r></w:p>`;
  const bytes = await writeZip([
    ["word/document.xml", `<w:document ${W}><w:body>${body}</w:body></w:document>`],
    ["word/styles.xml", styles],
    ["word/numbering.xml", numbering],
  ]);
  const { segments, lines } = await readDocxRich(bytes);
  assert.deepEqual(lines, [{ block: "h1" }, { block: "p", list: { ordered: true, level: 0 } }]);
  const joined = joinRich(segments, lines, (text, layout) => {
    assert.equal(layout, "nudi");
    return { text: text === "PÀ£ÀßqÀ" ? "ಕನ್ನಡ" : assert.fail(text), unknown: [], layout: "nudi" };
  });
  assert.equal(joined.text, "Titel\nಕನ್ನಡ plain");
  // The paragraph mark's bold is not the title's text; the Nudi run's bold is.
  assert.deepEqual(joined.spans, [{ start: 6, end: 11, format: { bold: true } }]);
});

test("a text box's bold paragraph mark leaves the run around the box as it was", async () => {
  const box = `<w:txbxContent><w:p><w:pPr><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:t>box</w:t></w:r></w:p></w:txbxContent>`;
  const body = `<w:p><w:r><w:t xml:space="preserve">before </w:t>${box}<w:t xml:space="preserve"> after</w:t></w:r></w:p>`;
  const bytes = await writeZip([["word/document.xml", `<w:document ${W}><w:body>${body}</w:body></w:document>`]]);
  const { segments, lines } = await readDocxRich(bytes);
  const joined = joinRich(segments, lines, () => assert.fail("nothing to convert"));
  assert.match(joined.text, /before[\s\S]*box[\s\S]*after/);
  assert.deepEqual(joined.spans, []);
});
