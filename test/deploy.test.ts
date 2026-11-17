// Tests for the deploy plan: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkoutProblem, deployEnv, deploySteps, placeholders, productionUrl } from "../src/lib/deploy.ts";

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
  assert.equal(publish, lines.length - 1);
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
});
