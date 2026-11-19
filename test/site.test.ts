// Tests for the site's structured data and agent files: npm test
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { ALL_PAGES, EDITOR, HOME, HOMES, NAV, PAGES, inLanguage, isHome, published } from "../src/content/pages.ts";
import { pagePath, siteUrl } from "../src/content/site.ts";
import { llmsFull, llmsIndex, markdownPath, mirror, readPage, robots, sitemap } from "../src/lib/agent-text.ts";
import { absolute, graphemes, jsonLd, plainText, scriptJson } from "../src/lib/seo.ts";

const types = (graph) => graph["@graph"].map((n) => n["@type"]);

test("every page has the structured data the strategy asks for", () => {
  for (const page of published(ALL_PAGES, true)) {
    const t = types(jsonLd(page, null, HOME));
    const main = { tool: ["WebApplication", "HowTo"], reference: ["LearningResource"], info: ["Organization"], home: ["Organization", "WebSite"], project: [page.schema] }[page.kind];
    const asks = page.kind === "tool" || page.kind === "reference";
    const faq = asks || page.faq.length ? ["FAQPage"] : [];
    if (asks) assert.ok(page.faq.length, `${page.slug || "home"} has no FAQ`);
    for (const want of ["WebPage", "BreadcrumbList", "Person", ...faq, ...main]) {
      assert.ok(t.includes(want), `${page.slug || "home"} lacks ${want}`);
    }
  }
  const home = types(jsonLd(HOME, null, HOME));
  assert.ok(home.includes("Organization") && home.includes("WebSite"));
  assert.ok(!home.includes("SoftwareSourceCode") && !home.includes("WebApplication"), "the library and the app moved to /editor/");
  const editor = types(jsonLd(EDITOR, null, HOME));
  for (const want of ["WebApplication", "HowTo", "SoftwareSourceCode", "FAQPage"]) assert.ok(editor.includes(want), `/editor/ lacks ${want}`);
});

test("the editor moved to /editor/ as it was, and the home page is Open Kannada's front door", () => {
  assert.equal(HOME.slug, "");
  assert.equal(HOME.kind, "home");
  assert.equal(HOME.h1, "Kannada should be as easy to use on a computer as English.");
  assert.equal(EDITOR.title, "Kannada editor and converter: Nudi to Unicode, typing and more");
  assert.equal(EDITOR.h1, "Kannada editor and converter");
  assert.equal(EDITOR.faq.length, 8);
  assert.equal(EDITOR.twin, "kn");
  assert.equal(HOME.twin, undefined, "the English home has no twin until the Kannada home is read");
  assert.equal(HOMES.kn.slug, "kn", "the language switch on / goes to the Kannada home");
  assert.ok(isHome(HOME) && isHome(HOMES.kn) && !isHome(EDITOR));
  const knHome = ALL_PAGES.find((p) => p.slug === "kn/home");
  assert.ok(isHome(knHome), "the Kannada home draft is a home page, with no trail or Ask AI, wherever it lives");
  assert.equal(jsonLd(knHome, null, HOMES.kn)["@graph"].find((n) => n["@type"] === "BreadcrumbList").itemListElement.length, 1);
  const graph = jsonLd(EDITOR, siteUrl("https://example.org/"), HOME)["@graph"];
  const app = graph.find((n) => n["@type"] === "WebApplication");
  assert.equal(app.name, "kannadi Kannada editor and converter");
  assert.equal(app.isBasedOn["@id"], "https://example.org/editor/#library");
  assert.equal(graph.find((n) => n["@type"] === "SoftwareSourceCode")["@id"], "https://example.org/editor/#library");
  const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList").itemListElement;
  assert.deepEqual(crumbs.map((c) => c.item), ["https://example.org/", "https://example.org/editor/"]);
  const home = jsonLd(HOME, siteUrl("https://example.org/"), HOME)["@graph"];
  assert.equal(home.find((n) => n["@type"] === "BreadcrumbList").itemListElement.length, 1);
  assert.equal(home.find((n) => n["@type"] === "WebPage").mainEntity["@id"], "https://example.org/#organization");
});

