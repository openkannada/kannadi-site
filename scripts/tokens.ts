// Writes design/tokens.css from design/tokens.json, and stops if any text color
// falls below 4.5:1 on a surface it is used on: npm run tokens
import { readFileSync, writeFileSync } from "node:fs";

import { contrastProblems, toCss, type Tokens } from "../design/tokens.ts";

const tokens: Tokens = JSON.parse(readFileSync("design/tokens.json", "utf8"));
const problems = contrastProblems(tokens);
if (problems.length) {
  console.error(`Contrast below 4.5:1:\n${problems.join("\n")}`);
  process.exit(1);
}
writeFileSync("design/tokens.css", toCss(tokens));
console.log("Wrote design/tokens.css.");
