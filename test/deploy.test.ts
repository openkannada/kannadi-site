// Tests for the deploy plan: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { deploySteps, productionUrl } from "../src/lib/deploy.ts";

test("the production URL needs a real https host", () => {
  assert.equal(productionUrl("https://openkannada.org").href, "https://openkannada.org/");
  assert.equal(productionUrl("https://openkannada.org/kannada").href, "https://openkannada.org/kannada/");
  assert.throws(() => productionUrl(undefined), /Set SITE_URL/);
  assert.throws(() => productionUrl(""), /Set SITE_URL/);
  assert.throws(() => productionUrl("http://openkannada.org/"), /https/);
  assert.throws(() => productionUrl("https://example.org/kannada/"), /placeholder/);
  assert.throws(() => productionUrl("https://localhost/"), /placeholder/);
});

test("the deploy checks the build at the production URL before it publishes", () => {
  const steps = deploySteps(new URL("https://openkannada.org/"));
  const lines = steps.map((s) => [s.command, ...s.args].join(" "));
  assert.equal(lines[0], "npm run wasm");
  assert.ok(lines.includes("node scripts/seo-smoke.ts dist https://openkannada.org/"));
  assert.equal(lines.at(-1), "npx wrangler pages deploy --branch main");
  assert.ok(lines.indexOf("npm run build") < lines.indexOf("node scripts/seo-smoke.ts dist https://openkannada.org/"));
});
