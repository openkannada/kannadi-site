// Tests for likely typos in the problems list, with the real library and a stand-in editor: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { Issues, syllableAt } from "../src/editor/issues.ts";
import { fixes, malformed, transliterate, typos } from "../src/editor/kannadi.ts";
import type { Edit } from "../src/editor/text.ts";
import { initSync } from "../src/editor/wasm/kannadi_wasm.js";

initSync({ module: readFileSync(new URL("../src/editor/wasm/kannadi_wasm_bg.wasm", import.meta.url)) });

const { document, Event: DomEvent } = parseHTML("<html><body><ul id=list></ul><p id=more></p><div id=pop hidden></div></body></html>");
Object.assign(globalThis, { document, matchMedia: () => ({ matches: false }), innerWidth: 1024, innerHeight: 768 });

class StandInEditor {
  text: string;
  marks: Record<string, number[]> = {};
  el = { focus() {} };
  issues!: Issues;
  constructor(text: string) {
    this.text = text;
  }
  highlight(name: string, ranges: ArrayLike<number>) {
    this.marks[name] = Array.from(ranges);
  }
  select() {}
  focus() {}
  scrollTo() {}
  rect() {
    return { left: 0, top: 0, bottom: 0 };
  }
  replace(start: number, end: number, insert: string) {
    const edit: Edit = { start, oldEnd: end, newEnd: start + insert.length };
    this.text = this.text.slice(0, start) + insert + this.text.slice(end);
    this.issues.edited(edit, this.text);
  }
}

function setup(text: string) {
  const editor = new StandInEditor(text);
  const pop = document.getElementById("pop")!;
  const issues = new Issues(editor as never, { malformed, fixes, typos, transliterate }, {
    list: document.getElementById("list")!,
    more: document.getElementById("more")!,
    popover: pop,
    onChange: () => {},
    scheme: () => "baraha",
  });
  editor.issues = issues;
  issues.check();
  const press = (label: string) => {
    issues.popover(issues.items()[0]!, false);
    const button = [...pop.querySelectorAll("button")].find((b) => b.textContent?.includes(label));
    assert.ok(button, `no "${label}" button`);
    button.dispatchEvent(new DomEvent("click"));
  };
  return { editor, issues, pop, press };
}

test("ra with the vocalic R sign is listed as a likely typo with a soft mark", () => {
  const { editor, issues } = setup("ದಿಕ್ಕು ನೈರೃತ್ಯ");
  assert.equal(issues.total, 1);
  assert.deepEqual(issues.items(), [{ kind: "typo", start: 9, end: 11 }]);
  assert.deepEqual(editor.marks.typo, [9, 11]);
  assert.deepEqual(editor.marks.malformed, []);
  assert.match(document.getElementById("list")!.textContent ?? "", /Likely typo/);
});

test("a ra joined to a consonant is not a typo", () => {
  for (const text of ["ಕ್‌ರೃ", "ಕ್‍ರೃ", "ಕ್ರೃ"]) assert.equal(setup(text).issues.total, 0, text);
});

test("the fix writes the vowel letter and clears the mark", () => {
  const { editor, issues, pop, press } = setup("ನೈರೃತ್ಯ");
  issues.popover(issues.items()[0]!, false);
  assert.match(pop.textContent ?? "", /ನೈಋತ್ಯ/);
  assert.match(pop.textContent ?? "", /letter ಋ/);
  press("Use ಋ");
  assert.equal(editor.text, "ನೈಋತ್ಯ");
  assert.equal(issues.total, 0);
});

test("ra with a virama before the vowel letter ಋ is a likely typo, and the fix keeps ಋ", () => {
  const { editor, issues, pop, press } = setup("ನೈರ್ಋತ್ಯ");
  assert.deepEqual(issues.items(), [{ kind: "typo", start: 2, end: 5 }]);
  issues.popover(issues.items()[0]!, false);
  assert.match(pop.textContent ?? "", /single letter ಋ/);
  press("Use ಋ");
  assert.equal(editor.text, "ನೈಋತ್ಯ");
  assert.equal(issues.total, 0);
});

test("ra with a virama before ಋ can be kept as typed", () => {
  const { editor, issues, press } = setup("ನೈರ್ಋತ್ಯ");
  press("Keep it");
  assert.equal(editor.text, "ನೈರ್ಋತ್ಯ");
  assert.equal(issues.total, 0);
  editor.replace(0, 0, "ಆ ");
  issues.check();
  assert.equal(issues.total, 0);
});

test("ra with a virama before other vowel letters is not a typo", () => {
  for (const text of ["ಆರ್ಎನ್ಎ", "ಕುರ್ಆನ್", "ಪುನರ್ಏಕೀಕರಣ", "ನಿರ್\u200cಋತಿ"]) assert.equal(setup(text).issues.total, 0, text);
});

test("a kept spelling stays unmarked through edits elsewhere, and is marked again when retyped", () => {
  const { editor, issues, press } = setup("ನೈರೃತ್ಯ ರೃ");
  press("Keep it");
  assert.deepEqual(issues.items(), [{ kind: "typo", start: 8, end: 10 }]);
  editor.replace(0, 0, "ಆ ");
  issues.check();
  assert.deepEqual(issues.items(), [{ kind: "typo", start: 10, end: 12 }]);
  editor.replace(4, 6, "ರೃ");
  issues.check();
  assert.equal(issues.total, 2);
});

test("spellings kept in a saved draft stay unmarked when it is restored, and a new document starts clean", () => {
  const { editor, issues } = setup("ನೈರೃತ್ಯ ರೃ");
  issues.keep([8, 3]);
  assert.deepEqual(issues.kept, [{ offset: 8, glyph: "ರೃ" }]);
  assert.deepEqual(issues.items(), [{ kind: "typo", start: 2, end: 4 }]);
  issues.clear();
  editor.text = "ನೈರೃತ್ಯ ರೃ";
  issues.check();
  assert.equal(issues.total, 2);
});

test("F8 reaches a malformed sign right after a typo, in both directions", () => {
  const { issues } = setup("ನೈರೃ಼ತ್ಯ");
  const typo = { kind: "typo", start: 2, end: 4 };
  const sign = { kind: "malformed", start: 4, end: 5 };
  assert.deepEqual(issues.items(), [typo, sign]);
  assert.deepEqual(issues.next(typo.start, typo.end, 1), sign);
  assert.deepEqual(issues.next(sign.start, sign.end, 1), typo);
  assert.deepEqual(issues.next(sign.start, sign.end, -1), typo);
  assert.deepEqual(issues.next(typo.start, typo.end, -1), sign);
  assert.deepEqual(issues.next(0, 0, 1), typo);
});

test("a caret at the edge of a syllable finds the mark inside it", () => {
  // ಕ್ಾ is 1 syllable at 6..9; a tap puts the caret at 6 or 9, never at 8 where the mark starts.
  assert.deepEqual(syllableAt("ಕನ್ನಡ ಕ್ಾ", 6), { start: 6, end: 9 });
  assert.deepEqual(syllableAt("ab\ncd", 2), { start: 2, end: 2 });
});
