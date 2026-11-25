import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { INTEREST } from "../src/content/interest.ts";
import { HONEYPOT, type InterestDb, handleInterest as handle, parseSubmission } from "../src/lib/interest.ts";

const SITE = { host: "openkannada.org" };
const handleInterest = (req: Request, env: Parameters<typeof handle>[1], open: boolean, fetcher: typeof fetch) => handle(req, env, open, SITE, fetcher);

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
  [HONEYPOT]: "",
  turnstile: "token",
  lang: "en",
};

function fakeDb() {
  const rows: unknown[][] = [];
  const db: InterestDb = { prepare: () => ({ bind: (...values) => ({ run: async () => rows.push(values) }) }) };
  return { db, rows };
}
const post = (body: unknown, headers: Record<string, string> = {}) => {
  const text = JSON.stringify(body);
  return new Request("https://openkannada.org/api/interest", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://openkannada.org", "content-length": String(new TextEncoder().encode(text).length), ...headers },
    body: text,
  });
};
const human = (async () => Response.json({ success: true, hostname: "openkannada.org" })) as typeof fetch;
const bot = (async () => Response.json({ success: false })) as typeof fetch;

test("the interest form is open, with its Turnstile site key and its database bound as DB", () => {
  assert.equal(INTEREST.open, true);
  assert.match(INTEREST.turnstileSiteKey, /^0x4[A-Za-z0-9_-]+$/, "an open form needs its Turnstile site key, or the CSP opens while the form stays closed");
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));
  const [db, ...others] = config.d1_databases ?? [];
  assert.equal(others.length, 0);
  assert.equal(db?.binding, "DB", "the Worker reads submissions' database as env.DB");
  assert.equal(db?.database_name, "openkannada-interest");
  assert.match(db?.database_id ?? "", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(db?.migrations_dir, "migrations");
});

test("while closed, every submission is refused before it is read or stored", async () => {
  const { db, rows } = fakeDb();
  const req = post(GOOD);
  const res = await handleInterest(req, { DB: db, TURNSTILE_SECRET: "s" }, false, human);
  assert.equal(res.status, 503);
  assert.equal(rows.length, 0);
  assert.equal(req.bodyUsed, false, "the closed endpoint never reads the request");
  assert.equal((await handleInterest(post(GOOD), {}, true, human)).status, 503, "open without a database or a secret is still closed");
});

test("only POST is answered", async () => {
  const res = await handleInterest(new Request("https://openkannada.org/api/interest"), {}, true, human);
  assert.equal(res.status, 405);
});

test("a filled honeypot is told it worked and nothing is kept", async () => {
  const { db, rows } = fakeDb();
  const res = await handleInterest(post({ ...GOOD, [HONEYPOT]: "https://spam.example" }), { DB: db, TURNSTILE_SECRET: "s" }, true, human);
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

test("only JSON from the site itself, under 8 KB, is read", async () => {
  const env = { DB: fakeDb().db, TURNSTILE_SECRET: "s" };
  assert.equal((await handleInterest(post(GOOD, { origin: "https://evil.example" }), env, true, human)).status, 403);
  assert.equal((await handleInterest(post(GOOD, { "content-type": "text/plain" }), env, true, human)).status, 403);
  assert.equal((await handleInterest(post(GOOD, { "content-length": "9000" }), env, true, human)).status, 413);
  assert.equal((await handleInterest(post(null), env, true, human)).status, 400, "a body that is not an object is refused, not a crash");
  const elsewhere = (async () => Response.json({ success: true, hostname: "evil.example" })) as typeof fetch;
  assert.equal((await handleInterest(post(GOOD), env, true, elsewhere)).status, 403, "a token solved on another site is refused");
});

test("a database failure is a 502, and repeated help areas are stored once", async () => {
  const broken: InterestDb = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error("D1 down"); } }) }) };
  assert.equal((await handleInterest(post(GOOD), { DB: broken, TURNSTILE_SECRET: "s" }, true, human)).status, 502);
  const parsed = parseSubmission({ ...GOOD, areas: ["code", "code", "reading"] });
  assert.ok(parsed.ok && parsed.value.areas.join() === "code,reading");
});
