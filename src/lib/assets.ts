// The hashed build files under /_astro/ that a page or another build file names, and the ones a deploy keeps.

const NAME = String.raw`[\w.@~-]+\.(?:m?js|css|wasm|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|avif|ico|tsv|json|txt)(?![\w.])`;

/**
 * Each "/_astro/<name>" in `text`, and "_astro/<name>" as Vite lists preloads. Inside a build file, also its
 * "./<name>" imports, which resolve to the same folder.
 */
export function assetRefs(text: string, inAstro = false): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(new RegExp(String.raw`(?<![\w-])/?_astro/(${NAME})`, "g"))) out.add(`/_astro/${m[1]}`);
  if (inAstro) for (const m of text.matchAll(new RegExp(String.raw`["'\x60(]\./(${NAME})`, "g"))) out.add(`/_astro/${m[1]}`);
  return [...out].sort();
}

/** A line for each build file a live page names that did not answer 200. */
export function assetProblems(checked: { ref: string; status: number }[]): string[] {
  return checked.filter((c) => c.status !== 200).map((c) => `${c.ref}: status ${c.status}, so a page that names it loads without it`);
}

export interface Kept {
  /** File name to content, for each file the new build lacks. */
  files: Map<string, Uint8Array>;
  /** Files the live site named but did not serve. */
  failed: string[];
}

/**
 * The live build files to carry into a new build: those `refs` name that `built` lacks, and the files they name in
 * turn. A file the new build has is the same file, so what it names is there too.
 */
export async function keepAssets(refs: string[], built: Set<string>, fetchFile: (ref: string) => Promise<Uint8Array | null>): Promise<Kept> {
  const files = new Map<string, Uint8Array>();
  const failed: string[] = [];
  const queue = [...refs];
  const seen = new Set<string>();
  while (queue.length) {
    const ref = queue.pop() ?? "";
    const name = ref.slice("/_astro/".length);
    if (seen.has(ref) || built.has(name)) continue;
    seen.add(ref);
    const body = await fetchFile(ref);
    if (!body) {
      failed.push(ref);
      continue;
    }
    files.set(name, body);
    if (/\.(m?js|css)$/.test(name)) queue.push(...assetRefs(new TextDecoder().decode(body), true));
  }
  return { files, failed };
}

/** Where a deploy records the files it kept, outside dist, for the live check that follows. */
export const KEPT_FILE = ".deploy/kept-assets.json";
