// Tests for sitemap dates, IndexNow and the live check: npm test
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("a table of links has 1 fingerprint at any base path, though its columns pad to the longest link", () => {
  const table = (base: string) => {
    const cell = `[Nudi](${base}nudi/)`;
    return `| Converter${" ".repeat(cell.length - 9)} |\n| ${"-".repeat(cell.length)} |\n| ${cell} |`;
  };
  assert.equal(contentHash(table("/kannada/")), contentHash(table("/")));
  assert.notEqual(contentHash(table("/").replace("Converter", "Font")), contentHash(table("/")));
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
  assert.deepEqual(calls[0], ["log", "-1", "--first-parent", "-m", "--format=%cI", '-S"aaa"', "--", "data/page-hashes.json"]);
});

test("with real git, a merged change is dated by the merge, and text changed back is dated by the commit that brought it back", () => {
  const dir = mkdtempSync(join(tmpdir(), "page-hashes-"));
  const run = (args: string[], date = "2026-04-01T09:00:00+00:00") =>
    execFileSync("git", ["-c", "user.name=T", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], {
      cwd: dir,
      encoding: "utf8",
      // Without the caller's GIT_* variables, so a git hook running the tests cannot point these commands at its repository.
      env: { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_"))), GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    });
  const record = (hash: string, date: string, message: string) => {
    mkdirSync(join(dir, "data"), { recursive: true });
    writeFileSync(join(dir, "data/page-hashes.json"), `{\n  "/": "${hash}"\n}\n`);
    run(["add", "."], date);
    run(["commit", "-q", "-m", message], date);
  };
  try {
    run(["init", "-q", "-b", "main"]);
    record("aaa", "2026-04-01T09:00:00+00:00", "a");
    run(["checkout", "-q", "-b", "copy"]);
    record("bbb", "2026-04-02T09:00:00+00:00", "b");
    run(["checkout", "-q", "main"]);
    run(["merge", "-q", "--no-ff", "-m", "merge", "copy"], "2026-04-10T09:00:00+00:00");
    const git = (args: string[]) => run(args);
    assert.equal(Date.parse(lastmodOf("bbb", git) ?? ""), Date.parse("2026-04-10T09:00:00Z"));
    record("aaa", "2026-04-20T09:00:00+00:00", "back");
    assert.equal(Date.parse(lastmodOf("aaa", git) ?? ""), Date.parse("2026-04-20T09:00:00Z"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

test("the live check finds a missing canonical, noindex in the wrong state, a closed crawler and a bad redirect", async () => {
  const { liveSeoProblems } = await import("../src/lib/live.ts");
  const good = {
    home: '<link rel="canonical" href="https://k.org/"><link rel="alternate" type="text/markdown" href="/index.md"><script type="application/ld+json">{}</script>',
    robotsTag: "noindex",
    robotsTxt: "User-agent: GPTBot\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: https://k.org/sitemap.xml\n",
    sitemap: "<url><loc>https://k.org/</loc><lastmod>2026-11-17T10:00:00Z</lastmod></url>",
    aliases: [{ host: "www.k.org", status: 301, location: "https://k.org/" }],
  };
  assert.deepEqual(liveSeoProblems(good, "https://k.org", false, ["GPTBot"]), []);
  assert.deepEqual(liveSeoProblems(good, "https://k.org", true, ["GPTBot"]), ["/: X-Robots-Tag is still noindex after launch"]);
  const bad = { ...good, home: "", robotsTag: null, robotsTxt: "User-agent: *\nAllow: /\n", sitemap: "<url><loc>https://k.org/</loc></url>", aliases: [{ host: "www.k.org", status: 200, location: null }] };
  assert.deepEqual(liveSeoProblems(bad, "https://k.org", false, ["GPTBot"]), [
    "/: no canonical link to https://k.org/",
    "/: no JSON-LD",
    "/: no link to its markdown mirror",
    "/: X-Robots-Tag is not noindex before launch",
    "/robots.txt: does not allow GPTBot",
    "/robots.txt: does not link the sitemap",
    "/sitemap.xml: no URL with a lastmod",
    "www.k.org: answers 200 to nowhere, expected a 301 to https://k.org/",
  ]);
});
