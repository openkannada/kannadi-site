import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { HOME_COPY } from "../src/content/home.ts";
import { NAV, PAGES, inLanguage } from "../src/content/pages.ts";
import { PRIMARY_TOOLS, TOOL_MARK, toolFor } from "../src/content/tools.ts";

test("the header puts the editor, converters, fonts, spell check, dictionary and OCR 1 click away", () => {
  assert.deepEqual([...PRIMARY_TOOLS], ["editor", "nudi-to-unicode", "fonts", "spell-check", "dictionary", "ocr"]);
  for (const lang of ["en", "kn"] as const) {
    const names = new Map(HOME_COPY[lang].tools.items.map((t) => [t.slug, t.name]));
    for (const slug of PRIMARY_TOOLS) {
      assert.ok(inLanguage(slug, lang), `${slug} has a page in ${lang}`);
      assert.ok(names.get(slug), `${slug} has a ${lang} name on the home page`);
    }
  }
});

test("every page the header leaves out is in its More menu", () => {
  const header = readFileSync(new URL("../src/components/SiteHeader.astro", import.meta.url), "utf8");
  assert.match(header, /pages\(NAV\.typing\)/);
  assert.match(header, /pages\(NAV\.converters\)/);
  assert.match(header, /pages\(\["ai-benchmark", \.\.\.NAV\.org\]\)/);
  const reachable = new Set([...PRIMARY_TOOLS, ...NAV.typing, ...NAV.converters, "ai-benchmark", ...NAV.org]);
  for (const slug of Object.values(NAV).flat()) assert.ok(reachable.has(slug), `${slug} is in the header or More`);
});

test("a converter page lights up Converters, and pages outside the 6 tools light up none", () => {
  for (const slug of NAV.converters) assert.equal(toolFor(slug), "nudi-to-unicode");
  assert.equal(toolFor("fonts"), "fonts");
  assert.equal(toolFor("editor"), "editor");
  for (const slug of ["kannada-typing", "about", "ai-benchmark", ""]) assert.equal(toolFor(slug), undefined);
});

test("each tool and the AI benchmark has a mark of Kannada letters", () => {
  for (const slug of [...PRIMARY_TOOLS, "ai-benchmark"]) {
    assert.match(TOOL_MARK[slug] ?? "", /^[ಀ-೿]+$/u, `${slug} has a Kannada mark`);
    assert.ok(PAGES.some((p) => p.slug === slug));
  }
});

test("each converter page compares all 4 converters and links each one", async () => {
  const { CONVERTERS } = await import("../src/content/converters.ts");
  assert.deepEqual([...CONVERTERS.slugs].sort(), [...NAV.converters].sort());
  CONVERTERS.slugs.forEach((slug, i) => assert.ok(CONVERTERS.rows[i]?.[0]?.includes(`href="/${slug}/"`), `row ${i} links ${slug}`));
});
