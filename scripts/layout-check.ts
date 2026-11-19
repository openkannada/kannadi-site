// Loads every built page at 6 widths, light and dark, and fails on horizontal scroll (with and without
// every answer open), layout shift,
// Kannada text cut by an ancestor that hides overflow, or an illustration whose animation does not end
// on its rest frame. With --shots DIR it also saves a screenshot of each:
// node scripts/layout-check.ts [dist] [--shots DIR]
import { mkdirSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import puppeteer from "puppeteer-core";

import { WIDTHS, frameDrift, isClipped, layoutProblems, misaligned, type Card, type Measure } from "../src/lib/layout.ts";
import { chrome, serve } from "./browser.ts";

const args = process.argv.slice(2);
const dist = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--shots") ?? "dist";
const shots = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : undefined;
if (shots) mkdirSync(shots, { recursive: true });
const CHROME = chrome();
const { server, port } = serve(dist);

const pages = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === "index.html")
  .map((e) => `/${relative(dist, e.parentPath).split(sep).join("/")}/`.replace("//", "/"))
  .sort();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const problems: string[] = [];
try {
  for (const path of pages) {
    for (const scheme of ["light", "dark"] as const) {
      const page = await browser.newPage();
      // Screenshots show each illustration's final frame, as reduced motion does.
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: scheme },
        ...(shots ? [{ name: "prefers-reduced-motion", value: "reduce" }] : []),
      ]);
      await page.evaluateOnNewDocument(() => {
        (globalThis as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!e.hadRecentInput) (globalThis as unknown as { __cls: number }).__cls += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      for (const width of WIDTHS) {
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: "networkidle0" });
        await new Promise((r) => setTimeout(r, 300));
        const seen = await page.evaluate(() => {
          // Kannada text in the page, measured by its glyph boxes, against every ancestor that hides overflow.
          const texts = [...document.querySelectorAll<HTMLElement>("main [lang='kn'], main:lang(kn) h1, main:lang(kn) p")].filter(
            (el) => el.getClientRects().length && !(el instanceof SVGElement) && !el.closest("svg"),
          );
          return texts.map((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            const r = range.getBoundingClientRect();
            const clippers = [];
            for (let a: HTMLElement | null = el; a && a !== document.body; a = a.parentElement) {
              const s = getComputedStyle(a);
              // An ellipsis is a deliberate cut; a scroller lets the text be reached.
              if (s.textOverflow === "ellipsis") break;
              const x = /hidden|clip/.test(s.overflowX);
              const y = /hidden|clip/.test(s.overflowY);
              if (!x && !y) continue;
              const b = a.getBoundingClientRect();
              clippers.push({ box: { left: b.left, top: b.top, right: b.right, bottom: b.bottom }, x, y });
            }
            return { text: el.textContent?.trim().slice(0, 20) ?? "", box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, clippers };
          });
        });
        const m: Measure = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          cls: (globalThis as unknown as { __cls: number }).__cls,
          clippedKannada: [],
        }));
        m.clippedKannada = seen.filter((t) => isClipped(t.box, t.clippers)).map((t) => t.text);
        for (const p of layoutProblems(m)) problems.push(`${path} ${width}px ${scheme}: ${p}`);
        const rows: { name: string; cards: Card[] }[] = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("[data-cards]")].map((list) => ({
            name: list.dataset.cards || list.className,
            cards: [...list.children].filter((c) => c.getBoundingClientRect().height > 0).map((c) => {
              const r = c.getBoundingClientRect();
              const parts: Record<string, number> = {};
              for (const p of c.querySelectorAll<HTMLElement>("[data-align]")) if (p.getBoundingClientRect().height > 0) parts[p.dataset.align!] = p.getBoundingClientRect().top;
              return { top: r.top, bottom: r.bottom, width: r.width, parts };
            }),
          })),
        );
        for (const { name, cards } of rows) for (const p of misaligned(cards)) problems.push(`${path} ${width}px ${scheme}: in ${name}, ${p}`);
        const openWidth = await page.evaluate(() => {
          for (const d of document.querySelectorAll("main details")) (d as HTMLDetailsElement).open = true;
          return document.documentElement.scrollWidth;
        });
        if (openWidth > m.innerWidth) problems.push(`${path} ${width}px ${scheme}: scrolls sideways to ${openWidth}px with every answer open`);
        if (shots) await page.screenshot({ path: join(shots, `${path.replace(/\//g, "_") || "_"}-${width}-${scheme}.png`), fullPage: true });
      }
      // Every illustration's animation must end on its rest frame, so motion and no motion agree.
      if (!shots) {
        const drift = await page.evaluate(() => {
          document.documentElement.classList.remove("illo-wait");
          const snap = (svg: Element) =>
            [...svg.querySelectorAll("*")].map((c) => {
              const s = getComputedStyle(c);
              return `${c.getAttribute("class") ?? c.tagName}|${s.opacity}|${s.fillOpacity}|${s.transform}|${s.filter}|${s.clipPath}|${s.strokeDashoffset}`;
            });
          return [...document.querySelectorAll(".illo")].map((svg) => {
            svg.classList.remove("is-in");
            const rest = snap(svg);
            svg.classList.add("is-in");
            for (const a of svg.getAnimations({ subtree: true })) a.finish();
            return { name: svg.getAttribute("class") ?? "", rest, final: snap(svg) };
          });
        });
        for (const d of drift) for (const part of frameDrift(d.rest, d.final)) problems.push(`${path} ${scheme}: ${d.name} ends away from its rest frame at ${part}`);
      }
      await page.close();
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
console.log(`Layout: ${pages.length} pages at ${WIDTHS.length} widths in light and dark, with no horizontal scroll, layout shift, clipped Kannada or cards out of line, and every illustration ending on its rest frame.`);
