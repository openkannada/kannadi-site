// Checks the built site the way a search engine and an agent read it:
// node scripts/seo-smoke.ts [dist] [site URL the build used]
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { parseHTML } from "linkedom";

import { PAGES } from "../src/content/pages.ts";
import { pagePath } from "../src/content/site.ts";
import { plainText } from "../src/lib/seo.ts";

const dist = process.argv[2] ?? "dist";
const site = process.argv[3] ? new URL(process.argv[3]) : null;
const base = site ? site.pathname.replace(/\/$/, "") : "";
const problems: string[] = [];
const fail = (where: string, what: string) => problems.push(`${where}: ${what}`);
const file = (path: string) => join(dist, path.replace(/^\//, ""));
const NEEDED = ["WebPage", "FAQPage", "BreadcrumbList", "Person"];
const BY_KIND = { tool: ["WebApplication", "HowTo"], reference: ["LearningResource"] };

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
  if (description.length < 70 || description.length > 160) fail(where, `description is ${description.length} characters`);
  const h1 = document.querySelectorAll("h1");
  if (h1.length !== 1) fail(where, `${h1.length} h1 elements`);

  const csp = document.querySelector('meta[http-equiv="content-security-policy"]')?.getAttribute("content") ?? "";
  if (!csp.includes("default-src 'none'")) fail(where, "no strict Content-Security-Policy");
  if (document.querySelector("[style]")) fail(where, "an inline style attribute, which the CSP blocks");
  if (html.includes("<!--")) fail(where, "an HTML comment, which reads as build notes in the page source");

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
  for (const t of [...NEEDED, ...BY_KIND[page.kind]]) if (!types.includes(t)) fail(where, `JSON-LD lacks ${t}`);
  if (!page.slug) for (const t of ["WebSite", "SoftwareSourceCode"]) if (!types.includes(t)) fail(where, `JSON-LD lacks ${t}`);
  const faq = graph.find((n: { "@type": string }) => n["@type"] === "FAQPage")?.mainEntity ?? [];
  const visible = [...document.querySelectorAll(".faq summary")].map((s) => plainText(s.innerHTML));
  const marked = faq.map((q: { name: string }) => q.name);
  if (JSON.stringify(visible) !== JSON.stringify(marked)) fail(where, "FAQ questions on the page and in JSON-LD differ");

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
    if (!map.includes(`<loc>${loc}</loc>`)) fail("/sitemap.xml", `lacks ${loc}`);
  }
} else if (existsSync(file("/sitemap.xml"))) {
  fail("/sitemap.xml", "written without a site URL");
}

for (const css of readdirSync(join(dist, "_astro")).filter((n) => n.endsWith(".css"))) {
  for (const [, ref] of readFileSync(join(dist, "_astro", css), "utf8").matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (!ref || ref.startsWith("data:")) continue;
    const t = target(ref, "/_astro/");
    if (t && !existsSync(file(t))) fail(`/_astro/${css}`, `broken url(${ref})`);
  }
}

const built = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === "index.html")
  .map((e) => `/${relative(dist, e.parentPath).split(sep).join("/")}/`.replace("//", "/"));
for (const path of built) if (!PAGES.some((p) => pagePath(p.slug) === path)) fail(path, "built page with no entry in PAGES");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`SEO smoke: ${PAGES.length} pages${site ? ` at ${site.href}` : ""} look right.`);
