// Builds, checks and publishes the site to Cloudflare Workers at https://openkannada.org.
//   npm run deploy                     by hand from my Mac: both phases
//   node scripts/deploy.ts build       Workers Builds' build command, through scripts/cf-build.sh, on every branch
//   node scripts/deploy.ts publish     Workers Builds' deploy command, on main
// By hand the API token comes from CLOUDFLARE_API_TOKEN, or else from the macOS keychain, and is never printed.
import { spawnSync } from "node:child_process";

import { LIVE } from "../src/content/site.ts";
import { checkoutProblem, deployEnv, deploySteps, type Phase, productionUrl, stepEnv, workersBuildProblem } from "../src/lib/deploy.ts";

function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

function git(...args: string[]): string {
  const run = spawnSync("git", args, { encoding: "utf8" });
  if (run.status !== 0) stop(`git ${args.join(" ")} failed: ${run.error?.message ?? run.stderr.trim()}`);
  return run.stdout.trim();
}

/** The Cloudflare API token from the keychain item openkannada.cloudflare.api, account prasadus92. */
function keychainToken(): string {
  const run = spawnSync("security", ["find-generic-password", "-s", "openkannada.cloudflare.api", "-a", "prasadus92", "-w"], { encoding: "utf8" });
  if (run.status !== 0 || !run.stdout.trim()) stop("No CLOUDFLARE_API_TOKEN, and no keychain item openkannada.cloudflare.api for prasadus92.");
  return run.stdout.trim();
}

const arg = process.argv[2];
if (arg !== undefined && arg !== "build" && arg !== "publish") stop("Usage: node scripts/deploy.ts [build|publish]");
const phases: Phase[] = arg ? [arg] : ["build", "publish"];
const workersBuild = process.env.WORKERS_CI === "1";

let url: URL;
try {
  url = productionUrl(process.env.SITE_URL ?? `${LIVE.origin}/`);
} catch (e) {
  stop((e as Error).message);
}

const env = deployEnv(process.env, url);
if (phases.includes("publish")) {
  if (workersBuild) {
    const problem = workersBuildProblem(env);
    if (problem) stop(problem);
  } else {
    git("fetch", "--quiet", "origin", "main");
    const problem = checkoutProblem({
      clean: git("status", "--porcelain") === "",
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      originMain: git("rev-parse", "origin/main"),
    });
    if (problem) stop(problem);
    env.CLOUDFLARE_API_TOKEN ||= keychainToken();
  }
}

for (const step of deploySteps(url, LIVE.launched).filter((s) => phases.includes(s.phase))) {
  console.log(`\n${step.label}`);
  const run = spawnSync(step.command, step.args, { stdio: "inherit", env: stepEnv(step, env) });
  if (run.status !== 0) stop(`Stopped: ${step.label} failed.`);
}
console.log(phases.includes("publish") ? `\nPublished and checked live at ${url.href}.` : `\nBuilt and checked for ${url.href}.`);
