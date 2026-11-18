import { isEditor, isHome, type Page, type ProjectPage } from "../content/pages.ts";
import { SITE_STRINGS } from "../i18n/site.ts";
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

/** What a page is about, by kind: its main node's id in the page. */
const MAIN: Record<Page["kind"], string> = { tool: "app", reference: "resource", project: "project", info: "", home: "" };

/**
 * The page's JSON-LD graph: the page, what it offers (the editor with its
 * how-to, a reference chart, a project, or on the home, About and Press pages
 * the organization and its founders), FAQ, breadcrumbs, author, on the home
 * page the site, and on the editor the library's source code.
 */
export function jsonLd(page: Page, site: URL | null, home: Page): Node {
  const url = absolute(pagePath(page.slug), site);
  const root = absolute("/", site);
  const id = (name: string, base = url) => `${base}#${name}`;
  const author = { "@id": id("author", root) };
  const library = id("library", absolute(pagePath("editor"), site));

  const graph: Node[] = [
    {
      "@type": "WebPage",
      "@id": id("page"),
      url,
      name: page.title,
      description: page.description,
      inLanguage: page.lang === "kn" ? "kn-IN" : SITE.language,
      isPartOf: { "@id": id("website", root) },
      mainEntity: { "@id": MAIN[page.kind] ? id(MAIN[page.kind]) : id("organization", root) },
      breadcrumb: { "@id": id("breadcrumb") },
      author,
    },
    ...mainNodes(page, url, id, author, root, library),
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
      itemListElement: isHome(page)
        ? [{ "@type": "ListItem", position: 1, name: page.name, item: url }]
        : [
            { "@type": "ListItem", position: 1, name: home.name, item: absolute(pagePath(home.slug), site) },
            { "@type": "ListItem", position: 2, name: page.name, item: url },
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

  if (page.kind === "home") {
    graph.push({
      "@type": "WebSite",
      "@id": id("website", root),
      url: root,
      name: ORG.name,
      inLanguage: SITE.language,
      publisher: { "@id": id("organization", root) },
    });
  }
  if (page.slug === "editor") {
    graph.push(
      {
        "@type": "SoftwareSourceCode",
        "@id": library,
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

/** The editor as a WebApplication with its how-to, a reference page as a LearningResource, or a project as itself. */
function mainNodes(page: Page, url: string, id: (name: string, base?: string) => string, author: Node, root: string, library: string): Node[] {
  if (page.kind === "info" || page.kind === "home") return organization(id, author, root);
  if (page.kind === "project") return [project(page, url, id, author, root)];
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
        isBasedOn: { "@id": library },
      },
    ];
  }
  return [
    {
      "@type": "WebApplication",
      "@id": id("app"),
      name: isEditor(page) ? SITE_STRINGS[page.lang ?? "en"].appName : `${page.h1} by ${SITE.name}`,
      url,
      description: plainText(page.intro),
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a browser with WebAssembly",
      inLanguage: ["kn", "en"],
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      featureList: SITE_STRINGS[page.lang ?? "en"].features,
      author,
      isBasedOn: { "@id": library },
    },
    {
      "@type": "HowTo",
      "@id": id("howto"),
      name: page.howTitle,
      step: page.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text: plainText(text) })),
    },
  ];
}

/** A project page's subject: a dataset of measured results, or a work with its licenses and any released downloads. */
function project(page: ProjectPage, url: string, id: (name: string, base?: string) => string, author: Node, root: string): Node {
  const text = (p: ProjectPage["sections"][number]) => [...(p.paragraphs ?? []), ...(p.items ?? [])].map(plainText).join(" ");
  const method = page.sections.find((p) => p.id === "method");
  const license = page.licenses.length === 1 ? page.licenses[0] : page.licenses;
  return {
    "@type": page.schema,
    "@id": id("project"),
    name: page.h1,
    url,
    description: plainText(page.intro),
    inLanguage: page.lang === "kn" ? "kn-IN" : SITE.language,
    license,
    isAccessibleForFree: true,
    creator: { "@type": "Organization", "@id": id("organization", root), name: ORG.name, url: root },
    author,
    ...(page.schema === "Dataset" && method ? { measurementTechnique: text(method) } : {}),
    ...(page.releases?.length
      ? {
          hasPart: page.releases.map((r) => ({
            "@type": "CreativeWork",
            name: r.name,
            version: r.version,
            url: r.page,
            license,
            isAccessibleForFree: true,
            encoding: { "@type": "MediaObject", contentUrl: r.zip, encodingFormat: "application/zip" },
          })),
        }
      : {}),
  };
}

/** Open Kannada with its founders: the page author is reused by id, the others are added as people. */
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
