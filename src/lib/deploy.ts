import { siteUrl } from "../content/site.ts";

/** A command the deploy runs, in order; the deploy stops at the first that fails. */
export interface Step {
  label: string;
  command: string;
  args: string[];
}

const PLACEHOLDER_HOSTS = /(^|\.)(example\.(org|com|net)|localhost)$/;

/** The production site URL from `SITE_URL`: https, with a real host. Throws with the reason otherwise. */
export function productionUrl(value: string | undefined): URL {
  const url = siteUrl(value);
  if (!url) throw new Error("Set SITE_URL to the production address, for example SITE_URL=https://openkannada.org/");
  if (url.protocol !== "https:") throw new Error(`SITE_URL must use https: ${url.href}`);
  if (PLACEHOLDER_HOSTS.test(url.hostname)) throw new Error(`SITE_URL is a placeholder host: ${url.href}`);
  return url;
}

/** The steps that build, check and publish the site at `url` to the Cloudflare Pages production branch. */
export function deploySteps(url: URL): Step[] {
  return [
    { label: "Build the WebAssembly package", command: "npm", args: ["run", "wasm"] },
    { label: "Build the site", command: "npm", args: ["run", "build"] },
    { label: "Check the built pages", command: "node", args: ["scripts/seo-smoke.ts", "dist", url.href] },
    { label: "Check the writing", command: "npm", args: ["run", "voice-lint"] },
    { label: "Publish to Cloudflare Pages", command: "npx", args: ["wrangler", "pages", "deploy", "--branch", "main"] },
  ];
}
