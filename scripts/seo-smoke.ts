// Checks the built site the way a search engine and an agent read it:
// node scripts/seo-smoke.ts [dist] [site URL the build used]
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { parseHTML } from "linkedom";

import { PAGES, isHome } from "../src/content/pages.ts";
import { AUTHOR, pagePath } from "../src/content/site.ts";
import { readPage } from "../src/lib/agent-text.ts";
import { contentHash, HASH_FILE, type PageHashes, staleHashes } from "../src/lib/freshness.ts";
import { graphemes, plainText, twinProblems } from "../src/lib/seo.ts";

const dist = process.argv[2] ?? "dist";
const site = process.argv[3] ? new URL(process.argv[3]) : null;
const base = site ? site.pathname.replace(/\/$/, "") : "";
const problems: string[] = [];
const fail = (where: string, what: string) => problems.push(`${where}: ${what}`);
const file = (path: string) => join(dist, path.replace(/^\//, ""));
const NEEDED = ["WebPage", "BreadcrumbList", "Person"];
const titles = new Map<string, string>();
const descriptions = new Map<string, string>();
const authorIds = new Set<string>();
const hreflangs = new Map<string, string[]>();
const hashes: { path: string; hash: string }[] = [];

/** Width and height of a PNG file, read from its header. */
function pngSize(path: string): [number, number] | null {
  const b = readFileSync(path);
  return b.toString("latin1", 1, 4) === "PNG" ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
}
const BY_KIND = { tool: ["WebApplication", "HowTo"], reference: ["LearningResource"], info: ["Organization"] };

/** The dist file a site link points at, or null for links that leave the site. */
function target(href: string, from: string): string | null {
  const url = new URL(href, `http://site${from}`);
  if (url.host !== "site") return null;
  let path = url.pathname;
  if (base && !path.startsWith(`${base}/`)) return `missing base: ${path}`;
  path = path.slice(base.length);
  return path.endsWith("/") ? `${path}index.html` : path;
}

for (const page of PAGES) {
  const path = pagePath(page.slug);
  const where = path;
  const htmlFile = file(`${path}index.html`);
  if (!existsSync(htmlFile)) {
    fail(where, "page was not built");
    continue;
  }
  const html = readFileSync(htmlFile, "utf8");
  const { document } = parseHTML(html);

  const title = document.querySelector("title")?.textContent ?? "";
  if (title !== page.title) fail(where, `title is "${title}"`);
  const description = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  if (graphemes(description) < 70 || graphemes(description) > 160) fail(where, `description is ${graphemes(description)} characters`);
  const h1 = document.querySelectorAll("h1");
  if (h1.length !== 1) fail(where, `${h1.length} h1 elements`);

  const csp = document.querySelector('meta[http-equiv="content-security-policy"]')?.getAttribute("content") ?? "";
  if (!csp.includes("default-src 'none'")) fail(where, "no strict Content-Security-Policy");
  if (document.querySelector("[style]")) fail(where, "an inline style attribute, which the CSP blocks");

  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
  const expected = site ? new URL(path.slice(1), site).href : null;
  if (canonical !== expected) fail(where, `canonical is ${canonical}, expected ${expected}`);
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
  if (site && !ogImage?.startsWith(site.origin)) fail(where, `og:image is ${ogImage}`);
  if (ogImage && !existsSync(file(new URL(ogImage).pathname.slice(base.length)))) fail(where, `${ogImage} is missing`);

  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  if (scripts.length !== 1) fail(where, `${scripts.length} JSON-LD scripts`);
  const graph = JSON.parse(scripts[0]?.textContent ?? "{}")["@graph"] ?? [];
  const types = graph.map((n: { "@type": string }) => n["@type"]);
  const faqNeeded = page.kind !== "info" || page.faq.length ? ["FAQPage"] : [];
  for (const t of [...NEEDED, ...faqNeeded, ...BY_KIND[page.kind]]) if (!types.includes(t)) fail(where, `JSON-LD lacks ${t}`);
  if (!page.slug) for (const t of ["WebSite", "SoftwareSourceCode"]) if (!types.includes(t)) fail(where, `JSON-LD lacks ${t}`);
  const faq = graph.find((n: { "@type": string }) => n["@type"] === "FAQPage")?.mainEntity ?? [];
  const visible = [...document.querySelectorAll(".faq summary")].map((s) => plainText(s.innerHTML));
  const marked = faq.map((q: { name: string }) => q.name);
  if (JSON.stringify(visible) !== JSON.stringify(marked)) fail(where, "FAQ questions on the page and in JSON-LD differ");
  const answers = [...document.querySelectorAll(".faq details > p")].map((p) => plainText(p.innerHTML));
  const markedAnswers = faq.map((q: { acceptedAnswer: { text: string } }) => q.acceptedAnswer.text);
  if (JSON.stringify(answers) !== JSON.stringify(markedAnswers)) fail(where, "FAQ answers on the page and in JSON-LD differ");

  const trail = [...document.querySelectorAll("nav.crumbs li")].map((li) => li.textContent?.trim());
  const crumbs = graph.find((n: { "@type": string }) => n["@type"] === "BreadcrumbList")?.itemListElement?.map((i: { name: string }) => i.name) ?? [];
  if (!isHome(page) && JSON.stringify(trail) !== JSON.stringify(crumbs)) fail(where, `visible breadcrumbs ${JSON.stringify(trail)} differ from JSON-LD ${JSON.stringify(crumbs)}`);
  if (isHome(page) && (trail.length || crumbs.length !== 1)) fail(where, "a home page shows a breadcrumb trail");
  for (const n of graph.filter((n: { "@type": string; name?: string }) => n["@type"] === "Person" && n.name === AUTHOR.name)) authorIds.add(n["@id"]);

  for (const [seen, value, what] of [[titles, title, "title"], [descriptions, description, "description"]] as const) {
    if (seen.has(value)) fail(where, `same ${what} as ${seen.get(value)}`);
    seen.set(value, where);
  }
  const og = (name: string) => document.querySelector(`meta[property="og:${name}"]`)?.getAttribute("content");
  if (og("description") !== description) fail(where, "og:description differs from the meta description");
  if (og("title") !== page.h1 && og("title") !== title) fail(where, `og:title is "${og("title")}"`);
  if (document.querySelector('meta[name="keywords"]')) fail(where, "a meta keywords tag");
  if (document.documentElement.getAttribute("lang") !== (page.lang ?? "en")) fail(where, `html lang is ${document.documentElement.getAttribute("lang")}`);
  const card = file(`/og/${page.slug || "home"}.png`);
  if (!existsSync(card) || pngSize(card)?.join("x") !== "1200x630") fail(where, "Open Graph card is not a 1200x630 PNG");
  if (!og("image:alt") && og("image")) fail(where, "og:image has no alt text");
  for (const img of document.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (!img.hasAttribute("alt")) fail(where, `image ${src} has no alt attribute`);
    const t = src.endsWith(".png") ? target(src, path) : null;
    const [w, h] = [Number(img.getAttribute("width")), Number(img.getAttribute("height"))];
    const size = t && existsSync(file(t)) ? pngSize(file(t)) : null;
    if (size && w && h && Math.abs(w / h - size[0] / size[1]) > 0.01) fail(where, `image ${src} is ${w}x${h} in the page but ${size.join("x")} in the file`);
  }
  hreflangs.set(path, [...document.querySelectorAll("link[rel=alternate][hreflang]")].map((l) => l.getAttribute("href") ?? ""));
  hashes.push({ path, hash: contentHash(readPage(html, path).markdown) });

  const md = document.querySelector('link[rel="alternate"][type="text/markdown"]')?.getAttribute("href");
  const mdTarget = md ? target(md, path) : null;
  if (!mdTarget || !existsSync(file(mdTarget))) fail(where, `markdown mirror ${md} is missing`);
  else if (!readFileSync(file(mdTarget), "utf8").includes(`# ${page.h1}`)) fail(where, "markdown mirror lacks the heading");

  for (const a of document.querySelectorAll("a[href], link[href], script[src], img[src]")) {
    const ref = a.getAttribute("href") ?? a.getAttribute("src") ?? "";
    if (ref.startsWith("#") || ref.startsWith("data:")) continue;
    const t = target(ref, path);
    if (t && !existsSync(file(t))) fail(where, `broken link ${ref}`);
  }
}

if (authorIds.size !== 1) fail("JSON-LD", `the author has ${authorIds.size} different @id values`);
for (const p of twinProblems(PAGES)) fail("PAGES", p);
for (const [path, links] of hreflangs) {
  for (const href of links) {
    const other = site ? new URL(href).pathname.slice(base.length) : href;
    if (other !== path && !hreflangs.get(other)?.includes(new URL(path.slice(1), site ?? "http://site/").href)) fail(path, `hreflang ${href} does not link back`);
  }
}
const recorded: PageHashes = JSON.parse(readFileSync(HASH_FILE, "utf8"));
for (const path of staleHashes(recorded, hashes)) fail(path, `text changed since ${HASH_FILE}; run npm run build, then npm run page-hashes, and commit it`);

const llms = existsSync(file("/llms.txt")) ? readFileSync(file("/llms.txt"), "utf8") : "";
const full = existsSync(file("/llms-full.txt")) ? readFileSync(file("/llms-full.txt"), "utf8") : "";
for (const page of PAGES) {
  const mdPath = `${base}${pagePath(page.slug)}index.md`;
  if (!llms.includes(`${site ? site.origin : ""}${mdPath})`)) fail("/llms.txt", `does not list ${mdPath}`);
  if (!full.includes(`# ${page.h1}`)) fail("/llms-full.txt", `lacks ${page.h1}`);
}
const robots = existsSync(file("/robots.txt")) ? readFileSync(file("/robots.txt"), "utf8") : "";
if (!robots.includes("Allow: /")) fail("/robots.txt", "does not allow crawling");
if (site !== null) {
  if (!robots.includes(`Sitemap: ${new URL("sitemap.xml", site).href}`)) fail("/robots.txt", "does not name the sitemap");
  const map = existsSync(file("/sitemap.xml")) ? readFileSync(file("/sitemap.xml"), "utf8") : "";
  for (const page of PAGES) {
    const loc = new URL(pagePath(page.slug).slice(1), site).href;
    if (!new RegExp(`<loc>${loc.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")}</loc><lastmod>\\d{4}-\\d{2}-\\d{2}T[^<]+</lastmod>`).test(map)) fail("/sitemap.xml", `lacks ${loc} with its lastmod; a lastmod needs ${HASH_FILE} committed with the page's current fingerprint`);
  }
  const locs = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? "");
  if (locs.length !== PAGES.length) fail("/sitemap.xml", `${locs.length} URLs for ${PAGES.length} pages`);
  for (const loc of locs) if (/\.md$|\/404/.test(loc)) fail("/sitemap.xml", `lists ${loc}, which is not an indexable page`);
} else if (existsSync(file("/sitemap.xml"))) {
  fail("/sitemap.xml", "written without a site URL");
}

for (const css of readdirSync(join(dist, "_astro")).filter((n) => n.endsWith(".css"))) {
  for (const [, ref] of readFileSync(join(dist, "_astro", css), "utf8").matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (!ref || ref.startsWith("data:") || ref.startsWith("#")) continue;
    const t = target(ref, "/_astro/");
    if (t && !existsSync(file(t))) fail(`/_astro/${css}`, `broken url(${ref})`);
  }
}

const htmlFiles = readdirSync(dist, { recursive: true, withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(".html"));
for (const e of htmlFiles) {
  const where = `/${relative(dist, join(e.parentPath, e.name)).split(sep).join("/")}`;
  const markup = readFileSync(join(e.parentPath, e.name), "utf8").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, "");
  if (markup.includes("<!--")) fail(where, "an HTML comment, which reads as build notes in the page source");
}

const built = htmlFiles
  .filter((e) => e.name === "index.html")
  .map((e) => `/${relative(dist, e.parentPath).split(sep).join("/")}/`.replace("//", "/"));
for (const path of built) if (!PAGES.some((p) => pagePath(p.slug) === path)) fail(path, "built page with no entry in PAGES");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`SEO smoke: ${PAGES.length} pages${site ? ` at ${site.href}` : ""} look right.`);
