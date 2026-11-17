import { siteUrl } from "../content/site.ts";

/** A command the deploy runs, in order; the deploy stops at the first that fails. */
export interface Step {
  label: string;
  command: string;
  args: string[];
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
  // Pages serves dist/ at the domain root; a base path would leave every link pointing at a missing folder.
  if (url.pathname !== "/") throw new Error(`SITE_URL must be the domain root, with no path: ${url.href}`);
  return url;
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

/** Placeholders for Prasad's own words or photos left in built text, each as "PRASAD: ..." up to the end of its sentence. */
export function placeholders(text: string): string[] {
  return [...text.matchAll(/PRASAD:[^.?!<\n]*[.?!]?/g)].map((m) => m[0].trim());
}

/** The steps that build, check and publish the site at `url` to the Cloudflare Pages production branch, then check it live and notify IndexNow. */
export function deploySteps(url: URL): Step[] {
  return [
    { label: "Build the WebAssembly package", command: "npm", args: ["run", "wasm"] },
    { label: "Check the types", command: "npm", args: ["run", "check"] },
    { label: "Run the unit tests", command: "npm", args: ["test"] },
    { label: "Build the site", command: "npm", args: ["run", "build"] },
    { label: "Check the built pages", command: "node", args: ["scripts/seo-smoke.ts", "dist", url.href] },
    { label: "Check the writing", command: "npm", args: ["run", "voice-lint"] },
    { label: "Check that no placeholder is left", command: "node", args: ["scripts/placeholders.ts", "dist"] },
    { label: "Save the live sitemap for IndexNow", command: "node", args: ["scripts/indexnow.ts", "snapshot", url.href] },
    { label: "Publish to Cloudflare Pages", command: "npx", args: ["--no", "--", "wrangler", "pages", "deploy", "--branch", "main"] },
    { label: "Check the live site", command: "node", args: ["scripts/live-check.ts", url.href] },
    { label: "Send the changed pages to IndexNow", command: "node", args: ["scripts/indexnow.ts", "submit", url.href] },
  ];
}
