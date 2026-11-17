// After a deploy, checks the live site: its key files and their content types, then what search engines and
// AI assistants read there, and that every other address redirects to it. A new custom domain can take minutes
// to get its certificate, so the check retries: node scripts/live-check.ts <site URL> [attempts] [seconds apart]
import { LIVE as SITE } from "../src/content/site.ts";
import { AI_CRAWLERS } from "../src/lib/agent-text.ts";
import { LIVE, liveProblems, liveSeoProblems } from "../src/lib/live.ts";

const site = new URL(process.argv[2] ?? `${SITE.origin}/`);
const attempts = Number(process.argv[3] ?? 10);
const pause = Number(process.argv[4] ?? 30);
const ALIASES = ["https://www.openkannada.org/", "https://openkannada.com/", "https://www.openkannada.com/", "http://openkannada.org/"];

async function check(): Promise<string[]> {
  const failed: string[] = [];
  const get = async (url: URL | string, redirect: RequestRedirect = "follow") => {
    try {
      return await fetch(url, { redirect });
    } catch (e) {
      failed.push(`${url}: ${(e as Error).cause ?? (e as Error).message}`);
      return null;
    }
  };
  const results = await Promise.all(
    LIVE.map(async ({ path }) => {
      const res = await get(new URL(path.slice(1), site));
      await res?.arrayBuffer();
      return { path, status: res?.status ?? 0, type: res?.headers.get("content-type") ?? null };
    }),
  );
  const text = async (path: string) => (await get(new URL(path, site)))?.text() ?? "";
  const homeResponse = await get(site);
  const aliases = await Promise.all(
    ALIASES.map(async (host) => {
      const res = await get(host, "manual");
      return { host, status: res?.status ?? 0, location: res?.headers.get("location") ?? null };
    }),
  );
  return [
    ...failed,
    ...liveProblems(results),
    ...liveSeoProblems(
      {
        home: (await homeResponse?.text()) ?? "",
        robotsTag: homeResponse?.headers.get("x-robots-tag") ?? null,
        robotsTxt: await text("robots.txt"),
        sitemap: await text("sitemap.xml"),
        aliases: site.host === SITE.host ? aliases : [],
      },
      site.origin,
      SITE.launched,
      AI_CRAWLERS,
    ),
  ];
}

let problems: string[] = [];
for (let attempt = 1; attempt <= attempts; attempt++) {
  problems = await check();
  if (!problems.length) break;
  if (attempt < attempts) {
    console.log(`Attempt ${attempt} of ${attempts}: ${problems.length} problems, the first: ${problems[0]}. Trying again in ${pause}s.`);
    await new Promise((r) => setTimeout(r, pause * 1000));
  }
}
if (problems.length) {
  console.error(`The live site has ${problems.length} problems:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`The live site serves all ${LIVE.length} checked files, and its canonical links, JSON-LD, markdown mirror, robots.txt, sitemap and redirects are right.`);
