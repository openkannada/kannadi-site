// Tests for the alphabet data behind the reference pages: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { CONSONANTS, DIGITS, MANNERS, SIGN_NAMES, SIGNS, STRUCTURED, UNSTRUCTURED, VOWELS, YOGAVAHAS } from "../src/content/letters.ts";
import { HOME, PAGES } from "../src/content/pages.ts";
import { jsonLd } from "../src/lib/seo.ts";

test("the alphabet has the 49 letters the page says: 13 vowels, 2 yogavahas, 34 consonants", () => {
  assert.equal(VOWELS.length, 13);
  assert.equal(YOGAVAHAS.length, 2);
  assert.equal(CONSONANTS.length, 34);
  assert.equal(VOWELS.length + YOGAVAHAS.length + CONSONANTS.length, 49);
  assert.equal(new Set([...VOWELS, ...CONSONANTS]).size, 47);
  const alphabet = PAGES.find((p) => p.slug === "kannada-alphabet");
  assert.match(alphabet.intro, /49 letters/);
});

test("the structured consonants are 5 groups of 5, and the rest are 9", () => {
  assert.equal(STRUCTURED.length, 5);
  for (const g of STRUCTURED) assert.equal(g.letters.length, MANNERS.length);
  assert.equal(UNSTRUCTURED.length, 9);
  assert.equal(CONSONANTS[0], "ಕ");
  assert.equal(CONSONANTS.at(-1), "ಳ");
});

test("the kagunita has 16 columns and digits run 0 to 9", () => {
  assert.equal(SIGNS.length, 16);
  assert.equal(SIGNS[0], "");
  assert.equal(SIGNS.at(-1), "್");
  assert.equal(SIGN_NAMES.length, SIGNS.length, "every column has a name for screen readers");
  assert.equal(DIGITS.length, 10);
  assert.equal(DIGITS.map((d) => d.codePointAt(0) - 0x0ce6).join(""), "0123456789");
});

test("reference pages describe a learning resource and no editor", () => {
  for (const page of PAGES.filter((p) => p.kind === "reference")) {
    const types = jsonLd(page, null, HOME)["@graph"].map((n) => n["@type"]);
    assert.ok(types.includes("LearningResource"), page.slug);
    assert.ok(!types.includes("WebApplication") && !types.includes("HowTo"), page.slug);
  }
});
