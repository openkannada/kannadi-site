import type { Page } from "../content/pages.ts";
import { AUTHOR, ORG, SITE, pagePath } from "../content/site.ts";

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

const SEGMENTER = new Intl.Segmenter("kn", { granularity: "grapheme" });

/** Length as a reader sees it: a Kannada letter with its vowel sign counts once, where .length counts every code unit. */
export function graphemes(text: string): number {
  return [...SEGMENTER.segment(text)].length;
}

/** Resolves a site path against the site URL; relative to the site root while no URL is set. */
export function absolute(path: string, site: URL | null): string {
  return site ? new URL(path.replace(/^\//, ""), site).href : path;
}

/**
 * The page's JSON-LD graph: the page, what it offers (the editor with its
 * how-to, a reference chart, or on the About and Press pages the organization
 * and its founders), FAQ, breadcrumbs, author, and on the home page the site
 * and the library's source code.
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
      inLanguage: page.lang === "kn" ? "kn-IN" : SITE.language,
      isPartOf: { "@id": id("website", root) },
      mainEntity: { "@id": page.kind === "info" ? id("organization", root) : id(page.kind === "tool" ? "app" : "resource") },
      breadcrumb: { "@id": id("breadcrumb") },
      author,
    },
    ...mainNodes(page, url, id, author, root),
    ...(page.faq.length
      ? [
          {
            "@type": "FAQPage",
            "@id": id("faq"),
            mainEntity: page.faq.map((f) => ({
              "@type": "Question",
              name: plainText(f.q),
              acceptedAnswer: { "@type": "Answer", text: plainText(f.a) },
            })),
          },
        ]
      : []),
    {
      "@type": "BreadcrumbList",
      "@id": id("breadcrumb"),
      itemListElement: [
        { "@type": "ListItem", position: 1, name: home.name, item: absolute(pagePath(home.slug), site) },
        ...(page.slug !== home.slug ? [{ "@type": "ListItem", position: 2, name: page.name, item: url }] : []),
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
        name: ORG.name,
        inLanguage: SITE.language,
        publisher: { "@id": id("organization", root) },
      },
      ...organization(id, author, root),
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

/** The editor as a WebApplication with its how-to, or a reference page as a LearningResource. */
function mainNodes(page: Page, url: string, id: (name: string, base?: string) => string, author: Node, root: string): Node[] {
  if (page.kind === "info") return organization(id, author, root);
  if (page.kind === "reference") {
    return [
      {
        "@type": "LearningResource",
        "@id": id("resource"),
        name: page.h1,
        url,
        description: page.description,
        learningResourceType: "Reference chart",
        teaches: page.name,
        inLanguage: ["kn", "en"],
        isAccessibleForFree: true,
        author,
        isBasedOn: { "@id": id("library", root) },
      },
    ];
  }
  return [
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
        "Kannada typing in English letters with word suggestions, Baraha and ISO 15919",
        "Voice typing in Kannada where the browser supports it",
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
  ];
}

/** Open Kannada with its founders: Prasad is the page author, the others are added as people. */
function organization(id: (name: string, base?: string) => string, author: Node, root: string): Node[] {
  const personId = (name: string) => id(name.toLowerCase().replace(/\W+/g, "-"), root);
  return [
    {
      "@type": "Organization",
      "@id": id("organization", root),
      name: ORG.name,
      url: root,
      logo: `${root}icon-512.png`,
      sameAs: [ORG.github],
      founder: ORG.founders.map((f) => (f.name === AUTHOR.name ? author : { "@id": personId(f.name) })),
      sponsor: { "@type": "Organization", name: ORG.supporter.name, alternateName: ORG.supporter.alternateName, url: ORG.supporter.url },
      contactPoint: ORG.contacts.map((c) => ({ "@type": "ContactPoint", ...c })),
    },
    ...ORG.founders.filter((f) => f.name !== AUTHOR.name).map((f) => ({ "@type": "Person", "@id": personId(f.name), name: f.name, url: f.url })),
  ];
}

/**
 * hreflang links for a page with a twin in the other language: both pages and x-default (the English page),
 * as absolute URLs. Empty when the page has no twin or the site has no URL yet.
 */
export function alternates(page: Page, pages: Page[], site: URL | null): { hreflang: string; href: string }[] {
  const twin = page.twin === undefined ? undefined : pages.find((p) => p.slug === page.twin);
  if (!site || !twin) return [];
  const url = (p: Page) => absolute(pagePath(p.slug), site);
  const lang = (p: Page) => p.lang ?? "en";
  const english = lang(page) === "en" ? page : twin;
  return [
    { hreflang: lang(page), href: url(page) },
    { hreflang: lang(twin), href: url(twin) },
    { hreflang: "x-default", href: url(english) },
  ].sort((a, b) => a.hreflang.localeCompare(b.hreflang));
}

/** Twins that do not name each other back, or that name a missing page or a page in the same language. */
export function twinProblems(pages: Page[]): string[] {
  return pages.flatMap((p) => {
    if (p.twin === undefined) return [];
    const twin = pages.find((q) => q.slug === p.twin);
    if (!twin) return [`${p.slug || "home"}: twin ${p.twin} does not exist`];
    if (twin.twin !== p.slug) return [`${p.slug || "home"}: ${twin.slug || "home"} does not name it back`];
    if ((twin.lang ?? "en") === (p.lang ?? "en")) return [`${p.slug || "home"}: twin ${twin.slug || "home"} is in the same language`];
    return [];
  });
}

/** JSON for a script element: "<" is escaped so the text can never close the element. */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
