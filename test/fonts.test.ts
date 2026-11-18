// Tests for the self-hosted fonts, their faces and stacks, and the fonts page: npm test
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

import { ALL_PAGES, FONT_RELEASES, PAGES } from "../src/content/pages.ts";
import { HOME_COPY } from "../src/content/home.ts";
import { jsonLd } from "../src/lib/seo.ts";

const root = new URL("../", import.meta.url);
const read = (f: string) => readFileSync(new URL(f, root), "utf8");

// The SHA-256 digests GitHub records for the release assets.
const RELEASED: Record<string, string> = {
  "neha-sans-kannada-wght.woff2": "3b458170595b19353a9231cc6093e841243064e5ec57a69ddc77fcf64abcc17a",
  "neha-serif-kannada-wght.woff2": "324d0705f1673cbccea40e369b72e76e51cafc7bf91ed342aea601be422d10f7",
  "gari-kannada.woff2": "c9f71cde02503abeef2aaf270aa53f77556e74cd953624e1909ec43c54bfebc3",
};
const KANNADA_RANGE = "U+0C80-0CFF, U+200C-200D, U+25CC, U+0964-0965";

/** Each @font-face rule in a stylesheet as a map of its properties. */
function faces(css: string): Record<string, string>[] {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) =>
    Object.fromEntries(
      m[1]!.split(";").map((d) => d.trim()).filter(Boolean).map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]),
    ),
  );
}
const fileOf = (src: string) => src.match(/url\("?\.\.\/(?:src\/)?fonts\/([^")]+)"?\)/)?.[1];

test("the Neha and Gari files are the released files, byte for byte", () => {
  for (const [file, digest] of Object.entries(RELEASED)) {
    const sha = createHash("sha256").update(readFileSync(new URL(`src/fonts/${file}`, root))).digest("hex");
    assert.equal(sha, digest, `src/fonts/${file} is not the released file`);
  }
});

test("Kannada comes from Neha Sans, Neha Serif and Gari, and Latin from the Noto subsets", () => {
  const all = faces(read("src/styles/global.css"));
  const kannada = all.filter((f) => f["unicode-range"]?.startsWith("U+0C80"));
  assert.deepEqual(
    kannada.map((f) => [f["font-family"], f["font-weight"], f["font-display"], f["unicode-range"], fileOf(f.src!)]),
    [
      ['"Neha Sans"', "100 900", "swap", KANNADA_RANGE, "neha-sans-kannada-wght.woff2"],
      ['"Neha Serif"', "100 900", "swap", KANNADA_RANGE, "neha-serif-kannada-wght.woff2"],
      ['"Gari"', "400", "swap", KANNADA_RANGE, "gari-kannada.woff2"],
    ],
  );
  const vedic = all.filter((f) => f["unicode-range"]?.startsWith("U+1CD0"));
  assert.deepEqual(
    vedic.map((f) => [f["font-family"], fileOf(f.src!)]),
    [
      ['"Neha Sans"', "noto-sans-kannada-kannada-wght-normal.woff2"],
      ['"Neha Serif"', "noto-serif-kannada-kannada-wght-normal.woff2"],
    ],
  );
  const latin = all.filter((f) => !kannada.includes(f) && !vedic.includes(f));
  assert.deepEqual(latin.map((f) => f["font-family"]), ['"Noto Sans"', '"Noto Sans"', '"Noto Serif Kannada"']);
  for (const f of latin) assert.doesNotMatch(f["unicode-range"]!, /0C80/, `${f["font-family"]} still draws Kannada`);
  const used = all.map((f) => fileOf(f.src!)).sort();
  assert.deepEqual(used, readdirSync(new URL("src/fonts/", root)).filter((n) => n.endsWith(".woff2")).sort(), "every font file has a face, and every face a file");
});

