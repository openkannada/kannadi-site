// The hashed build files under /_astro/ that a page or another build file names.

const NAME = String.raw`[\w.@~-]+\.(?:js|mjs|css|wasm|woff2?|svg|png|webp|avif|tsv|json|txt)`;

/** Each "/_astro/<name>" in `text`; inside a build file, also its "./<name>" imports, which resolve to the same folder. */
export function assetRefs(text: string, inAstro = false): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(new RegExp(String.raw`/_astro/(${NAME})`, "g"))) out.add(`/_astro/${m[1]}`);
  if (inAstro) for (const m of text.matchAll(new RegExp(String.raw`["'\x60(]\./(${NAME})`, "g"))) out.add(`/_astro/${m[1]}`);
  return [...out].sort();
}

/** A line for each build file a live page names that did not answer 200. */
export function assetProblems(checked: { ref: string; status: number }[]): string[] {
  return checked.filter((c) => c.status !== 200).map((c) => `${c.ref}: status ${c.status}, so a page that names it loads without it`);
}
