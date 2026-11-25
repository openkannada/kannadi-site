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

test("Word's order of paragraph properties: a quote's border comes before its indent", async () => {
  const { readZip } = await import("../src/editor/zip.ts");
  const files = await readZip(await writeRichDocx(LINES));
  const styles = new TextDecoder().decode(files.get("word/styles.xml"));
  const quote = styles.slice(styles.indexOf('w:styleId="Quote"'));
  assert.ok(quote.indexOf("<w:pBdr>") < quote.indexOf("<w:ind "), quote.slice(0, 200));
});

test("a numbered list counts on past a nested bulleted list, as 1 list in Word", async () => {
  const { readZip } = await import("../src/editor/zip.ts");
  const lines: RichLine[] = [
    { block: { block: "p", list: { ordered: true, level: 0 } }, runs: [{ text: "A" }] },
    { block: { block: "p", list: { ordered: false, level: 1 } }, runs: [{ text: "sub" }] },
    { block: { block: "p", list: { ordered: true, level: 0 } }, runs: [{ text: "B" }] },
  ];
  const files = await readZip(await writeRichDocx(lines));
  const doc = new TextDecoder().decode(files.get("word/document.xml"));
  const ids = [...doc.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["1", "1", "1"]);
  const numbering = new TextDecoder().decode(files.get("word/numbering.xml"));
  assert.match(numbering, /<w:lvl w:ilvl="0"><w:start w:val="1"\/><w:numFmt w:val="decimal"\/>/);
  assert.match(numbering, /<w:lvl w:ilvl="1"><w:start w:val="1"\/><w:numFmt w:val="bullet"\/>/);
  const { lines: read } = await readDocxRich(await writeRichDocx(lines));
  assert.deepEqual(read, lines.map((l) => l.block));
});

test("lists Word numbers through paragraph styles, and a deep level keeps its own kind", async () => {
  const styles = `<w:styles ${W}><w:style w:type="paragraph" w:styleId="LB2"><w:name w:val="List Bullet 2"/></w:style><w:style w:type="paragraph" w:styleId="LN"><w:name w:val="List Number"/></w:style></w:styles>`;
  const numbering = `<w:numbering ${W}><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="2"><w:numFmt w:val="bullet"/></w:lvl><w:lvl w:ilvl="3"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
  const p = (pPr: string, text: string) => `<w:p><w:pPr>${pPr}</w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
  const body = p('<w:pStyle w:val="LB2"/>', "a") + p('<w:pStyle w:val="LN"/>', "b") + p('<w:numPr><w:ilvl w:val="3"/><w:numId w:val="1"/></w:numPr>', "c");
  const bytes = await writeZip([
    ["word/document.xml", `<w:document ${W}><w:body>${body}</w:body></w:document>`],
    ["word/styles.xml", styles],
    ["word/numbering.xml", numbering],
  ]);
  const { lines } = await readDocxRich(bytes);
  assert.deepEqual(lines, [
    { block: "p", list: { ordered: false, level: 1 } },
    { block: "p", list: { ordered: true, level: 0 } },
    { block: "p", list: { ordered: true, level: 2 } },
  ]);
});

test("under 1 numbered list, a bulleted sub-list and a later numbered one each keep their kind, and the list counts on", async () => {
  const { readZip } = await import("../src/editor/zip.ts");
  const lines: RichLine[] = [
    { block: { block: "p", list: { ordered: true, level: 0 } }, runs: [{ text: "A" }] },
    { block: { block: "p", list: { ordered: false, level: 1 } }, runs: [{ text: "dot" }] },
    { block: { block: "p", list: { ordered: true, level: 0 } }, runs: [{ text: "B" }] },
    { block: { block: "p", list: { ordered: true, level: 1 } }, runs: [{ text: "one" }] },
    { block: { block: "p", list: { ordered: true, level: 1 } }, runs: [{ text: "two" }] },
    { block: { block: "p", list: { ordered: true, level: 0 } }, runs: [{ text: "C" }] },
  ];
  const { lines: read } = await readDocxRich(await writeRichDocx(lines));
  assert.deepEqual(read, lines.map((l) => l.block));
  const doc = new TextDecoder().decode((await readZip(await writeRichDocx(lines))).get("word/document.xml"));
  const ids = [...doc.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);
  // A, B and C share 1 list, so Word numbers them 1, 2 and 3.
  assert.equal(new Set([ids[0], ids[2], ids[5]]).size, 1);
  assert.equal(ids[3], ids[4]);
});
