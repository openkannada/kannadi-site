import assert from "node:assert/strict";
import { test } from "node:test";

import { fmt } from "../src/i18n/core.ts";
import { SITE_STRINGS } from "../src/i18n/site.ts";
import { askLinks } from "../src/lib/ask-ai.ts";

test("each assistant opens with a prompt to read the page's markdown", () => {
  const links = askLinks("https://openkannada.org/about/index.md", (url) => fmt(SITE_STRINGS.en.askAi.prompt, { url }));
  assert.deepEqual(links.map((l) => new URL(l.href).origin), ["https://chatgpt.com", "https://claude.ai", "https://www.perplexity.ai"]);
  for (const l of links) {
    assert.equal(new URL(l.href).searchParams.get("q"), "Read https://openkannada.org/about/index.md and answer my questions about it.", l.name);
  }
});
