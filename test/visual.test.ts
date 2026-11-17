// Tests for the icon set, the illustrations' placement and the layout rules: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { PAGES } from "../src/content/pages.ts";
import { ICONS } from "../src/icons/icons.ts";
import { illustrationFor } from "../src/lib/illustrations.ts";
import { MAX_CLS, WIDTHS, layoutProblems } from "../src/lib/layout.ts";
import { iconsPage } from "../scripts/icons.ts";

/** Every point an SVG path reaches (end points and control points), in absolute coordinates. */
function pathPoints(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const sizes = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  const points = [];
  let x = 0, y = 0, startX = 0, startY = 0, cmd = "";
  for (let i = 0; i < tokens.length; ) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const lower = cmd.toLowerCase();
    if (lower === "z") { x = startX; y = startY; continue; }
    const n = tokens.slice(i, i + sizes[lower]).map(Number);
    i += sizes[lower];
    const rel = cmd === lower;
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (lower === "h") x = ox + n[0];
    else if (lower === "v") y = oy + n[0];
    else if (lower === "a") { x = ox + n[5]; y = oy + n[6]; }
    else {
      for (let k = 0; k < n.length - 2; k += 2) points.push([ox + n[k], oy + n[k + 1]]);
      x = ox + n[n.length - 2]; y = oy + n[n.length - 1];
    }
    points.push([x, y]);
    if (lower === "m") { startX = x; startY = y; cmd = rel ? "l" : "L"; }
  }
  return points;
}

test("every icon is drawn inside the 24 by 24 grid, from 2 to 22, and says what it is for", () => {
  for (const [name, icon] of Object.entries(ICONS)) {
    assert.ok(icon.use.length > 2, name);
    for (const [x, y] of pathPoints(icon.d)) {
      assert.ok(x >= 2 && x <= 22 && y >= 2 && y <= 22, `${name}: (${x}, ${y}) is outside 2 to 22`);
    }
  }
});

test("design/icons.html shows every icon and is up to date", () => {
  assert.equal(readFileSync(new URL("../design/icons.html", import.meta.url), "utf8"), iconsPage(), "run npm run icons");
});

test("tool pages get the illustration of their tool, and reference pages the letters", () => {
  const by = (slug) => illustrationFor(PAGES.find((p) => p.slug === slug));
  assert.equal(by(""), "convert");
  assert.equal(by("nudi-to-unicode"), "convert");
  assert.equal(by("english-to-kannada-typing"), "typing");
  assert.equal(by("kagunita"), "letters");
  assert.equal(by("about"), null);
});

test("a page breaks when it scrolls sideways, shifts, or clips Kannada", () => {
  assert.deepEqual(WIDTHS, [360, 390, 768, 1024, 1440, 1920]);
  assert.deepEqual(layoutProblems({ scrollWidth: 390, innerWidth: 390, cls: 0, clippedKannada: [] }), []);
  assert.deepEqual(layoutProblems({ scrollWidth: 402, innerWidth: 390, cls: MAX_CLS + 0.01, clippedKannada: ["ಕನ್ನಡ"] }), [
    "scrolls sideways by 12px",
    "layout shift 0.060",
    "clipped Kannada: ಕನ್ನಡ",
  ]);
});
