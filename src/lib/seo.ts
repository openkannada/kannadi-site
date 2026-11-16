import type { Page } from "../content/pages.ts";
import { AUTHOR, SITE, pagePath } from "../content/site.ts";

type Node = Record<string, unknown>;

/** Text of trusted page HTML, for JSON-LD and meta tags. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolves a site path against the site URL; relative to the site root while no URL is set. */
export function absolute(path: string, site: URL | null): string {
  return site ? new URL(path.replace(/^\//, ""), site).href : path;
}

/**
 * The page's JSON-LD graph: the editor as a WebApplication, its how-to steps,
 * FAQ, breadcrumbs, the library's source code and its author.
 */
export function jsonLd(page: Page, site: URL | null, home: Page): Node {
  const url = absolute(pagePath(page.slug), site);
  const root = absolute("/", site);
  const id = (name: string, base = url) => `${base}#${name}`;
  const author = { "@id": id("author", root) };

  const graph: Node[] = [
    {
      "@type": "WebPage",
      "@id": id("page"),
      url,
      name: page.title,
      description: page.description,
      inLanguage: SITE.language,
      isPartOf: { "@id": id("website", root) },
      mainEntity: { "@id": id("app") },
      breadcrumb: { "@id": id("breadcrumb") },
      author,
    },
    {
      "@type": "WebApplication",
      "@id": id("app"),
      name: page.slug ? `${page.h1} by ${SITE.name}` : `${SITE.name} ${SITE.tagline}`,
      url,
      description: plainText(page.intro),
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a browser with WebAssembly",
      inLanguage: ["kn", "en"],
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      featureList: [
        "Nudi, Baraha and Akruti to Unicode",
        "Unicode to Nudi and Baraha ANSI",
        "Opens TXT, DOCX and HTML files",
        "Marks unknown glyphs and malformed syllables with fixes",
        "Kannada typing in Baraha and ISO 15919 letters",
        "Akshara and word counts",
        "Saves DOCX, HTML, TXT and Nudi text",
        "Runs offline in the browser",
      ],
      author,
      isBasedOn: { "@id": id("library", root) },
    },
    {
      "@type": "HowTo",
      "@id": id("howto"),
      name: page.howTitle,
      step: page.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text: plainText(text) })),
    },
    {
      "@type": "FAQPage",
      "@id": id("faq"),
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: plainText(f.q),
        acceptedAnswer: { "@type": "Answer", text: plainText(f.a) },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": id("breadcrumb"),
      itemListElement: [
        { "@type": "ListItem", position: 1, name: home.name, item: root },
        ...(page.slug ? [{ "@type": "ListItem", position: 2, name: page.name, item: url }] : []),
      ],
    },
    {
      "@type": "Person",
      "@id": id("author", root),
      name: AUTHOR.name,
      url: AUTHOR.url,
      sameAs: [...AUTHOR.sameAs],
    },
  ];

  if (!page.slug) {
    graph.push(
      {
        "@type": "WebSite",
        "@id": id("website", root),
        url: root,
        name: SITE.name,
        alternateName: SITE.nameKn,
        inLanguage: SITE.language,
        publisher: author,
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": id("library", root),
        name: "kannadi",
        description: "An open-source Rust library for Kannada text: legacy font conversion, transliteration, normalization and akshara segmentation.",
        codeRepository: SITE.repository,
        programmingLanguage: ["Rust", "WebAssembly"],
        license: SITE.license,
        author,
      },
    );
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/** JSON for a script element: "<" is escaped so the text can never close the element. */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
