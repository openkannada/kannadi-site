// Tests for the editor modules that need no WebAssembly or DOM: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { Composer } from "../src/editor/compose.ts";
import { readDocx, writeDocx } from "../src/editor/docx.ts";
import { DocEditor } from "../src/editor/editor.ts";
import { exportBlob, htmlSegments, NotText, openFile, pasted } from "../src/editor/files.ts";
import {
  codePoints,
  convertPlan,
  countWords,
  diff,
  escapeMarkup,
  isLegacyFont,
  joinSegments,
  legacyLayout,
  resolveAuto,
  looksLegacy,
  notText,
  nudiNotes,
  shiftAnchors,
  shiftRanges,
} from "../src/editor/text.ts";
import { readZip, writeZip } from "../src/editor/zip.ts";

// Karnataka RDPR page, Dec 2002, BRH Kannada:
// https://web.archive.org/web/20021227171554/http://www.kar.nic.in:80/rdpr/kan-www/Schemes/Chapter-1/Matter/1_2(M).htm
const NUDI = "¸ÀPÁðj ¥ÁæxÀ«ÄPÀ ±Á¯ÉUÀ¼À°è ²PÀëPÀjUÉ vÀgÀ¨ÉÃw ¤ÃqÀÄªÀÅzÀÄ.";

test("legacy text is told apart from English and Unicode Kannada", () => {
  assert.ok(looksLegacy(NUDI));
  assert.ok(looksLegacy("PÀ£ÀßqÀ"));
  assert.ok(!looksLegacy("The village panchayat met on 12 March."));
  assert.ok(!looksLegacy("Café crème brûlée in Bengaluru"));
  assert.ok(!looksLegacy("Señor Müller’s “naïve” résumé — déjà vu"));
  assert.ok(!looksLegacy("ಕನ್ನಡ ನಾಡು"));
  assert.ok(!looksLegacy(""));
});

test("legacy font names", () => {
  for (const f of ["BRH Kannada", "Nudi 01 e", "'Nudi Akshar'", "Baraha Kan", "Arial, BRH Kannada"]) assert.ok(isLegacyFont(f), f);
  for (const f of ["Arial", "Nirmala UI", "NudiUni01e", "Nudi Unicode 01", "Tunga", undefined, null]) assert.ok(!isLegacyFont(f), f);
  assert.equal(legacyLayout("BRH Kannada"), "nudi");
  assert.equal(legacyLayout("AkrutiKndPadmaDemi"), "akruti");
  assert.equal(legacyLayout("'Akruti Knd Padma', serif"), "akruti");
  assert.equal(legacyLayout("Arial, Nudi 01 e"), "nudi");
  assert.equal(legacyLayout("AkrutiKndPadmini"), null);
  assert.equal(legacyLayout("Arial"), null);
});

test("diff finds the single edit", () => {
  assert.deepEqual(diff("abcdef", "abXYef"), { start: 2, oldEnd: 4, newEnd: 4 });
  assert.deepEqual(diff("abc", "abc"), { start: 3, oldEnd: 3, newEnd: 3 });
  assert.deepEqual(diff("aaa", "aaaa"), { start: 3, oldEnd: 3, newEnd: 4 });
  assert.deepEqual(diff("", "x"), { start: 0, oldEnd: 0, newEnd: 1 });
});

test("diff puts an edit inside a run of equal letters at the caret", () => {
  assert.deepEqual(diff("xa", "xaa"), { start: 2, oldEnd: 2, newEnd: 3 });
  assert.deepEqual(diff("xa", "xaa", 2), { start: 1, oldEnd: 1, newEnd: 2 });
  assert.deepEqual(diff("aat", "at", 0), { start: 0, oldEnd: 1, newEnd: 0 });
  assert.deepEqual(diff("xa", "xaa", 0), { start: 2, oldEnd: 2, newEnd: 3 }, "a caret that does not fit is ignored");
  const big = "ಕನ್ನಡ ".repeat(200_000);
  assert.deepEqual(diff(big, big + "x"), { start: big.length, oldEnd: big.length, newEnd: big.length + 1 });
  assert.deepEqual(diff("x" + big, big), { start: 0, oldEnd: 1, newEnd: 0 });
});

test("ranges move with edits and drop when touched", () => {
  const edit = diff("ab ಾ cd ೆ", "XXab ಾ cd ೆ");
  assert.deepEqual(shiftRanges([3, 4, 8, 9], edit), [5, 6, 10, 11]);
  assert.deepEqual(shiftRanges([3, 4, 8, 9], diff("ab ಾ cd ೆ", "ab ಾ c ೆ")), [3, 4, 7, 8]);
  assert.deepEqual(shiftRanges([3, 4, 8, 9], diff("ab ಾ cd ೆ", "ab ಾ cdೆ")), [3, 4], "the edit touches the second range");
});

