// What a freshly published site must answer, checked after the deploy.
import { INDEXNOW } from "../content/site.ts";

export interface Expect {
  path: string;
  /** Accepted starts of the content type, separated by "|". */
  type: string;
}

/** The files every deploy must serve, with the start of each content type. */
export const LIVE: Expect[] = [
  { path: "/", type: "text/html" },
  { path: "/nudi-to-unicode/", type: "text/html" },
  { path: "/about/", type: "text/html" },
  { path: "/llms.txt", type: "text/plain" },
  { path: "/llms-full.txt", type: "text/plain" },
  { path: "/robots.txt", type: "text/plain" },
  { path: "/sitemap.xml", type: "application/xml|text/xml" },
  { path: "/index.md", type: "text/markdown" },
  { path: "/site.webmanifest", type: "application/manifest+json" },
  { path: "/favicon.svg", type: "image/svg+xml" },
  { path: "/og/home.png", type: "image/png" },
  { path: `/${INDEXNOW.key}.txt`, type: "text/plain" },
];

/** A line for each file that did not come back with status 200 and the expected type. */
export function liveProblems(results: { path: string; status: number; type: string | null }[], expected: Expect[] = LIVE): string[] {
  return expected.flatMap((e) => {
    const r = results.find((x) => x.path === e.path);
    if (!r) return [`${e.path}: not checked`];
    if (r.status !== 200) return [`${e.path}: status ${r.status}`];
    if (!e.type.split("|").some((t) => r.type?.toLowerCase().startsWith(t))) return [`${e.path}: content type ${r.type}, expected ${e.type}`];
    return [];
  });
}

export interface LiveSeo {
  /** The live home page's HTML and its X-Robots-Tag. */
  home: string;
  robotsTag: string | null;
  robotsTxt: string;
  sitemap: string;
  /** Where each other host's root redirects: its status and Location. */
  aliases: { host: string; status: number; location: string | null }[];
}

/** What is wrong with what search engines and AI assistants read on the live site. */
export function liveSeoProblems(seen: LiveSeo, origin: string, launched: boolean, crawlers: string[]): string[] {
  const out: string[] = [];
  const home = `${origin}/`;
  if (!seen.home.includes(`<link rel="canonical" href="${home}"`)) out.push(`/: no canonical link to ${home}`);
  if (!seen.home.includes('type="application/ld+json"')) out.push("/: no JSON-LD");
  if (!/<link rel="alternate" type="text\/markdown" href="[^"]*index\.md"/.test(seen.home)) out.push("/: no link to its markdown mirror");
  const noindex = /noindex/i.test(seen.robotsTag ?? "");
  if (!launched && !noindex) out.push("/: X-Robots-Tag is not noindex before launch");
  if (launched && noindex) out.push("/: X-Robots-Tag is still noindex after launch");
  for (const agent of crawlers) if (!seen.robotsTxt.includes(`User-agent: ${agent}\nAllow: /`)) out.push(`/robots.txt: does not allow ${agent}`);
  if (!seen.robotsTxt.includes(`Sitemap: ${origin}/sitemap.xml`)) out.push("/robots.txt: does not link the sitemap");
  if (!/<loc>[^<]+<\/loc><lastmod>[^<]+<\/lastmod>/.test(seen.sitemap)) out.push("/sitemap.xml: no URL with a lastmod");
  for (const a of seen.aliases) {
    if (a.status !== 301 || a.location !== home) out.push(`${a.host}: answers ${a.status} to ${a.location ?? "nowhere"}, expected a 301 to ${home}`);
  }
  return out;
}
