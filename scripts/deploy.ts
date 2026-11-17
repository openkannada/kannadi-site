// Builds, checks and publishes the site to Cloudflare Pages production:
// SITE_URL=https://openkannada.org/ npm run deploy
import { spawnSync } from "node:child_process";

import { deploySteps, productionUrl } from "../src/lib/deploy.ts";

function git(...args: string[]): string {
  return spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
}

function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

let url: URL;
try {
  url = productionUrl(process.env.SITE_URL);
} catch (e) {
  stop((e as Error).message);
}
if (git("status", "--porcelain")) stop("The working tree has changes. Deploy from a clean checkout of main.");
if (git("branch", "--show-current") !== "main") stop("Deploy from the main branch.");

const env = { ...process.env, SITE_URL: url.href };
for (const step of deploySteps(url)) {
  console.log(`\n${step.label}`);
  const run = spawnSync(step.command, step.args, { stdio: "inherit", env });
  if (run.status !== 0) stop(`Stopped: ${step.label} failed.`);
}
console.log(`\nPublished. Check ${url.href} once Cloudflare reports the deployment.`);