test("plain text that needs no conversion is kept exactly", () => {
  const convert = () => assert.fail("nothing to convert");
  const bestLayout = () => assert.fail("nothing to judge");
  for (const text of ["    indented code\n\n\n\nend ", "ಕನ್ನಡ  ನಾಡು\n\t", " "]) {
    assert.deepEqual(pasted("", text, { convert, bestLayout }), { text, unknown: [], converted: 0, layouts: [] });
  }
});

test("Windows and old Mac line endings become the editor's 1 line break, in pastes and files", async () => {
  const convert = () => assert.fail("nothing to convert");
  const bestLayout = () => assert.fail("nothing to judge");
  assert.equal(pasted("", "ಒಂದು\r\nಎರಡು\rಮೂರು\n", { convert, bestLayout }).text, "ಒಂದು\nಎರಡು\nಮೂರು\n");
  const file = new File([new TextEncoder().encode("ಒಂದು\r\nಎರಡು\r\n")], "crlf.txt");
  const opened = await openFile(file, { convert, bestLayout, decodeWindows1252: () => assert.fail("UTF-8") });
  assert.equal(opened.text, "ಒಂದು\nಎರಡು\n");
});

test("a .doc, a PDF or other binary is refused, never opened as text", async () => {
  const io = { convert: () => assert.fail("no text"), bestLayout: () => assert.fail("no text"), decodeWindows1252: () => assert.fail("no text") };
  const bytes = (...b) => new Uint8Array([...b, ...new Array(200).fill(0x41)]);
  assert.equal(notText(bytes(0x25, 0x50, 0x44, 0x46, 0x2d)), "pdf");
  assert.equal(notText(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)), "doc");
  assert.equal(notText(bytes(0x50, 0x4b, 0x03, 0x04)), "other");
  assert.equal(notText(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])), "other");
  assert.equal(notText(new TextEncoder().encode("ಕನ್ನಡ\r\n\tline\f")), null);
  assert.equal(notText(new Uint8Array([0xff, 0xfe, 0x95, 0x0c, 0, 0])), null, "UTF-16 has NULs and is text");
  assert.equal(notText(new Uint8Array([0xc0, 0xe0, 0xa3, 0x20, 0x50])), null, "Windows-1252 Nudi bytes are text");
  for (const [name, kind, head] of [["old.doc", "doc", [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], ["scan.pdf", "pdf", [0x25, 0x50, 0x44, 0x46]]]) {
    await assert.rejects(openFile(new File([bytes(...head)], name), io), (e) => e instanceof NotText && e.kind === kind);
  }
});

test("HTML saved by the editor opens with every line, blank line and space as typed", async () => {
  const { DOMParser } = await import("linkedom");
  const saved = globalThis.DOMParser;
  globalThis.DOMParser = DOMParser;
  try {
    const text = "ಮೊದಲ ಸಾಲು\n\n\nಎರಡು  ಸ್ಪೇಸ್   ಇಲ್ಲಿ\n  ಮುಂದೆ ಸ್ಪೇಸ್\n<a & b>\n";
    const blob = await exportBlob(text, "html", "t");
    const io = { convert: () => assert.fail("nothing to convert"), bestLayout: () => assert.fail("nothing to judge"), decodeWindows1252: () => assert.fail("UTF-8") };
    const opened = await openFile(new File([await blob.arrayBuffer()], "t.html"), io);
    assert.equal(opened.text, text);
  } finally {
    globalThis.DOMParser = saved;
  }
});

test("Nudi notes say what happened to each character", () => {
  assert.equal(nudiNotes(0, 0), "");
  assert.equal(nudiNotes(1, 0), "1 character has no Nudi glyph and stayed as typed.");
  assert.equal(
    nudiNotes(3, 1, 2),
    "1 character has no Nudi glyph and stayed as typed. 2 characters have no byte in a Nudi text file and became ?. 1 syllable is malformed and may not read back the same.",
  );
});

