// Renders the Open Graph cards into public/og with headless Chrome:
// node scripts/og.ts [path to Chrome]. Run it after changing a page heading or the logo (og-mark.svg).
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PAGES } from "../src/content/pages.ts";

const chrome = process.argv[2] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const here = resolve(import.meta.dirname);
const out = join(here, "..", "public", "og");
mkdirSync(out, { recursive: true });

for (const page of PAGES) {
  const name = page.slug || "home";
  const url = new URL(pathToFileURL(join(here, "og.html")));
  url.search = new URLSearchParams({ title: page.h1, from: page.og.from, to: page.og.to }).toString();
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    "--virtual-time-budget=3000",
    `--screenshot=${join(out, `${name}.png`)}`,
    url.href,
  ], { stdio: "ignore" });
  console.log(`public/og/${name}.png`);
}
