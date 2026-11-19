// Copies a quarter's results from a checkout of openkannada/kannada-readiness into data/scorecard/, with the
// commit it came from: node scripts/scorecard-sync.ts ../kannada-readiness 2026-Q4
import { execFileSync } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [repo, quarter] = process.argv.slice(2);
if (!repo || !quarter || !/^\d{4}-Q[1-4]$/.test(quarter)) throw new Error("usage: node scripts/scorecard-sync.ts <kannada-readiness checkout> <YYYY-QN>");
const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["-C", repo, "status", "--porcelain", "--", `results/${quarter}.json`], { encoding: "utf8" }).trim();
if (dirty) throw new Error(`results/${quarter}.json has uncommitted changes in ${repo}`);
copyFileSync(join(repo, "results", `${quarter}.json`), join("data", "scorecard", `${quarter}.json`));
writeFileSync(join("data", "scorecard", "source.json"), `${JSON.stringify({ repository: "openkannada/kannada-readiness", commit, quarter }, null, 2)}\n`);
console.log(`Copied results/${quarter}.json at ${commit.slice(0, 12)}.`);
