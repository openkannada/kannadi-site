// Tests for markdown content negotiation: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { onRequest } from "../functions/_middleware.ts";
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
    const path = new URL(String(input)).pathname;
    return path === "/a/index.md" ? new Response("# A", { headers: { "content-type": "application/octet-stream" } }) : new Response("", { status: 404 });
  },
};
const html = async () => new Response("<h1>A</h1>", { headers: { "content-type": "text/html" } });

test("the middleware answers markdown requests with the mirror and marks pages as varying by Accept", async () => {
  const md = await onRequest({ request: new Request("https://x.org/a/", { headers: { accept: "text/markdown" } }), env: { ASSETS: assets }, next: html });
  assert.equal(md.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(md.headers.get("vary"), "Accept");
  assert.equal(await md.text(), "# A");
  const page = await onRequest({ request: new Request("https://x.org/a/"), env: { ASSETS: assets }, next: html });
  assert.equal(await page.text(), "<h1>A</h1>");
  assert.equal(page.headers.get("vary"), "Accept");
  const missing = await onRequest({ request: new Request("https://x.org/b/", { headers: { accept: "text/markdown" } }), env: { ASSETS: assets }, next: html });
  assert.equal(await missing.text(), "<h1>A</h1>");
});
