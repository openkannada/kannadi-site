// Tests for the design tokens and the light on glass: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { colorValue, contrast, contrastProblems, oklchToRgba, over, toCss, type Tokens } from "../design/tokens.ts";
import { followLight, lightAt } from "../src/lib/light.ts";

const tokens: Tokens = JSON.parse(readFileSync(new URL("../design/tokens.json", import.meta.url), "utf8"));

test("design/tokens.css is generated from design/tokens.json and up to date", () => {
  assert.equal(readFileSync(new URL("../design/tokens.css", import.meta.url), "utf8"), toCss(tokens), "run npm run tokens");
});

test("every text color reads at 4.5:1 or more on each surface it is used on, glass over each color field included", () => {
  assert.deepEqual(contrastProblems(tokens), []);
});

test("the contrast check catches secondary text too dim for glass and the segmented track", () => {
  const dim = structuredClone(tokens);
  (dim.color as Record<string, { $value: { light: string; dark: string } }>)["muted-foreground"]!.$value.dark = "oklch(0.64 0.018 265)";
  const problems = contrastProblems(dim);
  assert.ok(problems.some((p) => p.startsWith("dark: muted-foreground on seg track on glass over")), problems.join("\n"));
});

test("colors convert as browsers draw them", () => {
  const hex = (name: string, theme: "light" | "dark") =>
    `#${oklchToRgba(colorValue(tokens, name, theme)).slice(0, 3).map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`;
  assert.equal(hex("primary", "light"), "#4441be");
  assert.equal(hex("primary", "dark"), "#96a2fc");
  assert.equal(colorValue(tokens, "card-foreground", "dark"), colorValue(tokens, "foreground", "dark"));
  assert.equal(contrast([0, 0, 0], [1, 1, 1]).toFixed(0), "21");
  assert.deepEqual(over([1, 1, 1, 0.5], [0, 0, 0]), [0.5, 0.5, 0.5]);
});

test("colors become light-dark() pairs, references become var(), and the rest is copied", () => {
  const css = toCss(tokens);
  assert.match(css, /--primary: light-dark\(oklch\(0\.46 0\.19 277\), oklch\(0\.74 0\.13 277\)\);/);
  assert.match(css, /--card-foreground: var\(--foreground\);/);
  assert.match(css, /--glass-blur: 22px;/);
  assert.match(css, /:root\[data-theme="dark"\] \{\n  color-scheme: dark;/);
});

test("the light follows the pointer from above: left to right, and never from below", () => {
  assert.deepEqual(lightAt(0, 0, 1000, 800), [-0.8, -1]);
  assert.deepEqual(lightAt(1000, 800, 1000, 800), [0.8, -0.2]);
  assert.deepEqual(lightAt(500, 400, 1000, 800), [0, -0.6]);
  assert.deepEqual(lightAt(-50, 2000, 1000, 800), [-0.8, -0.2]);
});

/** A window whose media queries match the given strings. */
function fakeWindow(brands: string[], supports: boolean, media: string[]) {
  const listeners: Record<string, (e: unknown) => void> = {};
  const props: Record<string, string> = {};
  const frames: (() => void)[] = [];
  const classes = new Set<string>();
  const w = {
    navigator: { userAgentData: brands.length ? { brands: brands.map((brand) => ({ brand })) } : undefined },
    CSS: { supports: () => supports },
    matchMedia: (q: string) => ({ matches: media.some((m) => q.includes(m)) }),
    innerWidth: 1000,
    innerHeight: 800,
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
    requestAnimationFrame: (fn: () => void) => frames.push(fn),
    document: { documentElement: { classList: { add: (c: string) => classes.add(c) }, style: { setProperty: (k: string, v: string) => (props[k] = v) } } },
  };
  return { w: w as unknown as Window & typeof globalThis, listeners, props, frames, classes };
}

test("the light moves at most once a frame with a mouse, and never on touch or under reduced motion", () => {
  const mouse = fakeWindow(["Chromium"], true, ["pointer: fine"]);
  followLight(mouse.w);
  mouse.listeners["pointermove"]!({ clientX: 0, clientY: 0 });
  mouse.listeners["pointermove"]!({ clientX: 1000, clientY: 800 });
  assert.equal(mouse.frames.length, 1, "2 moves in 1 frame ask for 1 frame");
  mouse.frames[0]!();
  assert.deepEqual(mouse.props, { "--light-x": "0.8", "--light-y": "-0.2" }, "the frame uses the latest move");
  for (const media of [[], ["pointer: fine", "reduced-motion"]]) {
    const still = fakeWindow(["Chromium"], true, media);
    followLight(still.w);
    assert.equal(still.listeners["pointermove"], undefined);
  }
});
