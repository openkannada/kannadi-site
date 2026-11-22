// After the build: a markdown mirror next to every page, llms.txt,
// llms-full.txt, robots.txt and, once the site has a URL, sitemap.xml.
import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";

import { ORG, SITE } from "../content/site.ts";
import { contentHash, HASH_FILE, lastmodOf, type PageHashes } from "../lib/freshness.ts";
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
  let root: URL;
  return {
    name: "kannadi-agent-files",
    hooks: {
      "astro:config:done": ({ config }) => {
        site = config.site ? new URL(config.base, config.site) : undefined;
        root = config.root;
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
          name: ORG.name,
          summary:
            "Free, open-source tools so that Kannada works properly on computers. The first is kannadi, a Kannada editor in the browser at /editor/: it converts text typed in the Nudi, Baraha and Akruti fonts to Unicode, types Kannada from English letters, marks what could not be converted, and saves Word, web, text and Nudi files. It runs on the visitor's device with the open-source kannadi library compiled to WebAssembly. The fonts Neha Sans, Neha Serif and Gari are released at /fonts/. Spell check, a dictionary and OCR are coming soon, and /ai-benchmark/ shows what Kannada costs in AI tokenizers.",
          details: [
            `Source of the library: ${SITE.repository} (Rust, MIT OR Apache-2.0).`,
            "Every page is also served as markdown at the same path plus index.md, and on requests that accept text/markdown.",
            "In browsers with WebMCP, every editor page registers 4 read-only tools that run the library on the page: convert_legacy_to_unicode, convert_unicode_to_legacy, transliterate and count_aksharas.",
          ],
          url,
        };
        await writeFile(join(dist, "llms.txt"), llmsIndex(pages, info));
        await writeFile(join(dist, "llms-full.txt"), llmsFull(pages, info));
        const map = site ? url("/sitemap.xml") : null;
        await writeFile(join(dist, "robots.txt"), robots(map));
        if (site) {
          const hashes: PageHashes = JSON.parse(await readFile(new URL(HASH_FILE, root), "utf8"));
          const git = (args: string[]) => execFileSync("git", args, { cwd: fileURLToPath(root), encoding: "utf8" });
          if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") {
            const message = "Shallow git clone: every page's lastmod is the date of the newest commit. Deploy from a full clone.";
            // Workers Builds publishes this sitemap, so wrong dates there would reach search engines and IndexNow.
            if (process.env.WORKERS_CI === "1") throw new Error(message);
            logger.warn(message);
          }
          const lastmod = (p: BuiltPage) => {
            const hash = contentHash(p.markdown);
            return hashes[p.path] === hash ? lastmodOf(hash, git) : undefined;
          };
          await writeFile(join(dist, "sitemap.xml"), sitemap(pages.map((p) => ({ loc: url(p.path), lastmod: lastmod(p) }))));
        }
        logger.info(`${pages.length} markdown mirrors, llms.txt and llms-full.txt${site ? ", sitemap.xml" : ""}`);
      },
    },
  };
}
