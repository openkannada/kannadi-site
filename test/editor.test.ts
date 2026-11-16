// Tests for the editor modules that need no WebAssembly or DOM: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { Composer } from "../src/editor/compose.ts";
import { readDocx, writeDocx } from "../src/editor/docx.ts";
import { DocEditor } from "../src/editor/editor.ts";
import { htmlSegments, pasted } from "../src/editor/files.ts";
import {
  codePoints,
  countWords,
  diff,
  escapeMarkup,
  isLegacyFont,
  joinSegments,
  legacyLayout,
  resolveAuto,
  looksLegacy,
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
  for (const text of ["    indented code\n\n\n\nend ", "ಕನ್ನಡ  ನಾಡು\r\n\t", " "]) {
    assert.deepEqual(pasted("", text, { convert, bestLayout }), { text, unknown: [], converted: 0, layouts: [] });
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
