// Checks the words visitors and agents read on the built site against the
// writing rules: node scripts/voice-lint.ts [dist]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { parseHTML } from "linkedom";

const RULES: [RegExp, string][] = [
  [/—/u, "em dash"],
  [/\s–\s/u, "en dash used as a dash"],
  [/·/u, "middle dot"],
  [/\p{Extended_Pictographic}/u, "emoji"],
  [/\b(actually|really|just|simply|basically|literally|truly|very)\b/i, "filler word"],
  [/\b(seamless(ly)?|effortless(ly)?|leverage|delve|robust|cutting-edge|game[- ]changer|revolutionary|unlock|supercharge|blazing|world-class|best-in-class|powerful|magical?|next-generation|state-of-the-art)\b/i, "hype word"],
  [/\b(in today's|it's worth noting|whether you're)\b/i, "stock phrase"],
  [/\b\w+(ise|ised|ising|isation)s?\b/i, "British spelling"],
  [/\b(colour|behaviour|favour|honour|centre|analyse|analysing|modelling|labelled|travelled|catalogue|licence)s?\b/i, "British spelling"],
  [/\b(two|three|four|five|six|seven|eight|nine|ten|twenty|hundred|thousand)\b/i, "number in words"],
  [/, not (?!only\b)(a |an |the )?\w+\b/i, '"X, not Y" construction'],
];
// Words the rules would catch that are right here.
const ALLOWED = [/\b(precise|wise|otherwise|likewise|rise|surprise|exercise|advise|devise|revise|promise|premise|expertise|enterprise|concise|noise|raise|praise|franchise|merchandise|compromise|demise|despise)\b|\bvery few\b/gi];

const dist = process.argv[2] ?? "dist";
const files = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && /\.(html|md|txt)$/.test(e.name) && e.name !== "OFL.txt")
  .map((e) => join(e.parentPath, e.name));
// Messages the editor shows at run time are not in the built pages.
const runtime = readdirSync("src/editor").filter((n) => n.endsWith(".ts")).map((n) => join("src/editor", n));

function visibleText(path: string): string {
  const raw = readFileSync(path, "utf8");
  if (path.endsWith(".ts")) {
    const strings = raw.replace(/^\s*(\/\/|\*|\/\*).*$/gm, "").match(/"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? [];
    return strings.filter((s) => / [a-z]/.test(s)).join("\n");
  }
  if (!path.endsWith(".html")) return raw;
  const { document } = parseHTML(raw);
  for (const el of document.querySelectorAll("script, style, kbd, code")) el.remove();
  const attrs = [...document.querySelectorAll("[title], [aria-label], [placeholder], meta[name='description']")]
    .flatMap((el) => ["title", "aria-label", "placeholder", "content"].map((a) => el.getAttribute(a) ?? ""));
  return [document.body?.textContent ?? "", document.title, ...attrs].join("\n");
}

const problems: string[] = [];
for (const file of [...files, ...runtime]) {
  const text = visibleText(file)
    .replace(/`[^`]*`/g, "")
    .replace(ALLOWED[0]!, "");
  for (const [line, i] of text.split("\n").map((l, n) => [l, n + 1] as const)) {
    for (const [rule, name] of RULES) {
      const m = line.match(rule);
      if (m) problems.push(`${file}:${i}: ${name}: "${m[0]}" in "${line.trim().slice(0, 100)}"`);
    }
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Voice lint: ${files.length} built files and ${runtime.length} editor modules read clean.`);
