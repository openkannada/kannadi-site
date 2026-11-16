// After the build: a markdown mirror next to every page, llms.txt,
// llms-full.txt, robots.txt and, once the site has a URL, sitemap.xml.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";

import { SITE } from "../content/site.ts";
import {
  type BuiltPage,
  llmsFull,
  llmsIndex,
  markdownPath,
  mirror,
  readPage,
  robots,
  sitemap,
} from "../lib/agent-text.ts";

const SKIP = new Set(["/404/"]);

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name === "index.html")
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

/** "/nudi-to-unicode/" for dist/nudi-to-unicode/index.html, relative to the site base. */
function pathOf(dist: string, file: string): string {
  const dir = relative(dist, file).split(sep).slice(0, -1).join("/");
  return dir ? `/${dir}/` : "/";
}

export function agentFiles(): AstroIntegration {
  let site: URL | undefined;
  return {
    name: "kannadi-agent-files",
    hooks: {
      "astro:config:done": ({ config }) => {
        site = config.site ? new URL(config.base, config.site) : undefined;
      },
      "astro:build:done": async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const url = (path: string) => (site ? new URL(path.replace(/^\//, ""), site).href : path);
        const pages: BuiltPage[] = [];
        for (const file of await htmlFiles(dist)) {
          const path = pathOf(dist, file);
          if (SKIP.has(path)) continue;
          const page = readPage(await readFile(file, "utf8"), path);
          await writeFile(join(dist, markdownPath(path)), mirror(page, url(path)));
          pages.push(page);
        }
        pages.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
        const info = {
          name: `${SITE.name} (${SITE.nameKn}): ${SITE.tagline}`,
          summary:
            "A free Kannada editor in the browser. It converts text typed in the Nudi, Baraha and Akruti fonts to Unicode and back, types Kannada from English letters, marks what could not be converted, and saves Word, web and text files. It runs on the visitor's device with the open-source kannadi library compiled to WebAssembly.",
          details: [
            `Source of the library: ${SITE.repository} (Rust, MIT license).`,
            "Every page is also served as markdown at the same path plus index.md, and on requests that accept text/markdown.",
          ],
          url,
        };
        await writeFile(join(dist, "llms.txt"), llmsIndex(pages, info));
        await writeFile(join(dist, "llms-full.txt"), llmsFull(pages, info));
        const map = site ? url("/sitemap.xml") : null;
        await writeFile(join(dist, "robots.txt"), robots(map));
        if (site) await writeFile(join(dist, "sitemap.xml"), sitemap(pages.map((p) => url(p.path))));
        logger.info(`${pages.length} markdown mirrors, llms.txt and llms-full.txt${site ? ", sitemap.xml" : ""}`);
      },
    },
  };
}
