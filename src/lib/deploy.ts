import { siteUrl } from "../content/site.ts";

/** A command the deploy runs, in order; the deploy stops at the first that fails. */
export interface Step {
  label: string;
  command: string;
  args: string[];
  /** Runs only once the site is launched, so CI runs it too, around its own publish step. */
  launch?: "before" | "after";
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

/** Pages whose copy still waits for a native reader, by path. */
export function unreviewed(pages: { slug: string; needsReview?: true }[]): string[] {
  return pages.filter((p) => p.needsReview).map((p) => (p.slug ? `/${p.slug}/` : "/"));
}

/**
 * The steps that build, check and publish the site at `url` to Cloudflare Workers, then check it live. The
 * placeholder check and IndexNow belong to the launched site; before launch the site is noindex and they wait.
 */
export function deploySteps(url: URL, launched: boolean): Step[] {
  const launch = (step: Step) => (launched ? [step] : []);
  return [
    { label: "Build the WebAssembly package", command: "npm", args: ["run", "wasm"] },
    { label: "Check the types", command: "npm", args: ["run", "check"] },
    { label: "Run the unit tests", command: "npm", args: ["test"] },
    { label: "Build the site", command: "npm", args: ["run", "build"] },
    { label: "Check the built pages", command: "node", args: ["scripts/seo-smoke.ts", "dist", url.href] },
    { label: "Check the writing", command: "npm", args: ["run", "voice-lint"] },
    ...launch({ label: "Check that no placeholder is left", command: "node", args: ["scripts/placeholders.ts", "dist"], launch: "before" }),
    ...launch({ label: "Save the live sitemap for IndexNow", command: "node", args: ["scripts/indexnow.ts", "snapshot", url.href], launch: "before" }),
    { label: "Keep the live build files that pages still open may ask for", command: "node", args: ["scripts/keep-assets.ts", url.href, "dist"] },
    { label: "Stage the new build with the live HTML", command: "node", args: ["scripts/stage.ts", "stage", url.href, "dist", ".deploy/stage"] },
    { label: "Publish the staged build, so the new build files go out before any page names them", command: "npx", args: ["--no", "--", "wrangler", "deploy", "--assets", ".deploy/stage"] },
    { label: "Wait until every new build file is served", command: "node", args: ["scripts/stage.ts", "wait", url.href, "dist"] },
    { label: "Publish to Cloudflare Workers", command: "npx", args: ["--no", "--", "wrangler", "deploy"] },
    { label: "Check the live site", command: "node", args: ["scripts/live-check.ts", url.href] },
    ...launch({ label: "Send the changed pages to IndexNow", command: "node", args: ["scripts/indexnow.ts", "submit", url.href], launch: "after" }),
  ];
}

/** The launch-only steps on 1 side of the publish, for CI, which builds and publishes with its own steps. */
export function launchSteps(url: URL, launched: boolean, side: "before" | "after"): Step[] {
  return deploySteps(url, launched).filter((s) => s.launch === side);
}
