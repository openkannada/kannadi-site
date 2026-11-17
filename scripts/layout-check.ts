// Loads every built page at 6 widths, light and dark, and fails on horizontal scroll, layout shift
// or clipped Kannada. With --shots DIR it also saves a screenshot of each:
// node scripts/layout-check.ts [dist] [--shots DIR]
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

import puppeteer from "puppeteer-core";

import { WIDTHS, layoutProblems, type Measure } from "../src/lib/layout.ts";

const args = process.argv.slice(2);
const dist = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--shots") ?? "dist";
const shots = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : undefined;
if (shots) mkdirSync(shots, { recursive: true });
const CHROME = process.env.CHROME_PATH ?? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
if (!CHROME) throw new Error("Set CHROME_PATH to a Chrome or Chromium binary.");

const TYPES: Record<string, string> = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".wasm": "application/wasm", ".json": "application/json", ".tsv": "text/plain" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  const file = join(dist, path.endsWith("/") ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const port = (server.address() as { port: number }).port;

const pages = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === "index.html")
  .map((e) => `/${relative(dist, e.parentPath).split(sep).join("/")}/`.replace("//", "/"))
  .sort();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const problems: string[] = [];
try {
  for (const path of pages) {
    for (const scheme of ["light", "dark"] as const) {
      for (const width of WIDTHS) {
        const page = await browser.newPage();
        // Screenshots show each illustration's final frame, as reduced motion does.
        await page.emulateMediaFeatures([
          { name: "prefers-color-scheme", value: scheme },
          ...(shots ? [{ name: "prefers-reduced-motion", value: "reduce" }] : []),
        ]);
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await page.evaluateOnNewDocument(() => {
          (globalThis as unknown as { __cls: number }).__cls = 0;
          new PerformanceObserver((list) => {
            for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
              if (!e.hadRecentInput) (globalThis as unknown as { __cls: number }).__cls += e.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        });
        await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: "networkidle0" });
        await new Promise((r) => setTimeout(r, 300));
        const m: Measure = await page.evaluate(() => {
          const clipped = [...document.querySelectorAll<HTMLElement>("main [lang='kn'], main :lang(kn) h1, main :lang(kn) p")]
            .filter((el) => {
              const s = getComputedStyle(el);
              return /(hidden|clip)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
            })
            .map((el) => el.textContent?.slice(0, 20) ?? "");
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            cls: (globalThis as unknown as { __cls: number }).__cls,
            clippedKannada: clipped,
          };
        });
        for (const p of layoutProblems(m)) problems.push(`${path} ${width}px ${scheme}: ${p}`);
        if (shots) await page.screenshot({ path: join(shots, `${path.replace(/\//g, "_") || "_"}-${width}-${scheme}.png`), fullPage: true });
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Layout: ${pages.length} pages at ${WIDTHS.length} widths in light and dark, with no horizontal scroll, layout shift or clipped Kannada.`);
