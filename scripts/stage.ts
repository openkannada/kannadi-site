// A deploy in 2 steps, so no page names a build file the edge does not serve yet. Step 1 publishes the new build
// with the live HTML, which names only files that step 1 also carries; step 2 publishes the new build as is:
//   node scripts/stage.ts stage <site URL> [dist] [stage]
//   node scripts/stage.ts wait <site URL> [dist] [tries] [seconds apart] [seconds to settle]
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { assetRefs, keepAssets } from "../src/lib/assets.ts";

const [step, siteArg, distArg = "dist", ...rest] = process.argv.slice(2);
const site = new URL(siteArg ?? "");
const dist = distArg;
const sleep = (seconds: number) => new Promise((r) => setTimeout(r, seconds * 1000));

async function get(path: string, method = "GET"): Promise<Response | null> {
  try {
    return await fetch(new URL(path, site), { method });
  } catch {
    return null;
  }
}

function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

if (step === "stage") {
  const stage = rest[0] ?? ".deploy/stage";
  rmSync(stage, { recursive: true, force: true });
  cpSync(dist, stage, { recursive: true });
  const pages = readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name === "index.html")
    .map((e) => relative(dist, e.parentPath).split(sep).join("/"));
  const staged: string[] = [];
  let unpublished = 0;
  for (const dir of pages) {
    const path = dir ? `${dir}/` : "./";
    const res = (await get(path)) ?? (await get(path));
    const file = join(stage, dir, "index.html");
    if (res?.ok && res.headers.get("content-type")?.startsWith("text/html")) {
      writeFileSync(file, await res.text());
      staged.push(file);
    } else {
      // A new page, or 1 the live site did not answer, waits for step 2 behind the live 404 page.
      rmSync(file);
      unpublished++;
    }
  }
  const missing = await get("__a-page-that-does-not-exist__/");
  if (!missing || missing.status !== 404 || !missing.headers.get("content-type")?.startsWith("text/html")) {
    if (staged.length) stop("Could not read the live 404 page, so step 1 would name build files the edge may not serve.");
    // Nothing live answers: a first deploy, or a site that is down. The new build goes out as is.
    rmSync(stage, { recursive: true, force: true });
    cpSync(dist, stage, { recursive: true });
    console.warn("Warning: no live page answered, so step 1 publishes the new build as is.");
    process.exit(0);
  }
  writeFileSync(join(stage, "404.html"), await missing.text());
  staged.push(join(stage, "404.html"));
  // Every file the staged HTML names goes out in both steps, whatever an earlier step kept.
  const folder = join(stage, "_astro");
  mkdirSync(folder, { recursive: true });
  const refs = staged.flatMap((f) => assetRefs(readFileSync(f, "utf8")));
  const { files, failed } = await keepAssets(refs, new Set(readdirSync(folder)), async (ref) => {
    const res = await get(ref.slice(1));
    return res?.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  });
  for (const [name, body] of files) {
    writeFileSync(join(folder, name), body);
    writeFileSync(join(dist, "_astro", name), body);
  }
  if (failed.length) console.warn(`Warning: the live site named ${failed.length} build files it did not serve: ${failed.join(", ")}`);
  console.log(`Staged the live HTML of ${staged.length - 1} pages and the 404 page; ${unpublished} new pages wait for step 2; ${files.size} more live build files kept.`);
} else if (step === "wait") {
  const tries = Number(rest[0] ?? 24);
  const pause = Number(rest[1] ?? 5);
  const settle = Number(rest[2] ?? 30);
  const folder = join(dist, "_astro");
  const names = existsSync(folder) ? readdirSync(folder) : [];
  let missing = names;
  for (let attempt = 1; attempt <= tries && missing.length; attempt++) {
    const status = await Promise.all(missing.map(async (n) => ((await get(`_astro/${n}`, "HEAD"))?.status === 200 ? null : n)));
    missing = status.filter((n): n is string => n !== null);
    if (missing.length && attempt < tries) await sleep(pause);
  }
  if (missing.length) stop(`${missing.length} build files are still not served, so step 2 does not run: ${missing.join(", ")}`);
  // 1 location answering does not prove every location does; give the rest time to catch up.
  await sleep(settle);
  console.log(`All ${names.length} build files are served here; waited ${settle}s more for other locations.`);
} else {
  throw new Error("Usage: node scripts/stage.ts <stage|wait> <site URL> [dist] ...");
}
