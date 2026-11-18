// Tests for the text the home page hands to the editor: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { giveText, HANDOFF_KEY, takeText } from "../src/lib/handoff.ts";

const store = () => {
  const items = new Map();
  return { items, getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, String(v)), removeItem: (k) => items.delete(k) };
};

test("text from the home page is read once by the editor and then removed", () => {
  const s = store();
  assert.equal(giveText(s, "PÀ£ÀßqÀ"), true);
  assert.equal(s.items.get(HANDOFF_KEY), "PÀ£ÀßqÀ");
  assert.equal(takeText(s), "PÀ£ÀßqÀ");
  assert.equal(s.items.has(HANDOFF_KEY), false);
  assert.equal(takeText(s), null, "a reload inserts nothing");
});

test("blank text is not handed over, and a store that throws or is missing hands over nothing", () => {
  const s = store();
  assert.equal(giveText(s, "  \n"), false);
  assert.equal(s.items.size, 0);
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); }, removeItem() {} };
  assert.equal(giveText(broken, "x"), false);
  assert.equal(takeText(broken), null);
  assert.equal(giveText(null, "x"), false);
  assert.equal(takeText(null), null);
});

test("the editor inserts the text through the paste path, and the home page writes it to sessionStorage, never the URL", () => {
  const main = readFileSync(new URL("../src/editor/main.ts", import.meta.url), "utf8");
  assert.match(main, /function receive\(\): void \{[\s\S]*?takeText\(sessionStore\(\)\)[\s\S]*?paste\("", text\);/);
  assert.match(main, /restore\(\);\nreceive\(\);/);
  const home = readFileSync(new URL("../src/layouts/HomePage.astro", import.meta.url), "utf8");
  assert.match(home, /giveText\(sessionStore\(\), field\.value\)/);
  assert.doesNotMatch(home, /searchParams|[?&]text=|location\.hash/);
});
