// Before a deploy replaces the site, copies the live build files under /_astro/ that the new build does not
// have into dist/_astro, so a page already open, or HTML still cached, keeps its styles and scripts until
// the next deploy: node scripts/keep-assets.ts <site URL> [dist]
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { assetRefs } from "../src/lib/assets.ts";

const site = new URL(process.argv[2] ?? "");
const dist = process.argv[3] ?? "dist";
const folder = join(dist, "_astro");
mkdirSync(folder, { recursive: true });
const built = new Set(readdirSync(folder));
const pages = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === "index.html")
  .map((e) => `/${relative(dist, e.parentPath).split(sep).join("/")}/`.replace("//", "/"));

async function get(path: string): Promise<Response | null> {
  try {
    const res = await fetch(new URL(path, site));
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

const queue = (await Promise.all(pages.map(async (p) => assetRefs((await (await get(p))?.text()) ?? "")))).flat();
const seen = new Set<string>();
let kept = 0;
while (queue.length) {
  const ref = queue.pop() ?? "";
  const name = ref.slice("/_astro/".length);
  if (seen.has(ref) || built.has(name)) continue;
  seen.add(ref);
  const res = await get(ref);
  if (!res) continue;
  const body = new Uint8Array(await res.arrayBuffer());
  writeFileSync(join(folder, name), body);
  kept++;
  if (/\.(m?js|css)$/.test(name)) queue.push(...assetRefs(new TextDecoder().decode(body), true));
}
console.log(kept ? `Kept ${kept} build files from the live site for pages still open.` : existsSync(folder) ? "The live site names no build file this build lacks." : "");
