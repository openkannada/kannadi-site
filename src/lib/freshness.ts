// Sitemap lastmod dates that change only when a page's text changes.
import { createHash } from "node:crypto";

/** The recorded fingerprint of each page path and the date its text last changed. */
export type PageDates = Record<string, { hash: string; lastmod: string }>;

/** A fingerprint of a page's text. Link and image targets are left out, so the site URL and base path do not change it. */
export function contentHash(markdown: string): string {
  const text = markdown.replace(/\]\([^)]*\)/g, "]()").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** The dates after a build: a page keeps its date while its fingerprint is unchanged, and gets `today` when it changes or is new. */
export function updateDates(dates: PageDates, pages: { path: string; hash: string }[], today: string): PageDates {
  const next: PageDates = {};
  for (const { path, hash } of [...pages].sort((a, b) => a.path.localeCompare(b.path))) {
    const old = dates[path];
    next[path] = old && old.hash === hash ? old : { hash, lastmod: today };
  }
  return next;
}

/** Paths whose recorded fingerprint is missing or differs from the build, so their lastmod would be wrong. */
export function staleDates(dates: PageDates, pages: { path: string; hash: string }[]): string[] {
  return pages.filter(({ path, hash }) => dates[path]?.hash !== hash).map((p) => p.path);
}
