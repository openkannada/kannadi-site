/** The site base without its trailing slash: "" at a domain root, "/kannada" under a subpath. */
export const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");

/** A site path under the base, such as "/nudi-to-unicode/". */
export function href(path: string): string {
  return `${BASE}${path}`;
}

/** Points the root-relative links in trusted page HTML at the base. */
export function withBase(html: string): string {
  return html.replace(/href="\/(?!\/)/g, `href="${BASE}/`);
}
