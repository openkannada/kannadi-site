// Sitemap lastmod dates that change only when a page's text changes: each page's text
// fingerprint is recorded in data/page-hashes.json, and its date is the commit that recorded it.
import { createHash } from "node:crypto";

export const HASH_FILE = "data/page-hashes.json";

/** The recorded fingerprint of each page path. */
export type PageHashes = Record<string, string>;

/** A fingerprint of a page's text. Link and image targets are left out, so the site URL and base path do not change it. */
export function contentHash(markdown: string): string {
  const text = markdown.replace(/\]\([^)]*\)/g, "]()").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** The fingerprints of a build, sorted by path, for the hash file. */
export function recordHashes(pages: { path: string; hash: string }[]): PageHashes {
  return Object.fromEntries([...pages].sort((a, b) => a.path.localeCompare(b.path)).map((p) => [p.path, p.hash]));
}

/** Paths whose recorded fingerprint is missing or differs from the build, so their lastmod would be wrong. */
export function staleHashes(recorded: PageHashes, pages: { path: string; hash: string }[]): string[] {
  return pages.filter(({ path, hash }) => recorded[path] !== hash).map((p) => p.path);
}

/**
 * When a page's current text was committed: the date of the newest commit that added its fingerprint to the
 * hash file, so on main it is the merge that brought the change. `git` runs git with the given arguments
 * and returns its output; undefined when no commit has the fingerprint yet.
 */
export function lastmodOf(hash: string, git: (args: string[]) => string): string | undefined {
  // --first-parent -m dates a change by the merge that brought it to the branch, not the branch's own commit.
  const date = git(["log", "-1", "--first-parent", "-m", "--format=%cI", `-S"${hash}"`, "--", HASH_FILE]).trim();
  return date || undefined;
}
