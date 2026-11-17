// Tests for sitemap dates, IndexNow and the live check: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { INDEXNOW } from "../src/content/site.ts";
import { contentHash, lastmodOf, recordHashes, staleHashes } from "../src/lib/freshness.ts";
import { INDEXNOW_LIMIT, changedUrls, indexNowBody, parseSitemap } from "../src/lib/indexnow.ts";
import { liveProblems } from "../src/lib/live.ts";

test("a page's fingerprint follows its text and ignores link targets and spacing", () => {
  const a = contentHash("# Nudi\n\nSee [the editor](/).");
  assert.equal(contentHash("# Nudi\n\nSee [the editor](https://example.org/kannada/)."), a);
  assert.equal(contentHash("# Nudi\n\n\nSee  [the editor](/)."), a);
  assert.notEqual(contentHash("# Nudi\n\nSee [the converter](/)."), a);
});

test("the hash file records each page, and a changed or new page is stale", () => {
  const recorded = recordHashes([{ path: "/b/", hash: "bbb" }, { path: "/", hash: "aaa" }]);
  assert.deepEqual(Object.keys(recorded), ["/", "/b/"]);
  assert.deepEqual(staleHashes(recorded, [{ path: "/", hash: "aaa" }, { path: "/b/", hash: "xxx" }, { path: "/c/", hash: "c" }]), ["/b/", "/c/"]);
});

test("a page's lastmod is the commit that recorded its current fingerprint", () => {
  const calls: string[][] = [];
  const git = (args: string[]) => {
    calls.push(args);
    return args.includes('-S"aaa"') ? "2026-11-24T10:15:00+00:00\n" : "";
  };
  assert.equal(lastmodOf("aaa", git), "2026-11-24T10:15:00+00:00");
  assert.equal(lastmodOf("zzz", git), undefined);
  assert.deepEqual(calls[0], ["log", "-1", "--format=%cI", '-S"aaa"', "--", "data/page-hashes.json"]);
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

test("hreflang links appear only for pages with a twin, both ways, with x-default on English", async () => {
  const { alternates, twinProblems } = await import("../src/lib/seo.ts");
  const site = new URL("https://k.org/");
  const en = { slug: "nudi-to-unicode", twin: "kn/nudi-to-unicode" };
  const kn = { slug: "kn/nudi-to-unicode", lang: "kn", twin: "nudi-to-unicode" };
  const pages = [en, kn, { slug: "kagunita" }];
  assert.deepEqual(alternates(kn, pages, site), [
    { hreflang: "en", href: "https://k.org/nudi-to-unicode/" },
    { hreflang: "kn", href: "https://k.org/kn/nudi-to-unicode/" },
    { hreflang: "x-default", href: "https://k.org/nudi-to-unicode/" },
  ]);
  assert.deepEqual(alternates(en, pages, site), alternates(kn, pages, site));
  assert.deepEqual(alternates(pages[2], pages, site), []);
  assert.deepEqual(alternates(en, pages, null), []);
  assert.deepEqual(twinProblems(pages), []);
  assert.deepEqual(twinProblems([en, { slug: "kn/nudi-to-unicode", lang: "kn" }]), ["nudi-to-unicode: kn/nudi-to-unicode does not name it back"]);
  assert.deepEqual(twinProblems([{ slug: "a", twin: "b" }, { slug: "b", twin: "a" }]), ["a: twin b is in the same language", "b: twin a is in the same language"]);
  assert.deepEqual(twinProblems([{ slug: "a", twin: "z" }]), ["a: twin z does not exist"]);
});
