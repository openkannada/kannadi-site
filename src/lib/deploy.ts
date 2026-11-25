import { siteUrl } from "../content/site.ts";

/** The build checks the site and needs no Cloudflare token; the publish puts it live. */
export type Phase = "build" | "publish";

/** A command the deploy runs, in order; the deploy stops at the first that fails. */
export interface Step {
  label: string;
  command: string;
  args: string[];
  phase: Phase;
  /** Runs only once the site is launched. */
  launched?: true;
  /** Runs without SITE_URL, as CI runs it; the unit tests check SITE_URL handling themselves. */
  noSiteUrl?: true;
}

/** The environment a step runs in. */
export function stepEnv(step: Step, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (!step.noSiteUrl) return env;
  const { SITE_URL: _, ...rest } = env;
  return rest;
}

/** What the deploy needs to know about the git checkout. */
export interface Checkout {
  clean: boolean;
  branch: string;
  head: string;
  originMain: string;
}

const PLACEHOLDER_HOSTS = /(^|\.)(example(\.(org|com|net))?|localhost|test|invalid)$/;

/** The production site URL from `SITE_URL`: https, a real host, at the domain root. Throws with the reason otherwise. */
export function productionUrl(value: string | undefined): URL {
  const url = siteUrl(value);
  if (!url) throw new Error("Set SITE_URL to the production address, for example SITE_URL=https://your-domain/");
  if (url.protocol !== "https:") throw new Error(`SITE_URL must use https: ${url.href}`);
  if (PLACEHOLDER_HOSTS.test(url.hostname)) throw new Error(`SITE_URL is a placeholder host: ${url.href}`);
  // Cloudflare's own hostnames are off for this Worker, so canonical links there would point at nothing.
  if (/(^|\.)(pages|workers)\.dev$/i.test(url.hostname)) throw new Error(`SITE_URL must be the site's own domain, not ${url.hostname}: ${url.href}`);
  // The Worker serves dist/ at the domain root; a base path would leave every link pointing at a missing folder.
  if (url.pathname !== "/") throw new Error(`SITE_URL must be the domain root, with no path: ${url.href}`);
  return url;
}

/** Why this Workers Build must not publish production, or null when it can. */
export function workersBuildProblem(env: NodeJS.ProcessEnv): string | null {
  if (env.WORKERS_CI_BRANCH !== "main") return `Workers Builds publishes only main, not ${env.WORKERS_CI_BRANCH || "an unknown branch"}.`;
  if (!env.CLOUDFLARE_API_TOKEN) return "Workers Builds gave the deploy no CLOUDFLARE_API_TOKEN.";
  return null;
}

/** Why this checkout must not be deployed, or null when it can be. */
export function checkoutProblem(checkout: Checkout): string | null {
  if (!checkout.clean) return "The working tree has changes. Deploy from a clean checkout of main.";
  if (checkout.branch !== "main") return "Deploy from the main branch.";
  if (checkout.head !== checkout.originMain) return "main differs from origin/main. Deploy only merged, pushed commits.";
  return null;
}

/** The environment for the steps: `SITE_URL` set, and no `KANNADI_DIR`, so the wasm comes from a clean clone at kannadi.rev. */
export function deployEnv(env: NodeJS.ProcessEnv, url: URL): NodeJS.ProcessEnv {
  const { KANNADI_DIR: _, ...rest } = env;
  return { ...rest, SITE_URL: url.href };
}

/**
 * Placeholders for words or photos still to be written, left in built text: each "PRASAD: ..." up to the end of its
 * sentence, and any text still in the placeholder highlight after the "PRASAD:" note was replaced.
 */
export function placeholders(text: string): string[] {
  const notes = [...text.matchAll(/PRASAD:[^.?!<\n]*[.?!]?/g)].map((m) => m[0].trim());
  const marks = [...text.matchAll(/<mark\b[^>]*\bclass="todo"[^>]*>(?!PRASAD:)([\s\S]*?)<\/mark>/g)].map(
    (m) => `highlighted as a placeholder: ${(m[1] ?? "").replace(/<[^>]+>/g, "").trim()}`,
  );
  return [...notes, ...marks];
}

/** Pages still waiting for a native reader or for approval, by path. */
export function unreviewed(pages: { slug: string; needsReview?: true; held?: true }[]): string[] {
  return pages.filter((p) => p.needsReview || p.held).map((p) => (p.slug ? `/${p.slug}/` : "/"));
}

/**
 * The steps that build, check and publish the site at `url` to Cloudflare Workers, then check it live. The
 * placeholder check and IndexNow belong to the launched site; before launch the site is noindex and they wait.
 */
export function deploySteps(url: URL, launched: boolean): Step[] {
  const steps: Step[] = [
    { phase: "build", label: "Build the WebAssembly package", command: "npm", args: ["run", "wasm"] },
    { phase: "build", label: "Check the types", command: "npm", args: ["run", "check"] },
    { phase: "build", label: "Run the unit tests", command: "npm", args: ["test"], noSiteUrl: true },
    { phase: "build", label: "Build the site", command: "npm", args: ["run", "build"] },
    { phase: "build", label: "Check the built pages", command: "node", args: ["scripts/seo-smoke.ts", "dist", url.href] },
    { phase: "build", label: "Check the writing", command: "npm", args: ["run", "voice-lint"] },
    { phase: "build", label: "Check that no placeholder is left", command: "node", args: ["scripts/placeholders.ts", "dist"], launched: true },
    { phase: "publish", label: "Save the live sitemap for IndexNow", command: "node", args: ["scripts/indexnow.ts", "snapshot", url.href], launched: true },
    { phase: "publish", label: "Keep the live build files that pages still open may ask for", command: "node", args: ["scripts/keep-assets.ts", url.href, "dist"] },
    { phase: "publish", label: "Stage the new build with the live HTML", command: "node", args: ["scripts/stage.ts", "stage", url.href, "dist", ".deploy/stage"] },
    { phase: "publish", label: "Publish the staged build, so the new build files go out before any page names them", command: "npx", args: ["--no", "--", "wrangler", "deploy", "--assets", ".deploy/stage"] },
    { phase: "publish", label: "Wait until every new build file is served", command: "node", args: ["scripts/stage.ts", "wait", url.href, "dist"] },
    { phase: "publish", label: "Publish to Cloudflare Workers", command: "npx", args: ["--no", "--", "wrangler", "deploy"] },
    { phase: "publish", label: "Check the live site", command: "node", args: ["scripts/live-check.ts", url.href] },
    { phase: "publish", label: "Send the changed pages to IndexNow", command: "node", args: ["scripts/indexnow.ts", "submit", url.href], launched: true },
  ];
  return steps.filter((s) => launched || !s.launched);
}
