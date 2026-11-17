import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { assetProblems, assetRefs, keepAssets } from "../src/lib/assets.ts";

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

test("a deploy keeps the live files the new build lacks, and the files they name, once each", async () => {
  const live = new Map([
    ["/_astro/Base.old.css", "@font-face{src:url(/_astro/font.same.woff2)}body{background:url(/_astro/bg.old.png)}"],
    ["/_astro/app.old.js", 'import"./chunk.old.js";import"./shared.same.js"'],
    ["/_astro/chunk.old.js", 'import"./app.old.js"'],
    ["/_astro/bg.old.png", "png"],
  ]);
  const asked: string[] = [];
  const { files, failed } = await keepAssets(
    ["/_astro/Base.old.css", "/_astro/app.old.js", "/_astro/gone.old.js", "/_astro/Base.old.css"],
    new Set(["font.same.woff2", "shared.same.js"]),
    async (ref) => {
      asked.push(ref);
      const body = live.get(ref);
      return body === undefined ? null : new TextEncoder().encode(body);
    },
  );
  assert.deepEqual([...files.keys()].sort(), ["Base.old.css", "app.old.js", "bg.old.png", "chunk.old.js"]);
  assert.deepEqual(failed, ["/_astro/gone.old.js"]);
  assert.equal(asked.length, new Set(asked).size, "each file is fetched once, even in a cycle");
  assert.ok(!asked.some((r) => r.includes(".same.")), "a file the new build has is not fetched");
});

test("names end at their extension, and Vite's preload list counts", () => {
  assert.deepEqual(assetRefs('"/_astro/data.Ab1.json"'), ["/_astro/data.Ab1.json"]);
  assert.deepEqual(assetRefs('__vite__mapDeps(["_astro/files.DQ.js","_astro/x.Q.css"])'), ["/_astro/files.DQ.js", "/_astro/x.Q.css"]);
  assert.deepEqual(assetRefs("my_astro/x.js"), []);
});

test("build files are never cached for a year, since that would hold a 404 too", () => {
  const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
  const block = headers.split(/\n(?=\S)/).find((b) => b.startsWith("/_astro/*")) ?? "";
  assert.doesNotMatch(block, /max-age=[1-9]|immutable/);
});
