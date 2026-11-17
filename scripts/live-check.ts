// After a deploy, checks that the live site serves its key pages and files
// with the right content types: node scripts/live-check.ts <site URL>
import { LIVE, liveProblems } from "../src/lib/live.ts";

const site = new URL(process.argv[2] ?? "");
const results = await Promise.all(
  LIVE.map(async ({ path }) => {
    const res = await fetch(new URL(path.slice(1), site), { redirect: "follow" });
    await res.arrayBuffer();
    return { path, status: res.status, type: res.headers.get("content-type") };
  }),
);
const problems = liveProblems(results);
if (problems.length) {
  console.error(`The live site has ${problems.length} problems:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`The live site serves all ${LIVE.length} checked files.`);
