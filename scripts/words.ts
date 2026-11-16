// Writes data/words.tsv, the commonest Kannada words with their counts, from a
// word-count file of Kannada Wikipedia: node scripts/words.ts <counts.tsv> [limit]
import { readFileSync, writeFileSync } from "node:fs";

const [source, limitArg = "30000"] = process.argv.slice(2);
if (!source) throw new Error("usage: node scripts/words.ts <counts.tsv> [limit]");
const limit = Number(limitArg);
const KANNADA_WORD = /^[ಀ-೿]+$/u;

const rows: [string, number][] = [];
for (const line of readFileSync(source, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const [word = "", count = "0"] = line.split("\t");
  const clean = word.replace(/[‌‍]/g, "").normalize("NFC");
  if (KANNADA_WORD.test(clean)) rows.push([clean, Number(count)]);
}
const merged = new Map<string, number>();
for (const [w, c] of rows) merged.set(w, (merged.get(w) ?? 0) + c);
const top = [...merged].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, limit);

const header = [
  "# The commonest words in Kannada Wikipedia, with how often each appears.",
  "# Counted from the Kannada Wikipedia article text, which is under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).",
  "# Only single words and their counts are kept. Regenerate with scripts/words.ts.",
];
writeFileSync("data/words.tsv", `${[...header, ...top.map(([w, c]) => `${w}\t${c}`)].join("\n")}\n`);
console.log(`data/words.tsv: ${top.length} words, the rarest seen ${top.at(-1)?.[1]} times`);
