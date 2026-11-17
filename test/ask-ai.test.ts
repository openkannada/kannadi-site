import assert from "node:assert/strict";
import { test } from "node:test";

import { ASK_AI } from "../src/content/site.ts";
import { askLinks } from "../src/lib/ask-ai.ts";

test("each assistant opens with a prompt to read the page's markdown", () => {
  const links = askLinks("https://openkannada.org/about/index.md", ASK_AI.prompt);
  assert.deepEqual(links.map((l) => new URL(l.href).origin), ["https://chatgpt.com", "https://claude.ai", "https://www.perplexity.ai"]);
  for (const l of links) {
    assert.equal(new URL(l.href).searchParams.get("q"), "Read https://openkannada.org/about/index.md and answer my questions about it.", l.name);
  }
});
