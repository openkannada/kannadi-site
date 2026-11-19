// Tests for the icon set, the illustrations' placement and the layout rules: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { PAGES } from "../src/content/pages.ts";
import { ICONS } from "../src/icons/icons.ts";
import { illustrationFor } from "../src/lib/illustrations.ts";
import { MAX_CLS, WIDTHS, frameDrift, isClipped, layoutProblems, misaligned } from "../src/lib/layout.ts";
import { watchInView } from "../src/lib/inview.ts";
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
    for (const [x, y] of [icon.d, icon.fill ?? ""].flatMap(pathPoints)) {
      assert.ok(x >= 2 && x <= 22 && y >= 2 && y <= 22, `${name}: (${x}, ${y}) is outside 2 to 22`);
    }
  }
});

test("design/icons.html shows every icon and is up to date", () => {
  assert.equal(readFileSync(new URL("../design/icons.html", import.meta.url), "utf8"), iconsPage(), "run npm run icons");
});

test("tool and project pages get the illustration of their tool, and reference pages the letters", () => {
  const by = (slug) => illustrationFor(PAGES.find((p) => p.slug === slug));
  assert.deepEqual(by("editor"), { name: "convert", from: "PÀ£ÀßqÀ", to: "ಕನ್ನಡ" });
  assert.equal(by(""), null, "the home page shows each tool's own illustration instead");
  assert.deepEqual(by("dictionary"), { name: "dictionary" });
  assert.deepEqual(by("ai-benchmark"), { name: "benchmark" });
  assert.deepEqual(by("fonts"), { name: "font" });
  assert.deepEqual(by("nudi-to-unicode"), { name: "convert", from: "PÀ£ÀßqÀ", to: "ಕನ್ನಡ" });
  // Each converter shows its own direction and encoding.
  assert.deepEqual(by("unicode-to-nudi"), { name: "convert", from: "ಕನ್ನಡ", to: "PÀ£ÀßqÀ" });
  assert.equal(by("baraha-to-unicode").from, "¸ÀPÁðj");
  assert.deepEqual(by("english-to-kannada-typing"), { name: "typing" });
  assert.deepEqual(by("kagunita"), { name: "letters" });
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

test("Kannada counts as clipped only when an ancestor that hides overflow cuts it", () => {
  const box = { left: 0, top: 0, right: 100, bottom: 40 };
  const clip = (b, x = true, y = true) => ({ box: b, x, y });
  assert.equal(isClipped({ left: 10, top: 5, right: 90, bottom: 35 }, [clip(box)]), false);
  assert.equal(isClipped({ left: 10, top: 5, right: 90, bottom: 48 }, [clip(box)]), true, "cut at the bottom");
  assert.equal(isClipped({ left: 10, top: 5, right: 130, bottom: 35 }, [clip(box)]), true, "cut on the right");
  assert.equal(isClipped({ left: 10, top: 5, right: 130, bottom: 35 }, [clip(box, false, true)]), false, "only y is hidden");
  assert.equal(isClipped({ left: 10, top: 5, right: 100.8, bottom: 35 }, [clip(box)]), false, "within 1px");
  assert.equal(isClipped({ left: 10, top: 5, right: 90, bottom: 35 }, [clip({ left: 0, top: 0, right: 1, bottom: 1 })]), false, "visually hidden text");
});

test("an illustration drifts when any part ends away from its rest frame", () => {
  assert.deepEqual(frameDrift(["a|1", "b|1"], ["a|1", "b|1"]), []);
  assert.deepEqual(frameDrift(["a|1", "b|0.45"], ["a|1", "b|0.18"]), ["b|0.18"]);
  assert.deepEqual(frameDrift(["t|1|none|none"], ["t|1|matrix(1, 0, 0, 1, 0, 0)|blur(0px)"]), [], "an identity transform and a zero blur look like none");
  assert.deepEqual(frameDrift(["t|1|none"], ["t|1|matrix(1, 0, 0, 1, 0, -6)"]), ["t|1|matrix(1, 0, 0, 1, 0, -6)"]);
  assert.deepEqual(frameDrift(["t|0|1|none"], ["t|0|1|matrix(1, 0, 0, 1, 14, 0)"]), [], "a hidden part may end anywhere");
});

test("illustrations start once each, in view, and show at once where they cannot be watched", () => {
  const classes = (list = []) => ({ list, add(c) { if (!list.includes(c)) list.push(c); }, remove(c) { const i = list.indexOf(c); if (i >= 0) list.splice(i, 1); }, contains: (c) => list.includes(c) });
  const fakeDoc = (n) => {
    const items = Array.from({ length: n }, () => ({ classList: classes() }));
    return { documentElement: { classList: classes(["illo-wait"]) }, querySelectorAll: () => items, items };
  };
  const saved = globalThis.IntersectionObserver;
  try {
    delete globalThis.IntersectionObserver;
    const plain = fakeDoc(1);
    watchInView(plain);
    assert.equal(plain.documentElement.classList.contains("illo-wait"), false, "no observer: nothing stays hidden");

    let callback;
    const unobserved = [];
    globalThis.IntersectionObserver = class {
      constructor(cb) { callback = cb; }
      observe() {}
      unobserve(t) { unobserved.push(t); }
    };
    const doc = fakeDoc(2);
    watchInView(doc);
    assert.equal(doc.documentElement.classList.contains("illo-ready"), true);
    callback([{ isIntersecting: false, target: doc.items[0] }, { isIntersecting: true, target: doc.items[1] }]);
    assert.deepEqual(doc.items.map((i) => i.classList.contains("is-in")), [false, true]);
    assert.deepEqual(unobserved, [doc.items[1]], "each starts once");
  } finally {
    globalThis.IntersectionObserver = saved;
  }
});

test("cards side by side line up part by part, and a wide card or a lone card is left alone", () => {
  const card = (top, width, parts) => ({ top, width, parts });
  assert.deepEqual(misaligned([card(0, 300, { value: 20, label: 60 }), card(0, 300, { value: 20, label: 60 }), card(0.5, 300, { value: 21, label: 60 })]), []);
  assert.deepEqual(misaligned([card(0, 300, { value: 20 }), card(0, 300, { value: 44 })]), ["value sits 24px apart across 2 cards"]);
  assert.deepEqual(misaligned([card(0, 300, { value: 20 }), card(200, 300, { value: 300 })]), [], "cards on different rows");
  assert.deepEqual(misaligned([card(0, 300, { name: 20 }), card(0, 620, { name: 90 })]), [], "a card twice as wide has its own layout");
  assert.deepEqual(misaligned([card(0, 300, { name: 20, extra: 80 }), card(0, 300, { name: 20 })]), [], "a part only 1 card has");
});
