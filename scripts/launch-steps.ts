// Runs the deploy's launch-only steps on 1 side of CI's publish step; before launch there are none.
// node scripts/launch-steps.ts <before|after> <site URL>
import { spawnSync } from "node:child_process";

import { LIVE } from "../src/content/site.ts";
import { launchSteps, productionUrl } from "../src/lib/deploy.ts";

const side = process.argv[2];
if (side !== "before" && side !== "after") throw new Error("Usage: node scripts/launch-steps.ts <before|after> <site URL>");
const url = productionUrl(process.argv[3] ?? `${LIVE.origin}/`);
const steps = launchSteps(url, LIVE.launched, side);
if (!steps.length) console.log(LIVE.launched ? `No launch steps ${side} the publish.` : "Not launched yet: no placeholder check or IndexNow.");
for (const step of steps) {
  console.log(`\n${step.label}`);
  const run = spawnSync(step.command, step.args, { stdio: "inherit" });
  if (run.status !== 0) {
    console.error(`Stopped: ${step.label} failed.`);
    process.exit(1);
  }
}
