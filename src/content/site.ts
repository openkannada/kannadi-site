export const SITE = {
  name: "kannadi",
  nameKn: "ಕನ್ನಡಿ",
  tagline: "Kannada editor and converter",
  language: "en-IN",
  repository: "https://github.com/openkannada/kannadi",
  siteRepository: "https://github.com/openkannada/kannadi-site",
  license: "https://opensource.org/license/mit",
} as const;

/** The organization behind the site; kannadi is its first project. */
export const ORG = {
  name: "Open Kannada",
  github: "https://github.com/openkannada",
  founders: [
    { name: "Prasad Subrahmanya", nameKn: "ಪ್ರಸಾದ್ ಸುಬ್ರಹ್ಮಣ್ಯ", url: "https://prasad.tech" },
    { name: "Neha Prasad", nameKn: "ನೇಹಾ ಪ್ರಸಾದ್", url: "https://neha-prasad.com/" },
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
