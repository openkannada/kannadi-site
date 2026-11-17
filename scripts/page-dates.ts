// Records each page's text fingerprint, and today's date for pages whose text
// changed, in data/page-dates.json for the sitemap: npm run build && npm run page-dates
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { readPage } from "../src/lib/agent-text.ts";
import { contentHash, type PageDates, updateDates } from "../src/lib/freshness.ts";

const dist = process.argv[2] ?? "dist";
const file = "data/page-dates.json";
const pages = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === "index.html")
  .map((e) => {
    const dir = relative(dist, e.parentPath).split(sep).join("/");
    const path = dir ? `/${dir}/` : "/";
    return { path, hash: contentHash(readPage(readFileSync(join(e.parentPath, e.name), "utf8"), path).markdown) };
  })
  .filter((p) => p.path !== "/404/");
const today = new Date().toISOString().slice(0, 10);
const before: PageDates = JSON.parse(readFileSync(file, "utf8"));
const after = updateDates(before, pages, today);
writeFileSync(file, `${JSON.stringify(after, null, 2)}\n`);
const changed = Object.keys(after).filter((p) => before[p]?.hash !== after[p]?.hash);
console.log(changed.length ? `Dated ${today}: ${changed.join(", ")}` : "No page text changed.");
