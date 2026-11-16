export const SITE = {
  name: "kannadi",
  nameKn: "ಕನ್ನಡಿ",
  tagline: "Kannada editor and converter",
  language: "en-IN",
  repository: "https://github.com/prasadus92/kannadi",
  siteRepository: "https://github.com/prasadus92/kannadi-site",
  license: "https://opensource.org/license/mit",
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
