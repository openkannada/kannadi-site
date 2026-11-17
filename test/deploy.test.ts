// Tests for the deploy plan: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkoutProblem, deployEnv, deploySteps, placeholders, productionUrl, unreviewed } from "../src/lib/deploy.ts";

const URL_ROOT = "https://kannada.example.com.au/";

test("the production URL needs a real https host at the domain root", () => {
  assert.equal(productionUrl("https://kannada.example.com.au").href, URL_ROOT);
  assert.throws(() => productionUrl(undefined), /Set SITE_URL/);
  assert.throws(() => productionUrl(""), /Set SITE_URL/);
  assert.throws(() => productionUrl("http://kannada.example.com.au/"), /https/);
  assert.throws(() => productionUrl("https://kannada.example.com.au/kannada/"), /domain root/);
  for (const host of ["example.org", "www.example.com", "localhost", "site.test", "site.invalid", "site.example"]) {
    assert.throws(() => productionUrl(`https://${host}/`), /placeholder/, host);
  }
  assert.throws(() => productionUrl("https://kannadi.pages.dev/"), /own domain/);
});

test("only a clean main at origin/main is deployed", () => {
  const ok = { clean: true, branch: "main", head: "abc", originMain: "abc" };
  assert.equal(checkoutProblem(ok), null);
  assert.match(checkoutProblem({ ...ok, clean: false }) ?? "", /changes/);
  assert.match(checkoutProblem({ ...ok, branch: "feature" }) ?? "", /main branch/);
  assert.match(checkoutProblem({ ...ok, head: "def" }) ?? "", /differs from origin\/main/);
});

test("the deploy builds the library from kannadi.rev, never from a local checkout", () => {
  const env = deployEnv({ KANNADI_DIR: "/somewhere", PATH: "/bin" }, new URL(URL_ROOT));
  assert.equal(env.KANNADI_DIR, undefined);
  assert.equal(env.SITE_URL, URL_ROOT);
  assert.equal(env.PATH, "/bin");
});

test("the deploy checks the build at the production URL before it publishes", () => {
  const lines = deploySteps(new URL(URL_ROOT)).map((s) => [s.command, ...s.args].join(" "));
  const at = (line: string) => {
    const i = lines.indexOf(line);
    assert.ok(i >= 0, `missing step: ${line}`);
    return i;
  };
  const publish = at("npx --no -- wrangler pages deploy --branch main");
  assert.ok(at(`node scripts/indexnow.ts snapshot ${URL_ROOT}`) < publish, "the live sitemap is saved before it is replaced");
  assert.ok(at(`node scripts/live-check.ts ${URL_ROOT}`) > publish);
  assert.ok(at(`node scripts/indexnow.ts submit ${URL_ROOT}`) > at(`node scripts/live-check.ts ${URL_ROOT}`), "IndexNow hears only about a site that checked out");
  assert.equal(at(`node scripts/indexnow.ts submit ${URL_ROOT}`), lines.length - 1);
  assert.equal(at("npm run wasm"), 0);
  for (const check of ["npm run check", "npm test", `node scripts/seo-smoke.ts dist ${URL_ROOT}`, "npm run voice-lint", "node scripts/placeholders.ts dist"]) {
    assert.ok(at(check) < publish, check);
  }
  assert.ok(at("npm run build") < at(`node scripts/seo-smoke.ts dist ${URL_ROOT}`));
});

test("placeholders for Prasad's words are found in built HTML and markdown", () => {
  assert.deepEqual(placeholders('<p><mark class="todo">PRASAD: 1 line on Neha.</mark> <a href="/">x</a></p>'), ["PRASAD: 1 line on Neha."]);
  assert.deepEqual(placeholders("Contact\n\nPRASAD: press contact, an email address or a form.\n"), ["PRASAD: press contact, an email address or a form."]);
  assert.deepEqual(placeholders("Prasad: the founder."), []);
  assert.deepEqual(placeholders('<p><mark class="todo">Neha designs the fonts.</mark></p>'), ["highlighted as a placeholder: Neha designs the fonts."]);
  assert.deepEqual(placeholders('<mark class="todo" data-astro-cid-x>Photo by <a href="/">Neha</a>.</mark>'), ["highlighted as a placeholder: Photo by Neha."]);
  assert.deepEqual(placeholders('<mark class="todo" data-astro-cid-x>PRASAD: photo of Neha Prasad, from Prasad.</mark>'), ["PRASAD: photo of Neha Prasad, from Prasad."]);
});

test("the deploy lists every page that waits for a native reader", () => {
  assert.deepEqual(unreviewed([{ slug: "" }, { slug: "kn", needsReview: true }, { slug: "kn/about", needsReview: true }]), ["/kn/", "/kn/about/"]);
  assert.deepEqual(unreviewed([{ slug: "about" }]), []);
});
