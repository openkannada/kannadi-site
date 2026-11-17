// Text files for AI assistants and crawlers, made from the built HTML pages.
import { parseHTML } from "linkedom";
import { NodeHtmlMarkdown } from "node-html-markdown";

export interface BuiltPage {
  /** URL path, such as "/" or "/nudi-to-unicode/". */
  path: string;
  title: string;
  description: string;
  /** The page's main content as markdown. */
  markdown: string;
}

const STRIP = ["script", "style", "noscript", "template", "dialog", "[data-md-skip]", "[aria-hidden='true']"];

const converter = new NodeHtmlMarkdown({
  bulletMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  useLinkReferenceDefinitions: false,
  keepDataImages: false,
});

/** Reads a built page: its title, description and the markdown of its main element. */
export function readPage(html: string, path: string): BuiltPage {
  const { document } = parseHTML(html);
  const main = document.querySelector("main");
  if (!main) throw new Error(`${path} has no <main> element`);
  for (const el of main.querySelectorAll(STRIP.join(","))) el.remove();
  // Keys to type read as code, and FAQ questions as headings.
  for (const kbd of main.querySelectorAll("kbd")) kbd.replaceWith(Object.assign(document.createElement("code"), { textContent: kbd.textContent }));
  for (const summary of main.querySelectorAll("summary")) {
    const h = document.createElement("h3");
    h.innerHTML = summary.innerHTML;
    summary.replaceWith(h);
  }
  return {
    path,
    title: document.querySelector("title")?.textContent?.trim() ?? path,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "",
    markdown: tidy(converter.translate(main.innerHTML)),
  };
}

function tidy(markdown: string): string {
  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

/** The markdown mirror of 1 page, with a short front matter. */
export function mirror(page: BuiltPage, url: string): string {
  const yaml = (value: string) => JSON.stringify(value);
  return `---\ntitle: ${yaml(page.title)}\ndescription: ${yaml(page.description)}\nurl: ${yaml(url)}\n---\n\n${page.markdown}\n`;
}

/** The markdown path of a page path: "/x/" serves "/x/index.md". */
export function markdownPath(path: string): string {
  return `${path}index.md`;
}

export interface SiteInfo {
  name: string;
  summary: string;
  details: string[];
  url: (path: string) => string;
}

/** llms.txt: the site in a paragraph, then every page with a link to its markdown. */
export function llmsIndex(pages: BuiltPage[], site: SiteInfo): string {
  const [home, ...rest] = pages;
  const line = (p: BuiltPage) => `- [${p.title}](${site.url(markdownPath(p.path))}): ${p.description}`;
  return [
    `# ${site.name}`,
    "",
    `> ${site.summary}`,
    "",
    ...site.details,
    "",
    "## Editor",
    "",
    ...(home ? [line(home)] : []),
    "",
    "## Converters, typing and letters",
    "",
    ...rest.map(line),
    "",
    "## Optional",
    "",
    `- [Full text of every page](${site.url("/llms-full.txt")})`,
    "",
  ].join("\n");
}

/** llms-full.txt: every page's markdown in 1 file. */
export function llmsFull(pages: BuiltPage[], site: SiteInfo): string {
  const sections = pages.map((p) => `# ${p.title}\n\nSource: ${site.url(p.path)}\n\n${p.markdown}`);
  return `# ${site.name}\n\n> ${site.summary}\n\n${sections.join("\n\n---\n\n")}\n`;
}

/** sitemap.xml for absolute page URLs. */
export function sitemap(entries: { loc: string; lastmod?: string | undefined }[]): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const lines = entries.map((e) => `  <url><loc>${escape(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines}\n</urlset>\n`;
}

/** robots.txt that welcomes search and AI crawlers. */
export function robots(sitemapUrl: string | null): string {
  return ["User-agent: *", "Allow: /", ...(sitemapUrl ? ["", `Sitemap: ${sitemapUrl}`] : []), ""].join("\n");
}
