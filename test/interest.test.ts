import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { INTEREST } from "../src/content/interest.ts";
import { type InterestDb, handleInterest, parseSubmission } from "../src/lib/interest.ts";

const GOOD = {
  name: "Asha",
  email: "asha@example.org",
  place: "Mysuru, India",
  link: "https://github.com/asha",
  areas: ["code", "reading"],
  experience: "I maintain a Kannada keyboard app.",
  hours: "5-10",
  kannada: "fluent",
  consent: true,
  website: "",
  turnstile: "token",
  lang: "en",
};

function fakeDb() {
  const rows: unknown[][] = [];
  const db: InterestDb = { prepare: () => ({ bind: (...values) => ({ run: async () => rows.push(values) }) }) };
  return { db, rows };
}
const post = (body: unknown) => new Request("https://openkannada.org/api/interest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const human = (async () => Response.json({ success: true })) as typeof fetch;
const bot = (async () => Response.json({ success: false })) as typeof fetch;

test("the interest form ships closed until the storage and the privacy note are approved", () => {
  assert.equal(INTEREST.open, false);
  const config = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.doesNotMatch(config, /d1_databases/, "no database is bound while the form is closed");
});

test("while closed, every submission is refused before it is read or stored", async () => {
  const { db, rows } = fakeDb();
  const res = await handleInterest(post(GOOD), { DB: db, TURNSTILE_SECRET: "s" }, false, human);
  assert.equal(res.status, 503);
  assert.equal(rows.length, 0);
  assert.equal((await handleInterest(post(GOOD), {}, true, human)).status, 503, "open without a database or a secret is still closed");
});

test("only POST is answered", async () => {
  const res = await handleInterest(new Request("https://openkannada.org/api/interest"), {}, true, human);
  assert.equal(res.status, 405);
});

test("a filled honeypot is told it worked and nothing is kept", async () => {
  const { db, rows } = fakeDb();
  const res = await handleInterest(post({ ...GOOD, website: "https://spam.example" }), { DB: db, TURNSTILE_SECRET: "s" }, true, human);
  assert.equal(res.status, 200);
  assert.equal(rows.length, 0);
});

test("a submission that fails Turnstile is refused", async () => {
  const { db, rows } = fakeDb();
  const res = await handleInterest(post(GOOD), { DB: db, TURNSTILE_SECRET: "s" }, true, bot);
  assert.equal(res.status, 403);
  assert.equal(rows.length, 0);
});

test("a good submission is stored once, with the help areas by id", async () => {
  const { db, rows } = fakeDb();
  const res = await handleInterest(post(GOOD), { DB: db, TURNSTILE_SECRET: "s" }, true, human);
  assert.equal(res.status, 200);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0]!.slice(1), ["Asha", "asha@example.org", "Mysuru, India", "https://github.com/asha", "code,reading", "I maintain a Kannada keyboard app.", "5-10", "fluent", "en"]);
});

test("missing, unknown or overlong fields name themselves, and the link stays optional", () => {
  assert.ok(parseSubmission({ ...GOOD, link: "" }).ok);
  const bad = parseSubmission({ ...GOOD, name: "", email: "asha", areas: ["painting"], hours: "lots", kannada: "", consent: false, experience: "x".repeat(601), link: "github.com/asha" });
  assert.equal(bad.ok, false);
  assert.deepEqual(!bad.ok && [...bad.errors].sort(), ["areas", "consent", "email", "experience", "hours", "kannada", "link", "name"]);
});
