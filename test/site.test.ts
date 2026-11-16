// Tests for the site's structured data and agent files: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { HOME, PAGES } from "../src/content/pages.ts";
import { pagePath, siteUrl } from "../src/content/site.ts";
import { llmsFull, llmsIndex, markdownPath, mirror, readPage, robots, sitemap } from "../src/lib/agent-text.ts";
import { absolute, jsonLd, plainText, scriptJson } from "../src/lib/seo.ts";

const types = (graph) => graph["@graph"].map((n) => n["@type"]);

test("every page has the structured data the strategy asks for", () => {
  for (const page of PAGES) {
    const t = types(jsonLd(page, null, HOME));
    for (const want of ["WebPage", "WebApplication", "HowTo", "FAQPage", "BreadcrumbList", "Person"]) {
      assert.ok(t.includes(want), `${page.slug || "home"} lacks ${want}`);
    }
  }
  const home = types(jsonLd(HOME, null, HOME));
  assert.ok(home.includes("SoftwareSourceCode") && home.includes("WebSite"));
});

test("structured data uses absolute URLs once the site has one", () => {
  const site = siteUrl("https://example.org/kannada");
  const page = PAGES.find((p) => p.slug === "nudi-to-unicode");
  const graph = jsonLd(page, site, HOME)["@graph"];
  const app = graph.find((n) => n["@type"] === "WebApplication");
  assert.equal(app.url, "https://example.org/kannada/nudi-to-unicode/");
  assert.equal(app["@id"], "https://example.org/kannada/nudi-to-unicode/#app");
  const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList").itemListElement;
  assert.deepEqual(crumbs.map((c) => c.item), ["https://example.org/kannada/", "https://example.org/kannada/nudi-to-unicode/"]);
  assert.equal(absolute("/x/", null), "/x/");
});

test("FAQ answers in the structured data are the visible answers as plain text", () => {
  const faq = jsonLd(HOME, null, HOME)["@graph"].find((n) => n["@type"] === "FAQPage").mainEntity;
  assert.equal(faq.length, HOME.faq.length);
  for (const [i, q] of faq.entries()) {
    assert.equal(q.name, plainText(HOME.faq[i].q));
    assert.ok(!/[<>]/.test(q.acceptedAnswer.text), q.acceptedAnswer.text);
  }
  assert.equal(plainText('<b>Save</b> &amp; <a href="/">go</a>'), "Save & go");
});

test("JSON in a script element cannot close the element", () => {
  assert.equal(scriptJson({ a: "</script><b>" }), '{"a":"\\u003c/script>\\u003cb>"}');
});

test("the site URL must be a plain http or https base", () => {
  assert.equal(siteUrl(undefined), null);
  assert.equal(siteUrl("https://example.org")?.href, "https://example.org/");
  assert.equal(siteUrl("https://example.org/k")?.pathname, "/k/");
  assert.throws(() => siteUrl("ftp://example.org/"));
  assert.throws(() => siteUrl("https://example.org/?a=1"));
  assert.equal(pagePath(""), "/");
  assert.equal(pagePath("kannada-typing"), "/kannada-typing/");
});

test("page slugs and titles are unique, and descriptions fit a search result", () => {
  assert.equal(new Set(PAGES.map((p) => p.slug)).size, PAGES.length);
  assert.equal(new Set(PAGES.map((p) => p.title)).size, PAGES.length);
  for (const p of PAGES) {
    assert.ok(p.description.length >= 70 && p.description.length <= 160, `${p.slug}: ${p.description.length}`);
    assert.ok(p.title.length <= 70, `${p.slug}: ${p.title.length}`);
  }
});

const HTML = `<!doctype html><html><head><title>A page</title><meta name="description" content="About it."></head>
<body><header>Menu</header><main><h1>Heading</h1><section data-md-skip><p>Editor</p></section><p>Body <b>text</b>.</p>
<script>x()</script><dialog>Shortcuts</dialog></main><footer>Foot</footer></body></html>`;

test("a page mirror keeps the main content and drops the editor, scripts and chrome", () => {
  const page = readPage(HTML, "/a/");
  assert.equal(page.title, "A page");
  assert.equal(page.description, "About it.");
  assert.equal(page.markdown, "# Heading\n\nBody **text**.");
  const md = mirror(page, "https://example.org/a/");
  assert.ok(md.startsWith('---\ntitle: "A page"\ndescription: "About it."\nurl: "https://example.org/a/"\n---\n\n# Heading'));
  assert.throws(() => readPage("<html><body><p>No main</p></body></html>", "/b/"));
  assert.equal(markdownPath("/a/"), "/a/index.md");
});

test("llms.txt lists every page with its markdown, and llms-full.txt holds their text", () => {
  const pages = [
    { path: "/", title: "Home", description: "The editor.", markdown: "# Home" },
    { path: "/a/", title: "A", description: "Page A.", markdown: "# A\n\nText." },
  ];
  const site = { name: "kannadi", summary: "Summary.", details: ["Detail."], url: (p) => `https://example.org${p}` };
  const index = llmsIndex(pages, site);
  assert.ok(index.startsWith("# kannadi\n\n> Summary.\n\nDetail.\n"));
  assert.ok(index.includes("- [Home](https://example.org/index.md): The editor."));
  assert.ok(index.includes("- [A](https://example.org/a/index.md): Page A."));
  assert.ok(index.includes("(https://example.org/llms-full.txt)"));
  const full = llmsFull(pages, site);
  assert.ok(full.includes("Source: https://example.org/a/\n\n# A\n\nText."));
});

test("robots.txt allows every crawler and names the sitemap once there is one", () => {
  assert.equal(robots(null), "User-agent: *\nAllow: /\n");
  assert.ok(robots("https://example.org/sitemap.xml").endsWith("\nSitemap: https://example.org/sitemap.xml\n"));
  assert.ok(sitemap(["https://example.org/?a&b"]).includes("<loc>https://example.org/?a&amp;b</loc>"));
});