test("the sans stack starts with Neha Sans and Noto Sans, the serif stack with Neha Serif, and only Neha Sans and Latin are preloaded", () => {
  const tokens = JSON.parse(read("design/tokens.json")).type;
  assert.match(tokens["type-sans"].$value, /^"Neha Sans", "Noto Sans", /);
  assert.match(tokens["type-serif"].$value, /^"Neha Serif", "Noto Serif Kannada", /);
  assert.match(read("src/styles/editor.css"), /:root\[data-font="serif"\] \.doc \{\s*@apply font-serif;/, "the editor's Serif typeface uses the serif stack");
  const base = read("src/layouts/Base.astro");
  const preloads = [...base.matchAll(/import \w+ from "\.\.\/fonts\/([^"?]+)\?url"/g)].map((m) => m[1]);
  assert.deepEqual(preloads, ["neha-sans-kannada-wght.woff2", "noto-sans-latin-wght-normal.woff2"]);
  assert.equal(base.match(/rel="preload"[^>]*as="font"/g)?.length, 2);
});

test("the Open Graph cards set Kannada in Neha Sans, from a file that exists", () => {
  const og = read("scripts/og.html");
  const kn = faces(og).find((f) => f["unicode-range"]?.startsWith("U+0C80"))!;
  assert.equal(kn["font-family"], '"Neha Sans"');
  assert.ok(existsSync(new URL(`src/fonts/${fileOf(kn.src!)}`, root)));
  assert.match(og, /font-family: "Neha Sans", "Noto Sans", sans-serif;/);
});

test("the fonts page is released: each release, zip and repository is linked, with a specimen in each font", () => {
  const assertReleased = (slug: string) => {
    const page = ALL_PAGES.find((p) => p.slug === slug);
    assert.ok(page?.kind === "project", slug);
    const html = JSON.stringify(page.sections);
    assert.doesNotMatch(html, /Coming soon|ಶೀಘ್ರದಲ್ಲೇ/, `${slug} still says the fonts are coming`);
    for (const r of FONT_RELEASES) {
      for (const url of [r.page, r.zip, r.source]) assert.ok(html.includes(`href=\\"${url}\\"`), `${slug} does not link ${url}`);
    }
    assert.match(page.sections.find((s) => s.id === "downloads")!.paragraphs!.join(" "), /SHA-256/);
    const specimen = page.sections.find((s) => s.id === "specimen")!.specimen!;
    assert.deepEqual(specimen.faces.map((f) => f.face), ["neha-sans", "neha-serif", "gari"]);
    assert.match(specimen.text, /^ಎಲ್ಲಾ ಮಾನವರೂ ಸ್ವತಂತ್ರರಾಗಿಯೇ ಜನಿಸಿದ್ದಾರೆ\./);
    assert.ok(specimen.clusters.split(" ").includes("ರೃ"));
    for (const id of ["based", "fixed", "limits", "license"]) assert.ok(page.sections.some((s) => s.id === id), `${slug} lacks ${id}`);
    const work = jsonLd(page, null, PAGES[0]!)["@graph"].find((n: { [k: string]: unknown }) => n["@id"] === `/${slug}/#project`);
    assert.deepEqual(work.hasPart.map((p: { encoding: { contentUrl: string } }) => p.encoding.contentUrl), FONT_RELEASES.map((r) => r.zip));
    return page;
  };
  assertReleased("fonts");
  assert.equal(assertReleased("kn/fonts").needsReview, true, "the Kannada page waits for a native reader");
  const css = read("src/layouts/ProjectPage.astro");
  for (const face of ["neha-sans", "neha-serif", "gari"]) assert.match(css, new RegExp(`\\.face-${face} \\{\\s*font-family: `), `no CSS for ${face}`);
  assert.match(css, /\.face-gari \{\s*font-family: "Gari"/);
  for (const lang of ["en", "kn"] as const) {
    assert.equal(HOME_COPY[lang].tools.items.find((t) => t.slug === "fonts")!.soon, undefined, `the ${lang} home card still says the fonts are coming`);
  }
});

/** The code points a unicode-range lists. */
function codePoints(range: string): number[] {
  return range.split(",").flatMap((part) => {
    const [lo, hi = lo] = part.trim().replace("U+", "").split("-").map((h) => parseInt(h, 16));
    return Array.from({ length: hi! - lo! + 1 }, (_, i) => lo! + i);
  });
}

test("every character the old Noto Kannada face drew still has a face in the sans and serif stacks", () => {
  const OLD = "U+0C80-0CFF, U+1CD0, U+1CD2-1CD3, U+1CDA, U+1CF2, U+1CF4, U+200C-200D, U+25CC, U+A830-A835";
  const all = faces(read("src/styles/global.css"));
  for (const family of ['"Neha Sans"', '"Neha Serif"']) {
    const covered = new Set(all.filter((f) => f["font-family"] === family).flatMap((f) => codePoints(f["unicode-range"]!)));
    const missing = codePoints(OLD).filter((c) => !covered.has(c)).map((c) => `U+${c.toString(16).toUpperCase()}`);
    assert.deepEqual(missing, [], `${family} has no face for ${missing.join(", ")}`);
  }
});
