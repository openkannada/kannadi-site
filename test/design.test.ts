// Tests for the design tokens and the light on glass: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { colorValue, contrast, contrastProblems, oklchToRgba, over, toCss, type Tokens } from "../design/tokens.ts";
import { canRefract, lightAt } from "../src/lib/light.ts";

const tokens: Tokens = JSON.parse(readFileSync(new URL("../design/tokens.json", import.meta.url), "utf8"));

test("design/tokens.css is generated from design/tokens.json and up to date", () => {
  assert.equal(readFileSync(new URL("../design/tokens.css", import.meta.url), "utf8"), toCss(tokens), "run npm run tokens");
});

test("every text color reads at 4.5:1 or more on each surface it is used on, glass over each color field included", () => {
  assert.deepEqual(contrastProblems(tokens), []);
});

test("the contrast check catches a glass highlight too bright for the text under it", () => {
  const bright = structuredClone(tokens);
  (bright.color as Record<string, { $value: { light: string; dark: string } }>)["glass-specular"]!.$value.dark = "oklch(1 0 0 / 0.14)";
  assert.ok(contrastProblems(bright).some((p) => p.startsWith("dark: primary on glass over field-turmeric")));
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

test("glass bends the backdrop only in Chromium, and never when transparency is reduced", () => {
  const fake = (brands: string[], supports: boolean, reduced: boolean) =>
    ({
      navigator: { userAgentData: brands.length ? { brands: brands.map((brand) => ({ brand })) } : undefined },
      CSS: { supports: () => supports },
      matchMedia: (q: string) => ({ matches: reduced && q.includes("reduced-transparency") }),
    }) as unknown as Window & typeof globalThis;
  assert.equal(canRefract(fake(["Chromium", "Google Chrome"], true, false)), true);
  assert.equal(canRefract(fake([], true, false)), false, "Safari and Firefox have no Chromium brand");
  assert.equal(canRefract(fake(["Chromium"], false, false)), false);
  assert.equal(canRefract(fake(["Chromium"], true, true)), false);
});
