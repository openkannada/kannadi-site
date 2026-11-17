// Fails while the built site still shows a "PRASAD:" placeholder, so the
// About and Press pages are not published half filled: node scripts/placeholders.ts [dist]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { placeholders } from "../src/lib/deploy.ts";

const dist = process.argv[2] ?? "dist";
const found = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && /\.(html|md|txt)$/.test(e.name))
  .flatMap((e) => placeholders(readFileSync(join(e.parentPath, e.name), "utf8")).map((p) => `${join(e.parentPath, e.name)}: ${p}`));
if (found.length) {
  console.error(`${found.length} placeholders still need Prasad's words:\n${found.join("\n")}`);
  process.exit(1);
}
console.log("No placeholders left.");
