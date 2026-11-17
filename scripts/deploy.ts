// Builds, checks and publishes the site to Cloudflare Pages production:
// SITE_URL=https://your-domain/ npm run deploy
import { spawnSync } from "node:child_process";

import { checkoutProblem, deployEnv, deploySteps, productionUrl } from "../src/lib/deploy.ts";

function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

function git(...args: string[]): string {
  const run = spawnSync("git", args, { encoding: "utf8" });
  if (run.status !== 0) stop(`git ${args.join(" ")} failed: ${run.error?.message ?? run.stderr.trim()}`);
  return run.stdout.trim();
}

let url: URL;
try {
  url = productionUrl(process.env.SITE_URL);
} catch (e) {
  stop((e as Error).message);
}

git("fetch", "--quiet", "origin", "main");
const problem = checkoutProblem({
  clean: git("status", "--porcelain") === "",
  branch: git("branch", "--show-current"),
  head: git("rev-parse", "HEAD"),
  originMain: git("rev-parse", "origin/main"),
});
if (problem) stop(problem);

const env = deployEnv(process.env, url);
for (const step of deploySteps(url)) {
  console.log(`\n${step.label}`);
  const run = spawnSync(step.command, step.args, { stdio: "inherit", env });
  if (run.status !== 0) stop(`Stopped: ${step.label} failed.`);
}
console.log(`\nPublished. Check ${url.href} once Cloudflare reports the deployment.`);
