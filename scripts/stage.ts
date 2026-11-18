// A deploy in 2 steps, so a page never names a build file the edge does not serve yet. First the new build goes
// out with the live HTML in place of the new, so the new build files are served before any page names them:
//   node scripts/stage.ts stage <site URL> [dist] [stage]
// Then, once every build file answers 200, the new build goes out as is:
//   node scripts/stage.ts wait <site URL> [dist] [tries] [seconds apart]
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const [step, siteArg, distArg = "dist", ...rest] = process.argv.slice(2);
const site = new URL(siteArg ?? "");
const dist = distArg;

async function get(path: string, method = "GET"): Promise<Response | null> {
  try {
    return await fetch(new URL(path, site), { method });
  } catch {
    return null;
  }
}

if (step === "stage") {
  const stage = rest[0] ?? ".deploy/stage";
  rmSync(stage, { recursive: true, force: true });
  cpSync(dist, stage, { recursive: true });
  const pages = readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name === "index.html")
    .map((e) => relative(dist, e.parentPath).split(sep).join("/"));
  let live = 0;
  for (const dir of pages) {
    const res = await get(dir ? `${dir}/` : "./");
    if (!res?.ok || !res.headers.get("content-type")?.startsWith("text/html")) continue;
    writeFileSync(join(stage, dir, "index.html"), await res.text());
    live++;
  }
  console.log(`Staged the new build with the live HTML of ${live} of ${pages.length} pages.`);
} else if (step === "wait") {
  const tries = Number(rest[0] ?? 24);
  const pause = Number(rest[1] ?? 5);
  const folder = join(dist, "_astro");
  const names = existsSync(folder) ? readdirSync(folder) : [];
  let missing = names;
  for (let attempt = 1; attempt <= tries && missing.length; attempt++) {
    const status = await Promise.all(missing.map(async (n) => ((await get(`/_astro/${n}`, "HEAD"))?.status === 200 ? null : n)));
    missing = status.filter((n): n is string => n !== null);
    if (missing.length && attempt < tries) await new Promise((r) => setTimeout(r, pause * 1000));
  }
  if (missing.length) {
    console.error(`${missing.length} build files are still not served, so the new pages stay unpublished: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log(`All ${names.length} build files are served.`);
} else {
  throw new Error("Usage: node scripts/stage.ts <stage|wait> <site URL> [dist] ...");
}
