// Fails while the built site still shows a "PRASAD:" placeholder, so the
// About and Press pages are not published half filled, and no page waits for a
// native reader's check: node scripts/placeholders.ts [dist]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { PAGES } from "../src/content/pages.ts";
import { placeholders, unreviewed } from "../src/lib/deploy.ts";

const dist = process.argv[2] ?? "dist";
const found = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && /\.(html|md|txt)$/.test(e.name))
  .flatMap((e) => placeholders(readFileSync(join(e.parentPath, e.name), "utf8")).map((p) => `${join(e.parentPath, e.name)}: ${p}`));
const waiting = unreviewed(PAGES);
if (found.length) console.error(`${found.length} placeholders still need their words or photos:\n${found.join("\n")}`);
// Drafts are left out of PAGES; any here means a build that included them, such as KANNADA_DRAFTS=1.
if (waiting.length) console.error(`${waiting.length} pages wait for a native reader or for approval (needsReview or held in src/content/pages.ts):\n${waiting.join("\n")}`);
if (found.length || waiting.length) process.exit(1);
console.log("No placeholders left.");
