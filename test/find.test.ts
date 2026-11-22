// Tests for Kannada find and replace: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { equivalentPattern, findQuery } from "../src/editor/find.ts";

const matches = (query: string, text: string, aksharas = false) => [...text.matchAll(new RegExp(equivalentPattern(query, { aksharas }), "gu"))].map((m) => [m.index, m[0]]);

test("a query matches every spelling Unicode treats as the same", () => {
  // ೊ is also ೆ followed by ೂ, and ೋ is ೊ or ೆ ೂ followed by ೕ.
  assert.deepEqual(matches("ಕೊ", "ಕೊ ಕೊ"), [[0, "ಕೊ"], [3, "ಕೊ"]]);
  assert.deepEqual(matches("ಕೋ", "ಕೋ ಕೋ ಕೋ").length, 3);
  // A query typed in the decomposed form finds the composed one.
  assert.deepEqual(matches("ಕೊ", "ಕೊ").length, 1);
  assert.deepEqual(matches("ಕೀ", "ಕೀ ಕೀ").length, 2);
});

test("whole aksharas leave out a letter with a sign after it, or inside a conjunct", () => {
  assert.deepEqual(matches("ಕ", "ಕ ಕಾ ಕ್ಕ ಸ್ಕ", true), [[0, "ಕ"]]);
  assert.deepEqual(matches("ಕ", "ಕ ಕಾ ಕ್ಕ ಸ್ಕ").length, 5);
  assert.deepEqual(matches("ಕ್", "ಕ್ ಕ್ಕ", true), [[0, "ಕ್"]]);
  // An akshara boundary is not a word boundary: ನಾಡು starts ನಾಡುಗಳು, and ನಾಡ, missing its ು, matches neither.
  assert.deepEqual(matches("ನಾಡು", "ನಾಡು ನಾಡುಗಳು", true), [[0, "ನಾಡು"], [5, "ನಾಡು"]]);
  assert.deepEqual(matches("ನಾಡ", "ನಾಡು ನಾಡುಗಳು", true), []);
});

test("characters that mean something in a pattern, and $ in the replacement, are taken as typed", () => {
  assert.deepEqual(matches("1.5 (x)", "1.5 (x) 105 x"), [[0, "1.5 (x)"]]);
  assert.equal(findQuery("a", "$1 $&", { aksharas: false, caseSensitive: false }).replace, "$$1 $$&");
});
