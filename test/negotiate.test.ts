// Tests for markdown content negotiation: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalRedirect, handle } from "../src/lib/edge.ts";
import { markdownPathFor, prefersMarkdown } from "../src/lib/negotiate.ts";

test("markdown is served only to clients that ask for it over HTML", () => {
  assert.equal(prefersMarkdown("text/markdown"), true);
  assert.equal(prefersMarkdown("text/markdown, text/html;q=0.9"), true);
  assert.equal(prefersMarkdown("text/html, text/markdown;q=0.5"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0.8, */*;q=0.9"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0"), false);
  assert.equal(prefersMarkdown("text/html,application/xhtml+xml,*/*;q=0.8"), false);
  assert.equal(prefersMarkdown(null), false);
  assert.equal(markdownPathFor("/nudi-to-unicode/"), "/nudi-to-unicode/index.md");
  assert.equal(markdownPathFor("/llms.txt"), null);
});

const assets = {
  fetch: async (input) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    if (path === "/a/index.md") return new Response("# A", { headers: { "content-type": "application/octet-stream" } });
    if (path === "/a/" || path === "/b/") return new Response("<h1>A</h1>", { headers: { "content-type": "text/html" } });
    return new Response("", { status: 404 });
  },
};
const LIVE = { host: "openkannada.org", launched: true };
const get = (url, init = {}, options = LIVE) => handle(new Request(url, init), assets, options);

test("the Worker answers markdown requests with the mirror and marks pages as varying by Accept", async () => {
  const md = await get("https://openkannada.org/a/", { headers: { accept: "text/markdown" } });
  assert.equal(md.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(md.headers.get("vary"), "Accept");
  assert.equal(await md.text(), "# A");
  const page = await get("https://openkannada.org/a/");
  assert.equal(await page.text(), "<h1>A</h1>");
  assert.equal(page.headers.get("vary"), "Accept");
  const missing = await get("https://openkannada.org/b/", { headers: { accept: "text/markdown" } });
  assert.equal(await missing.text(), "<h1>A</h1>");
  const head = await get("https://openkannada.org/a/", { method: "HEAD", headers: { accept: "text/markdown" } });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("every other host and plain http go to https://openkannada.org with the path and query kept", async () => {
  for (const from of ["https://www.openkannada.org/a/?q=1", "https://openkannada.com/a/?q=1", "https://www.openkannada.com/a/?q=1", "http://openkannada.org/a/?q=1"]) {
    const r = await get(from);
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get("location"), "https://openkannada.org/a/?q=1", from);
  }
  assert.equal(canonicalRedirect(new URL("https://openkannada.org/a/"), "openkannada.org"), null);
  assert.equal(canonicalRedirect(new URL("http://localhost:8787/a/"), "openkannada.org"), null, "wrangler dev answers as itself");
});

test("before launch every response says noindex, and after launch none does", async () => {
  const before = await get("https://openkannada.org/a/", {}, { host: "openkannada.org", launched: false });
  assert.equal(before.headers.get("x-robots-tag"), "noindex");
  const missing = await get("https://openkannada.org/nothing", {}, { host: "openkannada.org", launched: false });
  assert.equal(missing.headers.get("x-robots-tag"), "noindex");
  const after = await get("https://openkannada.org/a/");
  assert.equal(after.headers.get("x-robots-tag"), null);
});

test("the site is not launched yet", async () => {
  const { LIVE: live } = await import("../src/content/site.ts");
  assert.equal(live.launched, false, "launching is Prasad's call: set LIVE.launched in a pull request");
  assert.equal(live.origin, `https://${live.host}`);
});