test("markup escaping", () => {
  assert.equal(escapeMarkup('<a href="x">&</a>'), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

test("anchors move with edits and drop when edited away", () => {
  const before = "ab õ cd õ";
  const anchors = [{ offset: 3, glyph: "õ" }, { offset: 8, glyph: "õ" }];
  const after = "XXab õ cd õ";
  assert.deepEqual(shiftAnchors(anchors, diff(before, after), after), [
    { offset: 5, glyph: "õ" },
    { offset: 10, glyph: "õ" },
  ]);
  const deleted = "ab  cd õ";
  assert.deepEqual(shiftAnchors(anchors, diff(before, deleted), deleted), [{ offset: 7, glyph: "õ" }]);
});

test("segments of 1 layout merge before converting, and offsets point into the output", () => {
  const layouts = [];
  const convert = (text, layout) => {
    layouts.push(layout);
    return { text: text.toUpperCase(), unknown: [text.indexOf("q")].filter((i) => i >= 0), layout };
  };
  const joined = joinSegments(
    [
      { text: "Hi ", legacy: false },
      { text: "ab", legacy: "nudi" },
      { text: "qc", legacy: "nudi" },
      { text: "", legacy: false },
      { text: " end", legacy: false },
    ],
    convert,
  );
  assert.equal(joined.text, "Hi ABQC end");
  assert.deepEqual(joined.layouts, ["nudi"]);
  assert.deepEqual(joined.unknown, [5]);
  assert.equal(joined.converted, 4);
  assert.deepEqual(layouts, ["nudi"]);
  const mixed = joinSegments(
    [
      { text: "ab", legacy: "nudi" },
      { text: "cd", legacy: "akruti" },
      { text: "ef", legacy: "auto" },
    ],
    convert,
  );
  assert.equal(mixed.text, "ABCDEF");
  assert.deepEqual(layouts.slice(1), ["nudi", "akruti", "auto"]);
});

test("auto segments get 1 layout, chosen over all their text", () => {
  const seen = [];
  const bestLayout = (text) => {
    seen.push(text);
    return "akruti";
  };
  const segments = [
    { text: "ab", legacy: "auto" },
    { text: " ", legacy: false },
    { text: "cd", legacy: "auto" },
    { text: "ef", legacy: "nudi" },
  ];
  assert.deepEqual(
    resolveAuto(segments, bestLayout).map((s) => s.legacy),
    ["akruti", false, "akruti", "nudi"],
  );
  assert.deepEqual(seen, ["ab\ncd"]);
  assert.equal(resolveAuto([{ text: "x", legacy: false }], () => assert.fail("no auto text")).length, 1);
});

// Just enough DOM for htmlSegments: elements with attributes, classes and children.
globalThis.Node ??= { TEXT_NODE: 3, ELEMENT_NODE: 1 };
const el = (tag, attrs = {}, ...kids) => ({
  nodeType: 1,
  tagName: tag.toUpperCase(),
  childNodes: kids.map((k) => (typeof k === "string" ? { nodeType: 3, data: k } : k)),
  getAttribute: (n) => attrs[n] ?? null,
  hasAttribute: (n) => n in attrs,
  classList: (attrs.class ?? "").split(" ").filter(Boolean),
});
const page = (css, body) => ({ body, querySelectorAll: () => [{ textContent: css }] });
const fontOf = (css, body) => htmlSegments(page(css, el("body", {}, body))).find((s) => s.text.trim()).legacy;

test("html text takes the font of the last class rule, and a page-wide plain font leaves it to its looks", () => {
  const text = "PÀ£ÀßqÀ £ÁqÀÄ";
  assert.equal(fontOf(".a{font-family:'Nudi 01 e'} .b{font-family:Arial}", el("span", { class: "a b" }, text)), false);
  assert.equal(fontOf(".b{font-family:Arial} .a{font-family:'Nudi 01 e'}", el("span", { class: "b a" }, text)), "nudi");
  assert.equal(fontOf(".a{font-family:AkrutiKndPadma}", el("p", { class: "a" }, text)), "akruti");
  assert.equal(fontOf("p{font-family:'Nudi 01 e'} .x{font-family:Arial}", el("p", { class: "x" }, text)), false);
  assert.equal(fontOf("body{font-family:Arial} #kan{font-family:'BRH Kannada'}", el("div", { id: "kan" }, text)), "auto");
  assert.equal(fontOf("body{font-family:Arial}", el("p", {}, text)), "auto");
});

test("word count and code points", () => {
  assert.equal(countWords("  ಕನ್ನಡ ನಾಡು\nಬೆಂಗಳೂರು "), 3);
  assert.equal(codePoints("ಕ್"), "U+0C95 U+0CCD");
});

test("zip round trip", async () => {
  const files = [
    ["a.txt", "ಕನ್ನಡ ".repeat(500)],
    ["dir/b.bin", new Uint8Array([0, 1, 2, 255])],
  ];
  const entries = await readZip(await writeZip(files));
  assert.equal(new TextDecoder().decode(entries.get("a.txt")), files[0][1]);
  assert.deepEqual([...entries.get("dir/b.bin")], [0, 1, 2, 255]);
  await assert.rejects(readZip(new Uint8Array(30)), /not a ZIP/);
});

test("docx round trip keeps lines and tabs", async () => {
  const text = "ಕನ್ನಡ ನಾಡು\n\nಸಾಲು 2\tಟ್ಯಾಬ್ <&> \"x\"\u0007";
  const segments = await readDocx(await writeDocx(text));
  assert.ok(segments.every((s) => !s.legacy));
  assert.equal(segments.map((s) => s.text).join(""), text.replace("\u0007", ""));
});

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const run = (text, font) =>
  `<w:r>${font ? `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/></w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;

async function docx(body, styles = "") {
  return writeZip([
    ["word/document.xml", `<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`],
    ["word/styles.xml", `<?xml version="1.0"?><w:styles ${W}>${styles}</w:styles>`],
  ]);
}

test("docx runs carry the layout of their font", async () => {
  const body = `<w:p>${run("PÀ", "Nudi 01 e")}${run("dâ}â", "AkrutiKndPadmaDemi")}${run("Hi", "Arial")}</w:p>`;
  assert.deepEqual(await readDocx(await docx(body, "")), [
    { text: "PÀ", legacy: "nudi" },
    { text: "dâ}â", legacy: "akruti" },
    { text: "Hi", legacy: false },
  ]);
});

test("docx runs are legacy by run font, character style, paragraph style or default", async () => {
  const styles =
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman"/></w:rPr></w:rPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:styleId="Base"><w:rPr><w:rFonts w:ascii="Nudi 01 e"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Kan"><w:basedOn w:val="Base"/></w:style>' +
    '<w:style w:type="character" w:styleId="Eng"><w:rPr><w:rFonts w:ascii="Arial"/></w:rPr></w:style>';
  const body =
    `<w:p>${run("English ", "Arial")}${run("PÀ£À", "BRH Kannada")}${run("ßqÀ", "BRH Kannada")}</w:p>` +
    `<w:p><w:pPr><w:pStyle w:val="Kan"/><w:rPr><w:rFonts w:ascii="Arial"/></w:rPr></w:pPr>${run("¤ÃqÀÄ")}` +
    `<w:r><w:rPr><w:rStyle w:val="Eng"/></w:rPr><w:t>Eng</w:t></w:r><w:r><w:tab/></w:r></w:p>` +
    `<w:p>${run("Times &amp; more")}<w:r><w:br/></w:r></w:p>`;
  const segments = await readDocx(await docx(body, styles));
  assert.deepEqual(segments, [
    { text: "English ", legacy: false },
    { text: "PÀ£À", legacy: "nudi" },
    { text: "ßqÀ", legacy: "nudi" },
    { text: "\n", legacy: false },
    { text: "¤ÃqÀÄ", legacy: "nudi" },
    { text: "Eng", legacy: false },
    { text: "\t", legacy: false },
    { text: "\n", legacy: false },
    { text: "Times & more", legacy: false },
    { text: "\n", legacy: false },
  ]);
});

test("docx text boxes are read once and keep the outer paragraph", async () => {
  const box =
    '<mc:AlternateContent><mc:Choice><w:drawing><w:txbxContent><w:p><w:r><w:t>BOX</w:t></w:r></w:p></w:txbxContent></w:drawing></mc:Choice>' +
    "<mc:Fallback><w:pict><w:txbxContent><w:p><w:r><w:t>BOX</w:t></w:r></w:p></w:txbxContent></w:pict></mc:Fallback></mc:AlternateContent>";
  const body = `<w:p><w:pPr><w:pStyle w:val="Kan"/></w:pPr>${run("PÀ")}<w:r>${box}</w:r>${run("£À")}</w:p>`;
  const styles = '<w:style w:styleId="Kan"><w:rPr><w:rFonts w:ascii="BRH Kannada"/></w:rPr></w:style>';
  const segments = await readDocx(await docx(body, styles));
  assert.equal(segments.map((s) => s.text).join(""), "PÀ\nBOX\n£À");
  assert.deepEqual(
    segments.filter((s) => s.legacy).map((s) => s.text),
    ["PÀ", "£À"],
  );
});

test("docx tracked format changes and bad character references", async () => {
  const tracked =
    '<w:r><w:rPr><w:rFonts w:ascii="BRH Kannada"/><w:rPrChange><w:rPr><w:rFonts w:ascii="Arial"/></w:rPr></w:rPrChange></w:rPr><w:t>PÀ</w:t></w:r>';
  const segments = await readDocx(await docx(`<w:p>${tracked}${run("&#x110000;&#65;")}</w:p>`));
  assert.deepEqual(segments, [
    { text: "PÀ", legacy: "nudi" },
    { text: "\uFFFDA", legacy: false },
  ]);
});

test("zip reads only the parts asked for", async () => {
  const zip = await writeZip([["a", "1"], ["b", "2"]]);
  assert.deepEqual([...(await readZip(zip, ["b"])).keys()], ["b"]);
});

test("a docx with no document part is refused", async () => {
  await assert.rejects(readDocx(await writeZip([["x.xml", "<x/>"]])), /no Word document/);
});

/** Stands in for DocEditor: a string with a caret. */
class FakeEditor {
  constructor() {
    this.text = "";
    this.caret = 0;
    this.composing = false;
    this.onEdit = () => {};
  }
  type(chars) {
    for (const c of chars) {
      const before = this.text;
      this.text = before.slice(0, this.caret) + c + before.slice(this.caret);
      this.caret += c.length;
      this.onEdit(diff(before, this.text, this.caret), this.text, "insertText");
    }
  }
  replace(start, end, text, inputType) {
    const before = this.text;
    this.text = before.slice(0, start) + text + before.slice(end);
    this.caret = start + text.length;
    this.onEdit(diff(before, this.text, this.caret), this.text, inputType);
  }
  commit(text) {
    const before = this.text;
    this.text = before.slice(0, this.caret) + text + before.slice(this.caret);
    this.caret += text.length;
    this.onEdit(diff(before, this.text, this.caret), this.text, "insertCompositionText");
  }
  selection() {
    return { start: this.caret, end: this.caret };
  }
  select(at) {
    this.caret = at;
  }
}

function composer(mode) {
  const editor = new FakeEditor();
  const translit = (text, from) => {
    assert.equal(from, mode);
    const table = { k: "ಕ್", ka: "ಕ", kan: "ಕನ್", kann: "ಕನ್ನ್", kanna: "ಕನ್ನ", kannaD: "ಕನ್ನಡ್", kannaDa: "ಕನ್ನಡ" };
    return table[text] ?? `[${text}]`;
  };
  const c = new Composer(editor, translit, { onComposing: () => {} });
  editor.onEdit = (edit, after, type) => c.handle(edit, after, type);
  c.setMode(mode);
  return { editor, c };
}

test("phonetic typing re-renders the whole word on each letter", () => {
  const { editor } = composer("baraha");
  editor.type("kannaDa");
  assert.equal(editor.text, "ಕನ್ನಡ");
  editor.type(" ");
  editor.type("ka");
  assert.equal(editor.text, "ಕನ್ನಡ ಕ");
});

test("backspace removes a Latin letter and escape restores the Latin word", () => {
  const { editor, c } = composer("baraha");
  editor.type("kann");
  const e = { inputType: "deleteContentBackward", cancelable: true, prevented: false, preventDefault() { this.prevented = true; } };
  c.beforeInput(e);
  assert.ok(e.prevented);
  assert.equal(editor.text, "ಕನ್");
  assert.ok(c.revert());
  assert.equal(editor.text, "kan");
  assert.ok(!c.revert());
});

test("a letter typed next to the same letter converts in place", () => {
  const { editor } = composer("baraha");
  editor.text = "at";
  editor.caret = 1;
  editor.type("t");
  assert.equal(editor.text, "a[t]t");
});

test("a word committed with its space converts", () => {
  const { editor } = composer("baraha");
  editor.commit("kannaDa ");
  assert.equal(editor.text, "ಕನ್ನಡ ");
});

test("Kannada keys mode and non-letters leave text alone", () => {
  const { editor, c } = composer("baraha");
  c.setMode("kannada");
  editor.type("ka");
  assert.equal(editor.text, "ka");
  c.setMode("baraha");
  editor.type("1");
  assert.equal(editor.text, "ka1");
});

test("undo history merges typing into 1 step and keeps other edits apart", () => {
  const el = { contentEditable: "", textContent: "", addEventListener() {} };
  const editor = new DocEditor(el, () => {});
  const step = (before, after, type) => editor.record(diff(before, after), before, after, type);
  step("", "k", "insertText");
  step("k", "ಕ್", "compose");
  step("ಕ್", "ಕ", "compose");
  step("ಕ", "ಕ ", "insertText");
  step("ಕ ", "ಕ X", "insertReplacementText");
  assert.deepEqual(
    editor.undoStack.map(({ start, removed, inserted }) => ({ start, removed, inserted })),
    [
      { start: 0, removed: "", inserted: "ಕ" },
      { start: 1, removed: "", inserted: " " },
      { start: 2, removed: "", inserted: "X" },
    ],
  );
});

test("a word typed in English letters renders as its best spelling and can be swapped for another", () => {
  const editor = new FakeEditor();
  const words = [];
  const spell = (latin, mode) => (mode === "english" ? { n: "ನ", na: "ನ", nam: "ನಮ್", nama: "ನಮ" }[latin] ?? `<${latin}>` : `[${latin}]`);
  const c = new Composer(editor, spell, { onComposing: () => {}, onWord: (w) => words.push(w && w.latin) });
  editor.onEdit = (edit, after, type) => c.handle(edit, after, type);
  c.setMode("english");
  editor.type("nama");
  assert.equal(editor.text, "ನಮ");
  assert.deepEqual(c.current, { latin: "nama", start: 0, end: 2 });
  c.choose("ನಾಮ");
  assert.equal(editor.text, "ನಾಮ");
  assert.equal(c.current, null);
  assert.deepEqual(words, ["n", "na", "nam", "nama", null]);
});

test("after a word committed with its space, the caret is after the space", () => {
  const { editor } = composer("baraha");
  editor.commit("kannaDa ");
  editor.commit("ka ");
  assert.equal(editor.text, "ಕನ್ನಡ ಕ ");
  assert.equal(editor.caret, editor.text.length);
});

test("a word is reported done once, kept or put back in Latin letters", () => {
  const editor = new FakeEditor();
  const done = [];
  const c = new Composer(editor, (latin) => latin.toUpperCase(), { onComposing: () => {}, onDone: (w, kept) => done.push([w.latin, kept]) });
  editor.onEdit = (edit, after, type) => c.handle(edit, after, type);
  c.setMode("english");
  editor.type("ab ");
  editor.type("cd");
  c.revert();
  assert.deepEqual(done, [["ab", true], ["cd", false]]);
  assert.equal(editor.text, "AB cd");
});

/** A composer whose spelling shows the mode and the whole Latin word, so a word cut in 2 shows as 2. */
function marked(mode) {
  const editor = new FakeEditor();
  const c = new Composer(editor, (latin, m) => `<${m}:${latin}>`, { onComposing: () => {} });
  editor.onEdit = (edit, after, type) => c.handle(edit, after, type);
  c.setMode(mode);
  return { editor, c };
}

test("the first letter of a document and of a line is converted with the rest of its word, in every Latin mode", () => {
  for (const mode of ["english", "baraha", "iso15919"]) {
    const start = marked(mode);
    start.editor.type("hello");
    assert.equal(start.editor.text, `<${mode}:hello>`, mode);
    const line = marked(mode);
    line.editor.text = "ab\n";
    line.editor.caret = 3;
    line.editor.type("hello");
    assert.equal(line.editor.text, `ab\n<${mode}:hello>`, mode);
  }
});

test("a keyboard composing the rest of a word moves the caret, and the word goes on", () => {
  const { editor, c } = marked("english");
  editor.type("h");
  // The composition shows "e" after the rendered letter, so the caret leaves the word's end.
  editor.composing = true;
  editor.caret = editor.text.length + 1;
  c.selectionChanged();
  editor.caret = editor.text.length;
  editor.composing = false;
  editor.commit("ello ");
  assert.equal(editor.text, "<english:hello> ");
});

test("a keyboard that sends the word being typed again, whole and in Latin letters, keeps 1 word", () => {
  const { editor } = marked("english");
  editor.type("h");
  editor.replace(0, editor.text.length, "hello ", "insertCompositionText");
  assert.equal(editor.text, "<english:hello> ");
});

test("after a paste, the next word typed is converted from its first letter", () => {
  const { editor } = marked("english");
  editor.replace(0, 0, "ನಮಸ್ಕಾರ ", "insertFromPaste");
  editor.type("hello");
  assert.equal(editor.text, "ನಮಸ್ಕಾರ <english:hello>");
});

test("a word replaced by something that is not letters ends cleanly, with its highlight cleared", () => {
  const editor = new FakeEditor();
  const ranges = [];
  const done = [];
  const c = new Composer(editor, (latin) => `<${latin}>`, { onComposing: (r) => ranges.push(r), onDone: (w) => done.push(w.latin) });
  editor.onEdit = (edit, after, type) => c.handle(edit, after, type);
  c.setMode("english");
  editor.type("dont");
  editor.replace(0, editor.text.length, "don't", "insertCompositionText");
  assert.equal(editor.text, "don't");
  assert.deepEqual(ranges.at(-1), []);
  assert.equal(done.length, 1);
  assert.equal(c.current, null);
});

test("a no-break space the browser swaps for a space is not an edit, so the next letter starts a word", () => {
  assert.deepEqual(diff("ಹಿ ", "ಹಿ t", 4), { start: 3, oldEnd: 3, newEnd: 4 });
  const { editor } = marked("english");
  editor.text = "ಹಿ ";
  editor.caret = 3;
  editor.replace(2, 3, " t", "insertText");
  assert.equal(editor.text, "ಹಿ <english:t>");
});

test("a word typed right before Kannada text ends in a ZWNJ while its rendering ends in a virama, and in nothing after", () => {
  const editor = new FakeEditor();
  const table = { h: "ಹ್", ho: "ಹೊ", hos: "ಹೊಸ್", hosa: "ಹೊಸ" };
  const c = new Composer(editor, (latin) => table[latin] ?? `<${latin}>`, { onComposing: () => {} });
  editor.onEdit = (edit, after, type) => c.handle(edit, after, type);
  c.setMode("english");
  editor.text = "ನಮಸ್ಕಾರ ಕನ್ನಡ";
  editor.caret = 8;
  editor.type("h");
  assert.equal(editor.text, "ನಮಸ್ಕಾರ ಹ್\u200Cಕನ್ನಡ", "the virama cannot join ಕ");
  assert.equal(editor.caret, 11, "the caret is after the ZWNJ, at the word's end");
  editor.type("o");
  assert.equal(editor.text, "ನಮಸ್ಕಾರ ಹೊಕನ್ನಡ", "a vowel ends the word, so nothing is added");
  editor.type("s");
  assert.equal(editor.text, "ನಮಸ್ಕಾರ ಹೊಸ್\u200Cಕನ್ನಡ");
  editor.type("a ");
  assert.equal(editor.text, "ನಮಸ್ಕಾರ ಹೊಸ ಕನ್ನಡ");
  const end = new FakeEditor();
  const e = new Composer(end, (latin) => table[latin] ?? `<${latin}>`, { onComposing: () => {} });
  end.onEdit = (edit, after, type) => e.handle(edit, after, type);
  e.setMode("english");
  end.type("h");
  assert.equal(end.text, "ಹ್", "at the end of the text nothing follows, so no ZWNJ");
});

test("letters typed over a selection start a word in its place", () => {
  const { editor } = marked("english");
  editor.text = "abc";
  editor.replace(0, 3, "n", "insertText");
  editor.type("u");
  assert.equal(editor.text, "<english:nu>");
});

test("a ZWNJ stays only before a Kannada letter, in typed words and chosen suggestions", () => {
  const table = { h: "ಹ್", hos: "ಹೊಸ್", hosa: "ಹೊಸ" };
  const make = (text, caret) => {
    const editor = new FakeEditor();
    const c = new Composer(editor, (latin) => table[latin] ?? `<${latin}>`, { onComposing: () => {} });
    editor.onEdit = (edit, after, type) => c.handle(edit, after, type);
    c.setMode("english");
    editor.text = text;
    editor.caret = caret;
    return { editor, c };
  };
  const spaced = make("ಕನ್ನಡ", 0);
  spaced.editor.type("h ");
  assert.equal(spaced.editor.text, "ಹ್ ಕನ್ನಡ", "before a typed space the ZWNJ goes");
  const left = make("ಕನ್ನಡ", 0);
  left.editor.type("h");
  left.c.commit();
  assert.equal(left.editor.text, "ಹ್‌ಕನ್ನಡ", "ended right before Kannada, it keeps its visible virama");
  const chosen = make("ಕನ್ನಡ", 0);
  chosen.editor.type("hosa");
  chosen.c.respell("ಹೊಸ್");
  assert.equal(chosen.editor.text, "ಹೊಸ್‌ಕನ್ನಡ", "a chosen suggestion that ends in a virama gets the ZWNJ too");
  chosen.c.respell("ಹೊಸ");
  assert.equal(chosen.editor.text, "ಹೊಸಕನ್ನಡ");
  const moved = make("ನಮ ಕನ್ನಡ", 3);
  moved.editor.type("h");
  moved.editor.replace(0, 0, "XY", "insertFromPaste");
  assert.equal(moved.editor.text, "XYನಮ ಹ್‌ಕನ್ನಡ", "a paste before the word removes nothing");
});

test("every layout the converter reports has a name in both languages", async () => {
  const { EDITOR_STRINGS } = await import("../src/i18n/editor.ts");
  for (const lang of ["en", "kn"]) {
    for (const id of ["nudi", "akruti", "kan-eng", "shree-lipi", "nudi-b"]) {
      const name = EDITOR_STRINGS[lang].convert.layouts[id];
      assert.ok(name && name !== id, `${lang} ${id}`);
    }
  }
});

test("short text files with a Word line break or an old end-of-file byte open; a NUL means binary", () => {
  const enc = (s) => new TextEncoder().encode(s);
  assert.equal(notText(enc("ಕನ್ನಡ ನೋಟ್\x1a")), null, "Ctrl-Z at the end of an old DOS file");
  assert.equal(notText(enc("line one\x0bline two")), null, "a vertical tab from Word");
  assert.equal(notText(new Uint8Array([0x41, 0x00, 0x42])), "other");
  assert.equal(notText(new Uint8Array([0x95, 0x0c, 0xa8, 0x0c])), null, "4 bytes with no NUL and form feeds read as text");
  assert.equal(notText(new Uint8Array([0x95, 0x0c, 0x00, 0x0c])), "other", "UTF-16 with no byte order mark has NULs and is refused");
});

test("a Word file opens by its contents whatever its name, and a renamed .doc is named for what it is", async () => {
  const io = { convert: (t) => ({ text: t, unknown: [] }), bestLayout: () => "nudi", decodeWindows1252: () => assert.fail("not text") };
  const docx = await writeDocx("ಕನ್ನಡ ಪುಟ");
  for (const name of ["renamed.doc", "no-extension", "saved.docx"]) {
    assert.equal((await openFile(new File([docx], name), io)).text, "ಕನ್ನಡ ಪುಟ", name);
  }
  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, ...new Array(64).fill(0)]);
  await assert.rejects(openFile(new File([ole], "renamed.docx"), io), (e) => e instanceof NotText && e.kind === "doc");
});

test("HTML saved by the editor and then edited elsewhere is read like any other page", async () => {
  const { DOMParser } = await import("linkedom");
  const saved = globalThis.DOMParser;
  globalThis.DOMParser = DOMParser;
  try {
    const io = { convert: () => assert.fail("nothing to convert"), bestLayout: () => assert.fail("nothing to judge"), decodeWindows1252: () => assert.fail("UTF-8") };
    const page = (body) => `<!doctype html><html><head><meta name="generator" content="kannadi"></head><body>${body}</body></html>`;
    const open = async (body) => (await openFile(new File([page(body)], "edited.html"), io)).text;
    assert.equal(await open("<p>ಒಂದು<br>ಎರಡು</p>"), "ಒಂದು\nಎರಡು");
    assert.equal(await open("<h1>ಶೀರ್ಷಿಕೆ</h1><p>ಪಠ್ಯ</p>"), "ಶೀರ್ಷಿಕೆ\nಪಠ್ಯ");
  } finally {
    globalThis.DOMParser = saved;
  }
});

test("Convert stops on blank text and on text whose every line beyond ASCII is Unicode", () => {
  // Stands in for kannadi's isUnicode: more Kannada characters than Latin-1 glyph codes.
  const unicode = (text: string) =>
    (text.match(/[\u0c80-\u0cff]/g) ?? []).length > (text.match(/[\u0080-\u00ff]/g) ?? []).length;
  assert.equal(convertPlan("", unicode), "empty");
  assert.equal(convertPlan(" \n\t", unicode), "empty");
  assert.equal(convertPlan("ಕನ್ನಡ ನಾಡು\nOffice hours 10 to 5", unicode), "unicode");
  assert.equal(convertPlan("ಕನ್ನಡ ನಾಡು\nPÀ£ÀßqÀ", unicode), "convert");
  // Mostly Unicode as a whole, with a Nudi line: still converted.
  assert.equal(convertPlan("ಕನ್ನಡ ನಾಡು ನುಡಿ ಬಹಳ ಸುಂದರ\nPÀ£Àß", unicode), "convert");
  assert.equal(convertPlan("PÀ£ÀßqÀ", unicode), "convert");
  assert.equal(convertPlan("Office hours", unicode), "convert");
});
