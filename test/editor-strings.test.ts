// Tests for the editor's dictionary and the helpers that fill it in: npm test
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { count, fmt, nodes, parts, pick, S } from "../src/editor/strings.ts";
import { EDITOR_EN } from "../src/i18n/editor.en.ts";

test("with no page, the editor reads the English dictionary", () => {
  assert.equal(globalThis.document, undefined);
  assert.equal(S, EDITOR_EN);
});

test("counts and slots give the sentences the editor always showed", () => {
  assert.equal(count(1, S.problems.chipLabel), "1 problem to check");
  assert.equal(count(3, S.problems.chipLabel), "3 problems to check");
  assert.equal(count(120000, S.counts.characters), "1,20,000 characters");
  assert.equal(count(1, S.counts.aksharas), "1 akshara");
  assert.equal(count(0, S.counts.words), "0 words");
  assert.equal(fmt(S.files.saved, { name: "kannada.docx" }), "Saved kannada.docx to your downloads.");
  assert.equal(fmt(S.files.openFailed, { name: "a.docx", error: "" }).trim(), "Could not open a.docx.");
  assert.equal(
    count(1234, S.convert.report, { what: fmt(S.convert.opened, { name: "a.html" }), from: S.convert.layouts.nudi }),
    "Opened a.html: 1,234 characters converted from Nudi or Baraha.",
  );
  assert.equal(count(1, S.convert.glyphs), "1 glyph to check.");
  assert.equal(fmt(S.convert.andFrom, { first: "Nudi or Baraha", second: "Akruti" }), "Nudi or Baraha, and from Akruti");
  assert.equal(fmt(S.suggest.choice, { word: "ನಮಸ್ಕಾರ", i: 2, n: 5 }), "ನಮಸ್ಕಾರ, 2 of 5");
});

test("a slot value that looks like a slot is left as it is", () => {
  assert.equal(count(2, S.convert.report, { what: "Opened {n}.txt", from: "Akruti" }), "Opened {n}.txt: 2 characters converted from Akruti.");
});

test("pick keeps the {n} slot open for the page to fill with an element", () => {
  assert.equal(pick(1, S.counts.words), "{n} word");
  assert.equal(pick(0, S.counts.words, "en"), "{n} words");
  assert.equal(pick(0, S.counts.words, "kn"), "{n} word");
});

test("templates split into text and slots, and slots become nodes", () => {
  assert.deepEqual(parts(S.shortcuts.mac), [
    { text: "On a Mac, use " },
    { slot: "cmd" },
    { text: " for " },
    { slot: "ctrl" },
    { text: " and " },
    { slot: "option" },
    { text: " for " },
    { slot: "alt" },
    { text: "." },
  ]);
  assert.deepEqual(parts("{n} words"), [{ slot: "n" }, { text: " words" }]);
  const sample = { nodeType: 1 } as unknown as Node;
  assert.deepEqual(nodes(S.fix.title, { problem: "Unknown glyph", sample, codes: "U+00C0" }), ["Unknown glyph ", sample, " U+00C0"]);
  assert.deepEqual(nodes(S.fix.use, { letter: sample }), ["Use ", sample]);
});

// Literals that are not words for a person: file formats, class names and messages for developers or agents.
const NOT_FOR_PEOPLE: Record<string, (literal: string) => boolean> = {
  // Markup of the DOCX files the editor writes, and Word's built-in style names.
  "docx.ts": (l) => l.startsWith("`<") || ['"heading 1"', '"heading 2"', '"intense quote"'].includes(l),
  // Markup of the HTML files the editor writes.
  "files.ts": (l) => l.startsWith("`<"),
  // Class names and a selector.
  "issues.ts": (l) => /^`(issue issue|pop-sample pop-sample)-\$\{item\.kind\}`$/.test(l),
  // A selector, a missing element, a failed word list fetch that retries silently, and a console warning.
  "main.ts": (l) => ['".pop-actions button"', "`#${id} is missing`", "`word list: HTTP ${res.status}`", '"WebMCP: the tools did not load"'].includes(l),
  // A heading's tag name, a link's rel and a schema content expression.
  "rich.ts": (l) => ['`h${n.attrs["level"] as number}`', '"noopener noreferrer"', '"paragraph block*"'].includes(l),
  // WebMCP tool descriptions and input errors are read by AI agents, in English, whatever the page's language.
  "tools.ts": () => true,
};

test("no editor module keeps an English sentence of its own", () => {
  const found: string[] = [];
  for (const name of readdirSync("src/editor").filter((n) => n.endsWith(".ts") && n !== "strings.ts")) {
    const source = readFileSync(join("src/editor", name), "utf8").replace(/^\s*(\/\/|\*|\/\*).*$/gm, "");
    const literals = source.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? [];
    for (const l of literals) {
      if (/\b[a-z]+ [a-z]+\b/.test(l) && !NOT_FOR_PEOPLE[name]?.(l)) found.push(`${name}: ${l}`);
    }
  }
  assert.deepEqual(found, []);
});
