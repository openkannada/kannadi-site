// Tests for the site's structured data and agent files: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { ALL_PAGES, HOME, HOMES, PAGES, published } from "../src/content/pages.ts";
import { pagePath, siteUrl } from "../src/content/site.ts";
import { llmsFull, llmsIndex, markdownPath, mirror, readPage, robots, sitemap } from "../src/lib/agent-text.ts";
import { absolute, graphemes, jsonLd, plainText, scriptJson } from "../src/lib/seo.ts";

const types = (graph) => graph["@graph"].map((n) => n["@type"]);

test("every page has the structured data the strategy asks for", () => {
  for (const page of PAGES) {
    const t = types(jsonLd(page, null, HOME));
    const main = { tool: ["WebApplication", "HowTo"], reference: ["LearningResource"], info: ["Organization"] }[page.kind];
    const faq = page.kind !== "info" || page.faq.length ? ["FAQPage"] : [];
    if (page.kind !== "info") assert.ok(page.faq.length, `${page.slug || "home"} has no FAQ`);
    for (const want of ["WebPage", "BreadcrumbList", "Person", ...faq, ...main]) {
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
    const d = graphemes(p.description);
    assert.ok(d >= 70 && d <= 160, `${p.slug}: ${d}`);
    assert.ok(graphemes(p.title) <= 70, `${p.slug}: ${graphemes(p.title)}`);
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

test("in a mirror, keys to type read as code and FAQ questions as headings", () => {
  const page = readPage('<html><body><main><p>Type <kbd>kannaDa</kbd>.</p><details><summary>Is it free?</summary><p>Yes.</p></details></main></body></html>', "/f/");
  assert.equal(page.markdown, "Type `kannaDa`.\n\n### Is it free?\n\nYes.");
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
  assert.ok(robots(null).endsWith("User-agent: *\nAllow: /\n"));
  for (const agent of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"]) {
    assert.ok(robots(null).includes(`User-agent: ${agent}\nAllow: /\n`), agent);
  }
  assert.doesNotMatch(robots(null), /Disallow/);
  assert.ok(robots("https://example.org/sitemap.xml").endsWith("\nSitemap: https://example.org/sitemap.xml\n"));
  assert.ok(sitemap([{ loc: "https://example.org/?a&b" }]).includes("<url><loc>https://example.org/?a&amp;b</loc></url>"));
  assert.ok(sitemap([{ loc: "https://example.org/", lastmod: "2026-11-17" }]).includes("<loc>https://example.org/</loc><lastmod>2026-11-17</lastmod>"));
});

test("no copy says the editor converts Unicode back to Akruti: it saves Nudi only", () => {
  const files = ["src/content/pages.ts", "src/integrations/agent-files.ts", "src/lib/seo.ts", "README.md", "PRODUCT.md", "DESIGN.md"];
  for (const f of files) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /Unicode and back|(Unicode|back) to Akruti\b/, f);
  }
});

test("the web manifest and the page's icon links point at icons of the stated size", () => {
  const pub = (f) => new URL(`../public/${f}`, import.meta.url);
  const pngSize = (f) => {
    const b = readFileSync(pub(f));
    assert.equal(b.toString("latin1", 1, 4), "PNG", f);
    return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
  };
  const manifest = JSON.parse(readFileSync(pub("site.webmanifest"), "utf8"));
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"));
  for (const icon of manifest.icons) {
    if (icon.type === "image/png") assert.equal(pngSize(icon.src), icon.sizes, icon.src);
    else readFileSync(pub(icon.src));
  }
  const base = readFileSync(new URL("../src/layouts/Base.astro", import.meta.url), "utf8");
  const links = [...base.matchAll(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>/g)].map(([tag]) => ({
    file: tag.match(/href=\{href\("\/([^"]+)"\)\}/)?.[1],
    sizes: tag.match(/sizes="(\d+x\d+)"/)?.[1],
  }));
  assert.equal(links.length, 5);
  for (const { file, sizes } of links) {
    assert.ok(file, "every icon link goes through href() for the base path");
    if (sizes) assert.equal(pngSize(file), sizes, file);
    else readFileSync(pub(file));
  }
  assert.equal(pngSize("apple-touch-icon.png"), "180x180");
});

test("the About page names Open Kannada with both founders", () => {
  const about = PAGES.find((p) => p.slug === "about");
  const graph = jsonLd(about, siteUrl("https://example.org/"), HOME)["@graph"];
  const org = graph.find((n) => n["@type"] === "Organization");
  assert.equal(org.name, "Open Kannada");
  assert.equal(org.url, "https://example.org/");
  assert.equal(org.logo, "https://example.org/icon-512.png");
  const people = Object.fromEntries(graph.filter((n) => n["@type"] === "Person").map((n) => [n["@id"], n.name]));
  assert.deepEqual(org.founder.map((f) => people[f["@id"]]), ["Prasad Subrahmanya", "Neha Prasad"]);
  assert.equal(graph.find((n) => n["@type"] === "WebPage").mainEntity["@id"], org["@id"]);
  assert.ok(!graph.some((n) => n["@type"] === "FAQPage"), "an empty FAQ adds no FAQPage");
  assert.equal(org.sponsor.url, "https://www.luminik.io");
  assert.deepEqual(org.contactPoint.map((c) => c.email), ["support@luminik.io", "founders@luminik.io", "prasad@luminik.io"]);
});

test("the site is named Open Kannada, and the editor and library kannadi", () => {
  const graph = jsonLd(HOME, null, HOME)["@graph"];
  const site = graph.find((n) => n["@type"] === "WebSite");
  assert.equal(site.name, "Open Kannada");
  assert.equal(site.publisher["@id"], graph.find((n) => n["@type"] === "Organization")["@id"]);
  assert.equal(graph.find((n) => n["@type"] === "SoftwareSourceCode").name, "kannadi");
  const base = readFileSync(new URL("../src/layouts/Base.astro", import.meta.url), "utf8");
  assert.match(base, /<meta property="og:site_name" content=\{ORG\.name\} \/>/);
});

test("every Kannada page has an English twin that names it back, and waits for a native reader", async () => {
  const { twinProblems, alternates } = await import("../src/lib/seo.ts");
  const drafts = published(ALL_PAGES, true);
  assert.deepEqual(twinProblems(drafts), []);
  const kn = drafts.filter((p) => p.lang === "kn");
  assert.deepEqual(kn.map((p) => p.slug), ["kn", "kn/about", "kn/press", "kn/names-and-logos"]);
  for (const p of drafts.filter((p) => p.needsReview)) assert.equal(p.lang, "kn", `only Kannada drafts wait for a review: ${p.slug}`);
  const links = alternates(drafts.find((p) => p.slug === "about"), drafts, siteUrl("https://example.org/"));
  assert.deepEqual(links, [
    { hreflang: "en", href: "https://example.org/about/" },
    { hreflang: "kn", href: "https://example.org/kn/about/" },
    { hreflang: "x-default", href: "https://example.org/about/" },
  ]);
  assert.equal(graphemes("ಕನ್ನಡ"), 4, "ಕ ನ್ ನ ಡ: a virama ends a cluster in Kannada");
});

test("Lighthouse checks only pages that are built", () => {
  const urls = JSON.parse(readFileSync(new URL("../lighthouserc.json", import.meta.url), "utf8")).ci.collect.url;
  const built = new Set(PAGES.map((p) => (p.slug ? `/${p.slug}/` : "/")));
  for (const u of urls) assert.ok(built.has(u), `${u} is not built`);
});

test("pages that wait for a native reader stay out of the build, and so do links to them", async () => {
  const { twinProblems, alternates } = await import("../src/lib/seo.ts");
  assert.deepEqual(PAGES.filter((p) => p.needsReview), []);
  assert.ok(!PAGES.some((p) => p.lang === "kn"), "every Kannada page is still a draft");
  assert.deepEqual(twinProblems(PAGES), []);
  const about = PAGES.find((p) => p.slug === "about");
  assert.equal(about.twin, undefined);
  assert.deepEqual(alternates(about, PAGES, siteUrl("https://example.org/")), []);
  const checked = ALL_PAGES.map((p) => (p.slug === "kn/about" || p.slug === "about" ? { ...p, needsReview: undefined } : p));
  assert.equal(published(checked, false).find((p) => p.slug === "about").twin, "kn/about", "a checked twin is kept");
});

test("a Kannada page's structured data is in Kannada and its trail starts at the Kannada home", () => {
  const page = ALL_PAGES.find((p) => p.slug === "kn/about");
  const graph = jsonLd(page, siteUrl("https://example.org/"), HOMES.kn)["@graph"];
  assert.equal(graph.find((n) => n["@type"] === "WebPage").inLanguage, "kn-IN");
  const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList").itemListElement;
  assert.deepEqual(crumbs.map((c) => c.item), ["https://example.org/kn/", "https://example.org/kn/about/"]);
  const home = jsonLd(HOMES.kn, siteUrl("https://example.org/"), HOMES.kn)["@graph"].find((n) => n["@type"] === "BreadcrumbList");
  assert.equal(home.itemListElement.length, 1);
});

test("the people of Open Kannada carry a role label, and no page text ranks them as founders", async () => {
  const { ABOUT } = await import("../src/content/about.ts");
  const { SITE_STRINGS } = await import("../src/i18n/site.ts");
  assert.deepEqual(ABOUT.en.people.map((p) => p.role), ["Founding member", "Founding member"]);
  for (const p of [...ABOUT.en.people, ...ABOUT.kn.people]) assert.deepEqual(Object.keys(p).sort(), ["name", "role", "site", "url"]);
  const shown = [JSON.stringify(ABOUT.en), JSON.stringify(SITE_STRINGS.en)].join("\n");
  assert.doesNotMatch(shown.replace(/founders@luminik\.io/g, ""), /co-founder|\bfounded\b|>Founders</i);
});

test("the code is MIT OR Apache-2.0 from The Open Kannada Authors, and every page says who holds the names", () => {
  const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  assert.equal(JSON.parse(read("package.json")).license, "MIT OR Apache-2.0");
  assert.match(read("LICENSE-MIT"), /Copyright \(c\) 2026 The Open Kannada Authors/);
  assert.match(read("LICENSE-APACHE"), /Apache License\s+Version 2\.0/);
  assert.match(read("REUSE.toml"), /path = "data\/words\.tsv"[\s\S]*?SPDX-License-Identifier = "CC-BY-SA-4\.0"/);
  const footer = read("src/components/SiteFooter.astro");
  assert.match(read("src/i18n/site.en.ts"), /belong to the project\. \{supporter\} supports it and holds none of them\./);
  assert.match(footer, /fmt\(T\.owns,[^\n]*names-and-logos/);
  assert.ok(PAGES.some((p) => p.slug === "names-and-logos"));
});

test("each Kannada dictionary has every key and every {slot} of its English twin", async () => {
  const { EDITOR_STRINGS } = await import("../src/i18n/editor.ts");
  const { SITE_STRINGS } = await import("../src/i18n/site.ts");
  const slots = (v) => [...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  const walk = (en, kn, path) => {
    if (typeof en === "string") return assert.equal(slots(kn), slots(en), path);
    if (Array.isArray(en)) return assert.equal(kn.length, en.length, path);
    for (const key of Object.keys(en)) {
      assert.ok(Object.hasOwn(kn, key), `${path}.${key} is missing in Kannada`);
      walk(en[key], kn[key], `${path}.${key}`);
    }
  };
  walk(EDITOR_STRINGS.en, EDITOR_STRINGS.kn, "editor");
  walk(SITE_STRINGS.en, SITE_STRINGS.kn, "site");
});

test("the editor reads its words from the page, and falls back to English on bad or missing data", async () => {
  const { parseHTML } = await import("linkedom");
  const { pageStrings } = await import("../src/editor/strings.ts");
  const { EDITOR_STRINGS } = await import("../src/i18n/editor.ts");
  const page = (attr) => parseHTML(`<html><body><section class="editor"${attr}></section></body></html>`).document;
  const kn = JSON.stringify(EDITOR_STRINGS.kn).replace(/'/g, "&#39;");
  assert.equal(pageStrings(page(` data-ui-strings='${kn}'`)).toolbar.save, "ಉಳಿಸು");
  assert.equal(pageStrings(page(" data-ui-strings='{not json'")), EDITOR_STRINGS.en);
  assert.equal(pageStrings(page("")), EDITOR_STRINGS.en);
});
