// Tests for sitemap dates, IndexNow and the live check: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { INDEXNOW } from "../src/content/site.ts";
import { contentHash, staleDates, updateDates } from "../src/lib/freshness.ts";
import { INDEXNOW_LIMIT, changedUrls, indexNowBody, parseSitemap } from "../src/lib/indexnow.ts";
import { liveProblems } from "../src/lib/live.ts";

test("a page's fingerprint follows its text and ignores link targets and spacing", () => {
  const a = contentHash("# Nudi\n\nSee [the editor](/).");
  assert.equal(contentHash("# Nudi\n\nSee [the editor](https://example.org/kannada/)."), a);
  assert.equal(contentHash("# Nudi\n\n\nSee  [the editor](/)."), a);
  assert.notEqual(contentHash("# Nudi\n\nSee [the converter](/)."), a);
});

test("a page keeps its lastmod until its text changes", () => {
  const dates = { "/": { hash: "aaa", lastmod: "2026-11-01" }, "/gone/": { hash: "ccc", lastmod: "2026-11-01" } };
  const next = updateDates(dates, [{ path: "/", hash: "aaa" }, { path: "/new/", hash: "bbb" }], "2026-11-17");
  assert.deepEqual(next, { "/": { hash: "aaa", lastmod: "2026-11-01" }, "/new/": { hash: "bbb", lastmod: "2026-11-17" } });
  assert.equal(updateDates(next, [{ path: "/", hash: "zzz" }], "2026-11-18")["/"]?.lastmod, "2026-11-18");
  assert.deepEqual(staleDates(next, [{ path: "/", hash: "aaa" }, { path: "/new/", hash: "xxx" }, { path: "/other/", hash: "y" }]), ["/new/", "/other/"]);
});

test("IndexNow gets only new or changed pages on the site's own host", () => {
  const live = parseSitemap("<urlset><url><loc>https://k.org/</loc><lastmod>2026-11-01</lastmod></url><url><loc>https://k.org/a/</loc><lastmod>2026-11-01</lastmod></url></urlset>");
  const next = parseSitemap(
    "<urlset><url><loc>https://k.org/</loc><lastmod>2026-11-01</lastmod></url><url><loc>https://k.org/a/</loc><lastmod>2026-11-17</lastmod></url><url><loc>https://k.org/b/?x&amp;y</loc></url><url><loc>https://other.org/</loc></url></urlset>",
  );
  assert.deepEqual(changedUrls(live, next, "k.org"), ["https://k.org/a/", "https://k.org/b/?x&y"]);
  assert.deepEqual(changedUrls(new Map(), next, "k.org"), ["https://k.org/", "https://k.org/a/", "https://k.org/b/?x&y"]);
  const many = new Map(Array.from({ length: INDEXNOW_LIMIT + 5 }, (_, i) => [`https://k.org/${i}/`, null]));
  assert.equal(changedUrls(new Map(), many, "k.org").length, INDEXNOW_LIMIT);
  assert.deepEqual(indexNowBody(new URL("https://k.org/"), "abc", ["https://k.org/a/"]), {
    host: "k.org",
    key: "abc",
    keyLocation: "https://k.org/abc.txt",
    urlList: ["https://k.org/a/"],
  });
});

test("the IndexNow key file is served from the site root and stays off until the domain is live", () => {
  assert.equal(readFileSync(new URL(`../public/${INDEXNOW.key}.txt`, import.meta.url), "utf8"), INDEXNOW.key);
  assert.match(INDEXNOW.key, /^[0-9a-f]{32}$/);
  assert.equal(INDEXNOW.enabled, false);
});

test("the live check wants status 200 and the right content type for each file", () => {
  const expected = [{ path: "/", type: "text/html" }, { path: "/sitemap.xml", type: "application/xml|text/xml" }, { path: "/llms.txt", type: "text/plain" }];
  assert.deepEqual(
    liveProblems(
      [
        { path: "/", status: 200, type: "text/html; charset=utf-8" },
        { path: "/sitemap.xml", status: 200, type: "text/xml" },
        { path: "/llms.txt", status: 200, type: "text/html" },
      ],
      expected,
    ),
    ["/llms.txt: content type text/html, expected text/plain"],
  );
  assert.deepEqual(liveProblems([{ path: "/", status: 404, type: "text/html" }], expected.slice(0, 1)), ["/: status 404"]);
  assert.deepEqual(liveProblems([], expected.slice(0, 1)), ["/: not checked"]);
});