test("every English page is in exactly 1 menu, and a Kannada reader gets the Kannada page where it is built", () => {
  const listed = Object.values(NAV).flat();
  assert.equal(new Set(listed).size, listed.length);
  const english = PAGES.filter((p) => (p.lang ?? "en") === "en" && !isHome(p)).map((p) => p.slug).sort();
  assert.deepEqual([...listed].sort(), english);
  assert.deepEqual(NAV.tools, ["editor", "fonts", "spell-check", "dictionary", "ocr", "ai-benchmark"]);
  assert.deepEqual(NAV.org, ["about", "contribute", "press", "brand"]);
  assert.equal(inLanguage("editor", "kn").slug, "kn");
  assert.equal(inLanguage("brand", "kn").slug, "kn/brand");
  assert.equal(inLanguage("fonts", "kn").slug, "fonts", "a draft is not built, so the English page stands in");
  assert.equal(inLanguage("fonts", "kn", published(ALL_PAGES, true)).slug, "kn/fonts");
  assert.equal(inLanguage("about", "en").slug, "about");
});

test("project pages say what each tool does, its license and where to get it, with no figure the brief does not give", () => {
  const projects = PAGES.filter((p) => p.kind === "project");
  assert.deepEqual(projects.map((p) => p.slug), ["fonts", "spell-check", "dictionary", "ocr", "ai-benchmark"]);
  for (const p of projects) {
    const ids = p.sections.map((s) => s.id);
    for (const want of [p.slug === "fonts" ? "based" : "what", "downloads", "license"]) assert.ok(ids.includes(want), `${p.slug} lacks ${want}`);
    assert.ok(p.licenses.length, p.slug);
  }
  const text = (slug) => JSON.stringify(PAGES.find((p) => p.slug === slug));
  const ocr = PAGES.find((p) => p.slug === "ocr").sections.find((s) => s.id === "result").compare;
  assert.deepEqual(ocr.head, ["Test set", "Open Kannada 0.2", "Stock Tesseract"]);
  assert.deepEqual(ocr.rows, [
    ["Old printed books, 60 Wikisource pages", "6.0%", "8.7%"],
    ["Degraded words, 400", "17.0%", "24.4%"],
    ["MILE pages from IISc, 30", "5.4%", "7.3%"],
    ["MILE lines from IISc, 600", "2.8%", "3.8%"],
  ], "the v0.2 results as released, and no other");
  assert.doesNotMatch(text("ocr"), /dots/i);
  const BRIEF = ["3,712", "13,887", "10,654", "20.0%", "45.1%", "1.6%", "21.1%", "2.2", "22", "100", "27", "28", "25", "24", "400", "1876", "1894", "20", "7.6%", "12.4%", "22.7%", "30.1%", "60", "6.2%", "7.5%", "10", "0.2", "4", "1", "2"];
  const figures = (html) => plainText(html).replace(/15919|ODbL-1\.0|Apache-2\.0|BY-SA 4\.0|License 1\.0/g, "").match(/\d[\d,.]*\d%?|\d%?/g) ?? [];
  const CREDIT = 'Contains information from Alar by V. Krishna (<a href="https://alar.ink">https://alar.ink</a>), made available under the Open Database License 1.0.';
  for (const slug of ["dictionary", "kn/dictionary"]) {
    const page = ALL_PAGES.find((p) => p.slug === slug);
    const section = (id) => page.sections.find((s) => s.id === id);
    for (const n of figures(JSON.stringify(page.sections) + page.description + page.intro)) assert.ok(BRIEF.includes(n), `${slug} shows ${n}, a figure the brief does not give`);
    assert.deepEqual(section("result").stats.map((s) => s.value), ["3,712", "13,887", "45.1%"], `${slug} stats`);
    assert.deepEqual(figures(section("result").paragraphs[0]), ["20.0%", "45.1%", "1.6%", "21.1%"], `${slug}: running words exact, with forms, then distinct`);
    assert.deepEqual(figures(section("limits").items[0]).filter((n) => n.length === 2), ["27", "28", "25", "24"], `${slug}: judged fine, then wrong`);
    assert.deepEqual(figures(section("next").items[2]).filter((n) => n.endsWith("%")), ["7.6%", "12.4%", "22.7%", "30.1%"], `${slug}: Ziegler ours then stock, Kittel ours then stock`);
    assert.deepEqual(figures(section("next").items[3]).filter((n) => n.endsWith("%")), ["6.2%", "7.5%"], `${slug}: headwords, Ziegler then Kittel`);
    assert.ok(figures(section("method").paragraphs[0]).includes("10,654"), `${slug} lacks the searched words`);
    assert.equal(section("license").items.at(-1), CREDIT, `${slug}: the Alar credit, word for word`);
    assert.ok(page.description.includes("3,712"), `${slug} description`);
    assert.equal(section("downloads").paragraphs.length, 1, `${slug}: downloads stay coming soon until the dictionary is hosted`);
  }
  for (const slug of ["fonts"]) assert.doesNotMatch(text(slug).replace(/U\+[0-9A-F]{4}|15919|1\.1\b|2\.0\b|1\.0\b|\b3 |\d\.\d{3}|SHA-256|Article 1\b|\b100 to 900\b|"400"/g, ""), /\d+(\.\d+)?%|\d{2,}/, `${slug} shows a figure`);
  const bench = PAGES.find((p) => p.slug === "ai-benchmark");
  const rows = bench.sections.find((s) => s.id === "result").table.rows;
  assert.deepEqual(rows.map((r) => [r.name, r.ratio, r.low, r.high]), [
    ["cl100k", 8.27, 8.06, 8.48],
    ["Qwen 2.5", 6.52, 6.37, 6.68],
    ["Kimi", 3.42, 3.35, 3.5],
    ["o200k", 1.83, 1.8, 1.87],
    ["Gemma 4", 1.7, 1.65, 1.74],
    ["Sarvam", 1.35, 1.32, 1.38],
    ["Sarvam-1", 1.14, 1.12, 1.17],
  ]);
  assert.match(text("ai-benchmark"), /between 1\.1 and 8\.3 times/);
  assert.match(text("ai-benchmark"), /Claude and Gemini are not measured/);
  assert.match(text("spell-check"), /88\.9%[^"]*65\.7%/);
  assert.equal(jsonLd(bench, null, HOME)["@graph"].find((n) => n["@type"] === "Dataset").license, "https://creativecommons.org/licenses/by/4.0/");
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
  const faq = jsonLd(EDITOR, null, HOME)["@graph"].find((n) => n["@type"] === "FAQPage").mainEntity;
  assert.equal(faq.length, EDITOR.faq.length);
  for (const [i, q] of faq.entries()) {
    assert.equal(q.name, plainText(EDITOR.faq[i].q));
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
  assert.equal(jsonLd(EDITOR, null, HOME)["@graph"].find((n) => n["@type"] === "SoftwareSourceCode").name, "kannadi");
  const base = readFileSync(new URL("../src/layouts/Base.astro", import.meta.url), "utf8");
  assert.match(base, /<meta property="og:site_name" content=\{ORG\.name\} \/>/);
});

test("every Kannada page has an English twin that names it back, and waits for a native reader", async () => {
  const { twinProblems, alternates } = await import("../src/lib/seo.ts");
  const drafts = published(ALL_PAGES, true);
  assert.deepEqual(twinProblems(drafts), []);
  const kn = drafts.filter((p) => p.lang === "kn");
  assert.deepEqual(kn.map((p) => p.slug), ["kn", "kn/about", "kn/press", "kn/brand", "kn/home", "kn/fonts", "kn/spell-check", "kn/dictionary", "kn/ocr", "kn/ai-benchmark", "kn/contribute"]);
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
  const drafted = ALL_PAGES.map((p) => (p.lang === "kn" ? { ...p, needsReview: true } : p));
  const built = published(drafted, false);
  assert.ok(!built.some((p) => p.lang === "kn"), "drafts are left out");
  assert.deepEqual(twinProblems(built), []);
  const about = built.find((p) => p.slug === "about");
  assert.equal(about.twin, undefined, "a link to a draft is left out too");
  assert.deepEqual(alternates(about, built, siteUrl("https://example.org/")), []);
  assert.equal(published(drafted, true).find((p) => p.slug === "about").twin, "kn/about", "KANNADA_DRAFTS keeps them");
});

test("the Kannada pages are published, with their twins", () => {
  assert.deepEqual(PAGES.filter((p) => p.needsReview), []);
  assert.deepEqual(PAGES.filter((p) => p.lang === "kn").map((p) => p.slug), ["kn", "kn/about", "kn/press", "kn/brand"]);
  assert.deepEqual(ALL_PAGES.filter((p) => p.needsReview).map((p) => p.slug), ["kn/home", "kn/fonts", "kn/spell-check", "kn/dictionary", "kn/ocr", "kn/ai-benchmark", "kn/contribute"]);
  assert.equal(PAGES.find((p) => p.slug === "about").twin, "kn/about");
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
  assert.match(footer, /fmt\(T\.owns,[^\n]*brand/);
  assert.ok(PAGES.some((p) => p.slug === "brand"));
  assert.ok(!ALL_PAGES.some((p) => p.slug.includes("names-and-logos")), "the old path only redirects");
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

test("voice typing says, at the microphone, that it goes through the browser's speech service", async () => {
  const { EDITOR_STRINGS } = await import("../src/i18n/editor.ts");
  assert.match(EDITOR_STRINGS.en.toolbar.voice, /browser's speech service/);
  assert.match(EDITOR_STRINGS.en.voice.started, /browser's speech service/);
  assert.match(EDITOR_STRINGS.kn.toolbar.voice, /ಬ್ರೌಸರ್‌ನ ಧ್ವನಿ ಸೇವೆ/);
  assert.match(EDITOR_STRINGS.kn.voice.started, /ಬ್ರೌಸರ್‌ನ ಧ್ವನಿ ಸೇವೆ/);
  const copy = JSON.stringify(ALL_PAGES);
  assert.doesNotMatch(copy, /voice[^"]{0,80}(on your device|offline|stays with you)/i);
});

test("the site names kannadi's license as MIT OR Apache-2.0, and never as the MIT license alone", () => {
  const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  const files = ["src/content/pages.ts", "src/content/press.ts", "src/integrations/agent-files.ts", "src/i18n/site.en.ts", "src/i18n/site.kn.ts"];
  for (const f of files) assert.doesNotMatch(read(f), /MIT license|MIT ಲೈಸೆನ್ಸ್/, f);
  assert.match(read("src/content/press.ts"), /open source under MIT OR Apache-2\.0/);
  assert.match(read("src/integrations/agent-files.ts"), /\(Rust, MIT OR Apache-2\.0\)/);
  assert.match(read("src/content/pages.ts"), /library for Kannada text, released under MIT OR Apache-2\.0/);
});

test("every page runs the Worker first and none is marked noindex by path, so redirects and launch reach every page", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));
  const skips = config.assets.run_worker_first.filter((r) => r.startsWith("!")).map((r) => r.slice(1));
  const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
  const noindex = headers.split(/\n(?=\S)/).filter((b) => /X-Robots-Tag: noindex/.test(b)).map((b) => b.split("\n")[0]);
  const matches = (glob, path) => new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`).test(path);
  for (const page of PAGES) {
    const path = page.slug ? `/${page.slug}/` : "/";
    for (const glob of skips) assert.ok(!matches(glob, path), `${path} skips the Worker through ${glob}`);
    for (const glob of noindex) assert.ok(!matches(glob, path), `${path} is noindex through ${glob}`);
  }
});

test("Open Graph cards exist only for published pages, so no draft Kannada is served", () => {
  const cards = readdirSync(new URL("../public/og", import.meta.url), { recursive: true }).filter((f) => String(f).endsWith(".png")).map((f) => String(f).replace(/\\/g, "/"));
  const wanted = new Set(PAGES.map((p) => `${p.slug || "home"}.png`));
  for (const card of cards) assert.ok(wanted.has(card), `public/og/${card} belongs to no published page`);
});

test("the editor and the Nudi converter say how to convert a folder with the kannadi tool", () => {
  for (const slug of ["editor", "nudi-to-unicode"]) {
    const page = ALL_PAGES.find((p) => p.slug === slug);
    const answer = plainText(page.faq.find((f) => f.q === "Can I convert many files at once?")?.a ?? "");
    assert.ok(answer.includes("kannadi to-unicode old-orders/ --out converted/"), `${slug} lacks the folder command`);
    assert.ok(answer.includes("https://github.com/openkannada/kannadi/releases/latest/download/kannadi-cli-installer.sh | sh"), `${slug} lacks the macOS and Linux installer`);
    assert.ok(answer.includes("kannadi-cli-installer.ps1 | iex"), `${slug} lacks the Windows installer`);
    assert.ok(answer.includes("brew install openkannada/tap/kannadi"), `${slug} lacks Homebrew`);
    assert.ok(answer.includes("--layout akruti"), `${slug} does not say Akruti text files need --layout akruti`);
  }
});
