// Tests for likely typos in the problems list, with a stand-in editor: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { Issues, type IssuesKannadi } from "../src/editor/issues.ts";
import type { Typo } from "../src/editor/kannadi.ts";
import type { Edit } from "../src/editor/text.ts";

const { document, Event: DomEvent } = parseHTML("<html><body><ul id=list></ul><p id=more></p><div id=pop hidden></div></body></html>");
Object.assign(globalThis, { document, matchMedia: () => ({ matches: false }), innerWidth: 1024, innerHeight: 768 });

// The library's ra + vocalic R rule, for a base ra only; kannadi's own tests cover the rule.
function typos(text: string): Typo[] {
  const out: Typo[] = [];
  for (let i = text.indexOf("ರೃ"); i !== -1; i = text.indexOf("ರೃ", i + 1)) {
    if (text[i - 1] !== "್") out.push({ start: i, end: i + 2, replacement: "ಋ", rule: "ra-vocalic-r" });
  }
  return out;
}

const kannadi: IssuesKannadi = { malformed: () => [], fixes: () => [], typos, transliterate: (t) => t };

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
  const issues = new Issues(editor as never, kannadi, {
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

test("the fix writes the vowel letter and clears the mark", () => {
  const { editor, issues, pop, press } = setup("ನೈರೃತ್ಯ");
  issues.popover(issues.items()[0]!, false);
  assert.match(pop.textContent ?? "", /ನೈಋತ್ಯ/);
  assert.match(pop.textContent ?? "", /letter ಋ/);
  press("Use the usual spelling");
  assert.equal(editor.text, "ನೈಋತ್ಯ");
  assert.equal(issues.total, 0);
});

test("a kept spelling stays unmarked through edits elsewhere", () => {
  const { editor, issues, press } = setup("ನೈರೃತ್ಯ ರೃ");
  press("Keep it");
  assert.equal(issues.total, 1);
  assert.deepEqual(issues.items(), [{ kind: "typo", start: 8, end: 10 }]);
  editor.replace(0, 0, "ಆ ");
  issues.check();
  assert.deepEqual(issues.items(), [{ kind: "typo", start: 10, end: 12 }]);
  editor.replace(10, 12, "ರೃ");
  issues.check();
  assert.equal(issues.total, 1, "retyping the second one marks it again");
});

test("spellings kept in a saved draft stay unmarked when it is restored", () => {
  const { issues } = setup("ನೈರೃತ್ಯ ರೃ");
  issues.keep([8, 3]);
  assert.deepEqual(issues.kept, [{ offset: 8, glyph: "ರೃ" }]);
  assert.deepEqual(issues.items(), [{ kind: "typo", start: 2, end: 4 }]);
});
