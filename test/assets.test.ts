import assert from "node:assert/strict";
import { test } from "node:test";

import { assetProblems, assetRefs } from "../src/lib/assets.ts";

test("build files are found by their /_astro/ path, and inside build files by ./ imports too", () => {
  const html = '<link rel="stylesheet" href="/_astro/Base.Fxe5RP9N.css"><script type="module" src="/_astro/Editor.CuBSZCUe.js"></script><a href="/about/">x</a>';
  assert.deepEqual(assetRefs(html), ["/_astro/Base.Fxe5RP9N.css", "/_astro/Editor.CuBSZCUe.js"]);
  const css = "@font-face{src:url(/_astro/noto.DuwB-P8d.woff2)}";
  assert.deepEqual(assetRefs(css, true), ["/_astro/noto.DuwB-P8d.woff2"]);
  const js = 'import{a}from"./text.BquEOoxh.js";new URL(`/_astro/kannadi_wasm_bg.B6N-tJaa.wasm`,import.meta.url)';
  assert.deepEqual(assetRefs(js, true), ["/_astro/kannadi_wasm_bg.B6N-tJaa.wasm", "/_astro/text.BquEOoxh.js"]);
  assert.deepEqual(assetRefs(js), ["/_astro/kannadi_wasm_bg.B6N-tJaa.wasm"], "a page's ./ links are not build files");
});

test("a build file a live page names that does not load is a problem", () => {
  assert.deepEqual(assetProblems([{ ref: "/_astro/a.css", status: 200 }]), []);
  assert.deepEqual(assetProblems([{ ref: "/_astro/a.css", status: 404 }]), ["/_astro/a.css: status 404, so a page that names it loads without it"]);
});
