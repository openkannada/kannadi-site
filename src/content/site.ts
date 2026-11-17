export const SITE = {
  name: "kannadi",
  nameKn: "ಕನ್ನಡಿ",
  tagline: "Kannada editor and converter",
  language: "en-IN",
  repository: "https://github.com/openkannada/kannadi",
  siteRepository: "https://github.com/openkannada/kannadi-site",
  /** The library is MIT OR Apache-2.0, at the user's choice. */
  license: ["https://opensource.org/license/mit", "https://www.apache.org/licenses/LICENSE-2.0"],
} as const;

/** The organization behind the site; kannadi is its first project. */
export const ORG = {
  name: "Open Kannada",
  github: "https://github.com/openkannada",
  founders: [
    { name: "Prasad Subrahmanya", url: "https://prasad.tech" },
    { name: "Neha Prasad", url: "https://neha-prasad.com/" },
  ],
  supporter: { name: "DataRavel Inc.", alternateName: "Luminik", label: "DataRavel Inc. (dba Luminik)", url: "https://www.luminik.io" },
  contacts: [
    { contactType: "customer support", email: "support@luminik.io" },
    { contactType: "press", email: "founders@luminik.io" },
    { contactType: "security", email: "prasad@luminik.io" },
  ],
} as const;

/**
 * IndexNow tells Bing and other engines which pages changed. The key is public by design and served as
 * public/<key>.txt. Switch it on once the site is live at its own domain.
 */
export const INDEXNOW = {
  enabled: false,
  key: "3601f9fcb12d8a620b36768a880d87ae",
} as const;

/**
 * Where the site lives, and whether it is launched. Until launch, every response is sent with X-Robots-Tag: noindex
 * and IndexNow stays quiet; launching is this 1 flag, set to true in a pull request.
 */
export const LIVE = {
  origin: "https://openkannada.org",
  host: "openkannada.org",
  launched: false,
} as const;

/** The Ask AI menu on every page but home. */
export const ASK_AI = {
  label: "Ask AI",
  copy: "Copy page as Markdown",
  copied: "Copied",
  open: (name: string) => `Open in ${name}`,
  prompt: (url: string) => `Read ${url} and answer my questions about it.`,
} as const;

export const AUTHOR = {
  name: "Prasad Subrahmanya",
  url: "https://prasad.tech",
  sameAs: ["https://github.com/prasadus92"],
} as const;

/** The site's absolute origin and base, such as "https://example.org/", or null until a domain is chosen. */
export function siteUrl(value: string | undefined = process.env.SITE_URL): URL | null {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`SITE_URL must be http or https: ${value}`);
  if (url.search || url.hash) throw new Error(`SITE_URL must have no query or fragment: ${value}`);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

/** The path of a page slug, such as "/nudi-to-unicode/" or "/". */
export function pagePath(slug: string): string {
  return slug ? `/${slug}/` : "/";
}
