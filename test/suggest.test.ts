// Tests for Kannada word suggestions from English letters: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { parseWords, SHOWN, Suggester } from "../src/editor/suggest.ts";
import { initSync, latinKey, phoneticKey, transliterate } from "../src/editor/wasm/kannadi_wasm.js";

initSync({ module: readFileSync(new URL("../src/editor/wasm/kannadi_wasm_bg.wasm", import.meta.url)) });

const k = {
  phoneticKey: (w) => phoneticKey(w, "medium"),
  latinKey: (l) => latinKey(l, "medium"),
  strict: (l) => transliterate(l, "baraha", "kannada"),
};
const WORDS = ["ಮತ್ತು", "ಕನ್ನಡ", "ಮಧು", "ನಮಸ್ಕಾರ", "ಮಾಡು", "ಇಲ್ಲಿ", "ಬೆಂಗಳೂರು", "ಕಾಣದ", "ಮದ್ದು", "ಇಲಿ", "ಕನ್ನಡಿಗ", "ಕನ್ನಡದ"];
const make = (picks) => Suggester.create(k, WORDS, picks, async () => {});

test("loose English letters find the Kannada word, commoner words first", async () => {
  const s = await make();
  assert.equal(s.suggest("namaskara")[0], "ನಮಸ್ಕಾರ");
  assert.equal(s.suggest("bengaluru")[0], "ಬೆಂಗಳೂರು");
  assert.deepEqual(s.suggest("maadu").slice(0, 3), ["ಮಧು", "ಮಾಡು", "ಮದ್ದು"]);
  assert.deepEqual(s.suggest("illi").slice(0, 2), ["ಇಲ್ಲಿ", "ಇಲಿ"]);
});

test("the strict Baraha spelling is offered, by rank when it is a known word", async () => {
  const s = await make();
  // ಮಾಡು is the strict spelling of maaDu and ranks after ಮಧು.
  assert.deepEqual(s.suggest("maaDu").slice(0, 2), ["ಮಧು", "ಮಾಡು"]);
  // An unknown word still gets its strict spelling.
  assert.deepEqual(s.suggest("dhanyavaada"), ["ಧನ್ಯವಾದ"]);
});

test("a short beginning also offers longer words that start the same way", async () => {
  const s = await make();
  const kan = s.suggest("kanna");
  assert.ok(kan.includes("ಕನ್ನಡ") && kan.includes("ಕನ್ನಡಿಗ"), kan.join(" "));
  assert.ok(kan.length <= SHOWN);
  assert.deepEqual(s.suggest(""), []);
});

test("a word chosen before comes first for the same letters, and choices are bounded", async () => {
  const s = await make();
  s.remember("Maadu", "ಮಾಡು");
  assert.equal(s.suggest("maadu")[0], "ಮಾಡು");
  const again = await make(s.remembered());
  assert.equal(again.suggest("MAADU")[0], "ಮಾಡು");
  for (let i = 0; i < 600; i++) again.remember(`w${i}`, "ಕ");
  assert.equal(again.remembered().length, 500);
  assert.equal(again.remembered()[0][0], "w100");
});

test("the word list file reads in order of frequency, skipping its header", () => {
  assert.deepEqual(parseWords("# header\nಮತ್ತು\t10\nಈ\t5\n\n"), ["ಮತ್ತು", "ಈ"]);
  const shipped = parseWords(readFileSync(new URL("../data/words.tsv", import.meta.url), "utf8"));
  assert.equal(shipped.length, 30000);
  assert.equal(shipped[0], "ಮತ್ತು");
  assert.equal(new Set(shipped).size, shipped.length);
});

test("with the shipped list, short common words and the final-a spelling come before long forms", async () => {
  const words = parseWords(readFileSync(new URL("../data/words.tsv", import.meta.url), "utf8"));
  const s = await Suggester.create({ ...k, strict: (l) => transliterate(l.toLowerCase(), "baraha", "kannada") }, words, [], async () => {});
  const til = s.suggest("til");
  assert.equal(til[0], "ತಿಲ್");
  assert.ok(til.includes("ತಿಳಿ") && til.includes("ತಿಲ"), til.join(" "));
  assert.ok(til.indexOf("ತಿಳಿ") < til.indexOf("ತಿಳಿದು"), til.join(" "));
  assert.ok(!til.includes("ತಿಳಿದುಬರುತ್ತದೆ"), til.join(" "));
  assert.ok(s.suggest("hal").includes("ಹಾಲು"), s.suggest("hal").join(" "));
  // Whole words typed in full keep their best spelling first.
  for (const [typed, want] of [["namaskara", "ನಮಸ್ಕಾರ"], ["mane", "ಮನೆ"], ["beku", "ಬೇಕು"], ["bengaluru", "ಬೆಂಗಳೂರು"]]) assert.equal(s.suggest(typed)[0], want, typed);
});
