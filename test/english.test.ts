// Tests for typing in plain English letters with suggestions: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { EnglishTyping } from "../src/editor/english.ts";
import { initSync, latinKey, phoneticKey, transliterate } from "../src/editor/wasm/kannadi_wasm.js";

initSync({ module: readFileSync(new URL("../src/editor/wasm/kannadi_wasm_bg.wasm", import.meta.url)) });

const WORDS = "# test\nಮಧು\t9\nಮಾಡು\t8\nಮದ್ದು\t7\nನಮಸ್ಕಾರ\t6\n";

/** A document with 1 word being typed at its end, and the pieces the class talks to. */
function harness({ load = async () => WORDS, stored = [] } = {}) {
  const doc = { text: "", word: null };
  const picks = { saved: stored, read: () => picks.saved, write: (p) => (picks.saved = p) };
  const strip = { shown: null, show: (w, c, i) => (strip.shown = { c, i }), select: (i) => (strip.shown.i = i), hide: () => (strip.shown = null) };
  const english = new EnglishTyping({
    kannadi: {
      phoneticKey: (w) => phoneticKey(w, "medium"),
      latinKey: (l) => latinKey(l, "medium"),
      transliterate: (l) => transliterate(l, "baraha", "kannada"),
    },
    loadWords: load,
    picks,
    strip,
    text: () => doc.text,
    replace: (s, e, t) => {
      doc.text = doc.text.slice(0, s) + t + doc.text.slice(e);
      doc.caret = s + t.length;
    },
    caret: () => doc.caret ?? doc.text.length,
    select: (at) => (doc.caret = at),
    announce: () => {},
  });
  const write = (kannada) => {
    doc.text = doc.text.slice(0, doc.word.start) + kannada;
    doc.word.end = doc.word.start + kannada.length;
  };
  const composer = {
    get current() {
      return doc.word && { ...doc.word };
    },
    respell: write,
    choose: (kannada) => {
      write(kannada);
      finish(true);
    },
  };
  const finish = (kept) => {
    const w = composer.current;
    doc.word = null;
    english.done(w, kept);
  };
  english.attach(composer);
  /** Types `latin` as 1 word at the end of the document. */
  const type = (latin) => {
    doc.word = { latin, start: doc.text.length, end: doc.text.length };
    write(english.spell(latin));
    english.typing(composer.current);
  };
  return { doc, english, picks, strip, type, finish };
}

test("a pick kept with space is remembered; one put back with Esc or undone is not", async () => {
  const h = harness();
  await h.english.prepare();
  h.type("maadu");
  assert.deepEqual(h.strip.shown.c.slice(0, 3), ["ಮಧು", "ಮಾಡು", "ಮದ್ದು"]);
  h.english.cycle(false);
  assert.equal(h.doc.text, "ಮಾಡು");
  h.finish(false);
  assert.deepEqual(h.picks.saved, []);

  h.doc.text = "";
  h.type("maadu");
  h.english.cycle(false);
  h.doc.text = "maadu";
  h.finish(true);
  assert.deepEqual(h.picks.saved, [], "an undone pick is not kept");

  h.doc.text = "";
  h.type("maadu");
  h.english.cycle(false);
  h.finish(true);
  assert.deepEqual(h.picks.saved, [["maadu", "ಮಾಡು"]]);
});

test("a finished word keeps its alternatives until the next edit, and a tap swaps it", async () => {
  const h = harness();
  await h.english.prepare();
  h.type("maadu");
  h.finish(true);
  assert.ok(h.strip.shown, "the strip stays for the finished word");
  h.doc.text += " ";
  h.doc.caret = h.doc.text.length;
  h.english.pick(2);
  assert.equal(h.doc.text, "ಮದ್ದು ");
  assert.equal(h.doc.caret, h.doc.text.length, "the caret stays after the space");
  assert.equal(h.strip.shown, null);
  assert.deepEqual(h.picks.saved, [["maadu", "ಮದ್ದು"]]);

  h.type("maadu");
  h.finish(true);
  h.english.edited();
  assert.equal(h.strip.shown, null);
});

test("a word emptied with Backspace remembers nothing", async () => {
  const h = harness();
  await h.english.prepare();
  h.type("maadu");
  h.english.cycle(false);
  h.doc.word.latin = "";
  h.finish(true);
  assert.deepEqual(h.picks.saved, []);
});

test("capital letters do not change the strict spelling in English mode", () => {
  const h = harness();
  assert.equal(h.english.spell("Namaskara"), h.english.spell("namaskara"));
  assert.equal(h.english.spell("NAANU"), "ನಾನು");
});

test("a failed word list is not fetched again for 30 seconds, and bad stored picks are ignored", async () => {
  let calls = 0;
  const h = harness({
    load: async () => {
      calls++;
      throw new Error("offline");
    },
  });
  await h.english.prepare(0);
  assert.equal(h.english.prepare(), null);
  h.english.spell("maadu");
  assert.equal(calls, 1);
  assert.equal(h.english.ready, false);
  await h.english.prepare(Date.now() + 31_000);
  assert.equal(calls, 2);

  const bad = harness({ stored: { not: "a list" } });
  await bad.english.prepare();
  assert.equal(bad.english.ready, true);
});

test("the finished word's alternatives go when the caret moves away from it", async () => {
  const h = harness();
  await h.english.prepare();
  h.type("maadu");
  h.finish(true);
  h.english.caretMoved(h.doc.text.length + 1);
  assert.ok(h.strip.shown);
  h.english.caretMoved(0);
  assert.equal(h.strip.shown, null);
});
