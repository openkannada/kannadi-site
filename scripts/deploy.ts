// Builds, checks and publishes the site to Cloudflare Workers at https://openkannada.org: npm run deploy
// CI runs the same steps on every push to main; this is for a deploy from Prasad's Mac. The API token comes
// from CLOUDFLARE_API_TOKEN, or else from the macOS keychain, and is never printed.
import { spawnSync } from "node:child_process";

import { LIVE } from "../src/content/site.ts";
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
  url = productionUrl(process.env.SITE_URL ?? `${LIVE.origin}/`);
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

/** The Cloudflare API token from the keychain item openkannada.cloudflare.api, account prasadus92. */
function keychainToken(): string {
  const run = spawnSync("security", ["find-generic-password", "-s", "openkannada.cloudflare.api", "-a", "prasadus92", "-w"], { encoding: "utf8" });
  if (run.status !== 0 || !run.stdout.trim()) stop("No CLOUDFLARE_API_TOKEN, and no keychain item openkannada.cloudflare.api for prasadus92.");
  return run.stdout.trim();
}

const env = deployEnv(process.env, url);
env.CLOUDFLARE_API_TOKEN ||= keychainToken();
for (const step of deploySteps(url, LIVE.launched)) {
  console.log(`\n${step.label}`);
  const run = spawnSync(step.command, step.args, { stdio: "inherit", env });
  if (run.status !== 0) stop(`Stopped: ${step.label} failed.`);
}
console.log(`\nPublished and checked live at ${url.href}.`);
