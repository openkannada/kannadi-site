// What a freshly published site must answer, checked after the deploy.

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
