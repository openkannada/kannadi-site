// Tests for the text the home page hands to the editor: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { doneWith, giveText, HANDOFF_KEY, handOver, htmlFor, takeText } from "../src/lib/handoff.ts";

const store = () => {
  const items = new Map();
  return { items, getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, String(v)), removeItem: (k) => items.delete(k) };
};

test("text from the home page, with its HTML, stays until the editor has pasted it, then goes", () => {
  const s = store();
  assert.equal(giveText(s, "PÀ£ÀßqÀ", "<p style='font-family:\"BRH Kannada\"'>PÀ£ÀßqÀ</p>"), true);
  assert.deepEqual(takeText(s), { text: "PÀ£ÀßqÀ", html: "<p style='font-family:\"BRH Kannada\"'>PÀ£ÀßqÀ</p>" });
  assert.ok(s.items.has(HANDOFF_KEY), "a reload before the paste finishes still has it");
  doneWith(s);
  assert.equal(takeText(s), null, "after the paste a reload inserts nothing");
  assert.equal(giveText(s, "plain"), true);
  assert.deepEqual(takeText(s), { text: "plain", html: "" });
});

test("blank text is not handed over, and a store that throws, is missing or holds junk hands over nothing", () => {
  const s = store();
  assert.equal(giveText(s, "  \n"), false);
  assert.equal(s.items.size, 0);
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(giveText(broken, "x"), false);
  assert.equal(takeText(broken), null);
  doneWith(broken);
  assert.equal(giveText(null, "x"), false);
  assert.equal(takeText(null), null);
  s.items.set(HANDOFF_KEY, "not json");
  assert.equal(takeText(s), null);
});

test("the editor removes the text only after pasting it, and the home page never puts it in the URL", () => {
  const main = readFileSync(new URL("../src/editor/main.ts", import.meta.url), "utf8");
  assert.match(main, /paste\(handed\.html, handed\.text\)[\s\S]*?\.finally\(\(\) => \{\s*save\(\);\s*doneWith\(store\);/);
  const home = readFileSync(new URL("../src/layouts/HomePage.astro", import.meta.url), "utf8");
  assert.match(home, /if \(handOver\(sessionStore\(\), field\.value, htmlFor\(field\.value, pasted\)\)\)/, "it leaves the page only when the text was kept");
  assert.doesNotMatch(home, /searchParams|[?&]text=|location\.hash/);
});

test("pasted HTML goes along while the field holds the pasted text, Windows line endings included", () => {
  const html = "<p>x</p>";
  assert.equal(htmlFor("ಒಂದು\nಎರಡು", { html, plain: "ಒಂದು\r\nಎರಡು\r\n" }), html, "a Windows clipboard ends lines with CRLF");
  assert.equal(htmlFor("ಒಂದು ಬದಲು", { html, plain: "ಒಂದು" }), "", "edited after the paste, the HTML no longer matches");
  assert.equal(htmlFor("typed", { html: "", plain: "" }), "");
});

test("text whose HTML does not fit the store is handed over without it", () => {
  const items = new Map();
  const small = { getItem: (k) => items.get(k) ?? null, setItem: (k, v) => { if (String(v).length > 60) throw new Error("quota"); items.set(k, String(v)); }, removeItem: (k) => items.delete(k) };
  assert.equal(handOver(small, "PÀ£ÀßqÀ", "<p>" + "x".repeat(200) + "</p>"), true);
  assert.deepEqual(takeText(small), { text: "PÀ£ÀßqÀ", html: "" });
});
