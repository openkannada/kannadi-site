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

/** Who holds what: contributors keep their copyright; the names and logos are covered by TRADEMARKS.md. Trusted HTML. */
export const RIGHTS = {
  en: "Contributors keep the copyright to their work and license it under the project's licenses. The Open Kannada and kannadi names and logos are covered by <a href=\"https://github.com/openkannada/kannadi/blob/main/TRADEMARKS.md\">TRADEMARKS.md</a>.",
  kn: "ಕೊಡುಗೆದಾರರು ತಮ್ಮ ಕೆಲಸದ ಕೃತಿಸ್ವಾಮ್ಯವನ್ನು ತಾವೇ ಉಳಿಸಿಕೊಳ್ಳುತ್ತಾರೆ ಮತ್ತು ಅದನ್ನು ಯೋಜನೆಯ ಲೈಸೆನ್ಸ್‌ಗಳ ಅಡಿಯಲ್ಲಿ ನೀಡುತ್ತಾರೆ. Open Kannada ಮತ್ತು kannadi ಹೆಸರುಗಳು ಹಾಗೂ ಲೋಗೊಗಳು <a href=\"https://github.com/openkannada/kannadi/blob/main/TRADEMARKS.md\">TRADEMARKS.md</a> ಗೆ ಒಳಪಟ್ಟಿವೆ.",
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
 * public/<key>.txt. On since 25 November 2026: each deploy to main sends the pages whose lastmod changed.
 */
export const INDEXNOW = {
  enabled: true,
  key: "3601f9fcb12d8a620b36768a880d87ae",
} as const;

/**
 * Where the site lives, and whether it is launched. Before launch every response was sent with X-Robots-Tag: noindex
 * and IndexNow stayed quiet; launched on 22 November 2026.
 */
export const LIVE = {
  origin: "https://openkannada.org",
  host: "openkannada.org",
  launched: true,
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
