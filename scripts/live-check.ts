// After a deploy, checks the live site: its key files and their content types, then what search engines and
// AI assistants read there, and that every other host redirects to it: node scripts/live-check.ts <site URL>
import { LIVE as SITE } from "../src/content/site.ts";
import { AI_CRAWLERS } from "../src/lib/agent-text.ts";
import { LIVE, liveProblems, liveSeoProblems } from "../src/lib/live.ts";

const site = new URL(process.argv[2] ?? `${SITE.origin}/`);
const origin = site.origin;
const results = await Promise.all(
  LIVE.map(async ({ path }) => {
    const res = await fetch(new URL(path.slice(1), site), { redirect: "follow" });
    await res.arrayBuffer();
    return { path, status: res.status, type: res.headers.get("content-type") };
  }),
);
const text = async (path: string) => (await fetch(new URL(path, site))).text();
const homeResponse = await fetch(site);
const aliases = await Promise.all(
  ["www.openkannada.org", "openkannada.com", "www.openkannada.com"].map(async (host) => {
    const res = await fetch(`https://${host}/`, { redirect: "manual" });
    return { host, status: res.status, location: res.headers.get("location") };
  }),
);
const problems = [
  ...liveProblems(results),
  ...liveSeoProblems(
    {
      home: await homeResponse.text(),
      robotsTag: homeResponse.headers.get("x-robots-tag"),
      robotsTxt: await text("robots.txt"),
      sitemap: await text("sitemap.xml"),
      aliases: site.host === SITE.host ? aliases : [],
    },
    origin,
    SITE.launched,
    AI_CRAWLERS,
  ),
];
if (problems.length) {
  console.error(`The live site has ${problems.length} problems:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`The live site serves all ${LIVE.length} checked files, and its canonical links, JSON-LD, markdown mirror, robots.txt, sitemap and redirects are right.`);
