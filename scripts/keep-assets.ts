// Before a deploy replaces the site, copies the live build files under /_astro/ that the new build lacks into
// dist/_astro, so a page already open, or HTML still cached, keeps its styles and scripts until the next deploy.
// It never stops a deploy: node scripts/keep-assets.ts <site URL> [dist]
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

import { assetRefs, KEPT_FILE, keepAssets } from "../src/lib/assets.ts";

const site = new URL(process.argv[2] ?? "");
const dist = process.argv[3] ?? "dist";
const folder = join(dist, "_astro");
mkdirSync(folder, { recursive: true });
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

const live = await Promise.all(pages.map(async (p) => (await get(p))?.text() ?? null));
const unread = pages.filter((_, i) => live[i] === null);
const refs = live.flatMap((html) => (html ? assetRefs(html) : []));
const { files, failed } = await keepAssets(refs, new Set(readdirSync(folder)), async (ref) => {
  const res = await get(ref);
  return res ? new Uint8Array(await res.arrayBuffer()) : null;
});
for (const [name, body] of files) writeFileSync(join(folder, name), body);
mkdirSync(dirname(KEPT_FILE), { recursive: true });
writeFileSync(KEPT_FILE, `${JSON.stringify([...files.keys()].map((n) => `/_astro/${n}`).sort(), null, 2)}\n`);

if (unread.length === pages.length) console.warn(`Warning: could not read any live page at ${site.href}, so nothing was kept. Normal on a first deploy.`);
else if (unread.length) console.warn(`Warning: could not read ${unread.length} live pages: ${unread.join(", ")}`);
if (failed.length) console.warn(`Warning: the live site named ${failed.length} build files it did not serve: ${failed.join(", ")}`);
console.log(`Kept ${files.size} live build files that this build lacks.`);
