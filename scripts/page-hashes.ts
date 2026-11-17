// Records each page's text fingerprint in data/page-hashes.json. The sitemap dates a page by the
// commit that changed its fingerprint, so commit the file with the change: npm run build && npm run page-hashes
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { readPage } from "../src/lib/agent-text.ts";
import { contentHash, HASH_FILE, type PageHashes, recordHashes } from "../src/lib/freshness.ts";

const dist = process.argv[2] ?? "dist";
const pages = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === "index.html")
  .map((e) => {
    const dir = relative(dist, e.parentPath).split(sep).join("/");
    const path = dir ? `/${dir}/` : "/";
    return { path, hash: contentHash(readPage(readFileSync(join(e.parentPath, e.name), "utf8"), path).markdown) };
  });
const before: PageHashes = JSON.parse(readFileSync(HASH_FILE, "utf8"));
const after = recordHashes(pages);
writeFileSync(HASH_FILE, `${JSON.stringify(after, null, 2)}\n`);
const changed = Object.keys(after).filter((p) => before[p] !== after[p]);
console.log(changed.length ? `Text changed on ${changed.join(", ")}. Commit ${HASH_FILE} with the change.` : "No page text changed.");
