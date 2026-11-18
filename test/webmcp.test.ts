// Tests for the WebMCP registry and the editor's tools: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import * as kannadi from "../src/editor/kannadi.ts";
import { editorTools, MAX_TEXT } from "../src/editor/tools.ts";
import { initSync } from "../src/editor/wasm/kannadi_wasm.js";
import { registerWhenIdle, resolveModelContext } from "../src/lib/model-context.ts";

initSync({ module: readFileSync(new URL("../src/editor/wasm/kannadi_wasm_bg.wasm", import.meta.url)) });

const registry = () => {
  const tools = [];
  return { tools, registerTool: (tool, options) => tools.push({ tool, options }) };
};
const quietly = async (run) => {
  const warn = console.warn;
  const warned = [];
  console.warn = (...a) => warned.push(a);
  try {
    await run();
    await new Promise((r) => setTimeout(r, 0));
  } finally {
    console.warn = warn;
  }
  return warned;
};

test("the registry is chosen by a callable registerTool, document first", () => {
  const doc = registry();
  const nav = registry();
  assert.equal(resolveModelContext({ modelContext: doc }, { modelContext: nav }), doc);
  assert.equal(resolveModelContext({ modelContext: { registerTool: "stub" } }, { modelContext: nav }), nav);
  assert.equal(resolveModelContext({ modelContext: {} }, { modelContext: nav }), nav);
  assert.equal(resolveModelContext({}, {}), null);
  assert.equal(resolveModelContext(undefined, undefined), null);
});

test("tools register when idle, and a tool refused by a throw or a rejection does not stop the rest", async () => {
  const ctx = registry();
  let run;
  const tools = [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }];
  const refusing = {
    registerTool: (tool, options) => {
      if (tool.name === "b") throw new TypeError("bad dictionary");
      if (tool.name === "c") return Promise.reject(new DOMException("denied", "NotAllowedError"));
      return ctx.registerTool(tool, options);
    },
  };
  let controller;
  const warned = await quietly(() => {
    controller = registerWhenIdle(refusing, tools, (fn) => (run = fn));
    assert.equal(ctx.tools.length, 0);
    run();
  });
  assert.deepEqual(ctx.tools.map((t) => t.tool.name), ["a", "d"]);
  assert.equal(ctx.tools[0].options.signal, controller.signal);
  assert.deepEqual(warned.map((w) => w[0]), ["WebMCP: b was not registered", "WebMCP: c was not registered"]);
  const late = registry();
  let later;
  registerWhenIdle(late, tools, (fn) => (later = fn)).abort();
  later();
  assert.equal(late.tools.length, 0);
});

const tools = Object.fromEntries(editorTools(kannadi).map((t) => [t.name, t]));

test("the 4 editor tools are read-only and describe their input", () => {
  assert.deepEqual(Object.keys(tools), ["convert_legacy_to_unicode", "convert_unicode_to_legacy", "transliterate", "count_aksharas"]);
  for (const t of Object.values(tools)) {
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.inputSchema.type, "object");
    assert.ok(t.inputSchema.required.includes("text"));
    assert.ok(t.description.length > 60);
  }
});

test("legacy conversion returns output offsets of unknown glyphs and the converter's malformed ranges", async () => {
  // ñ has no glyph in the Nudi layout and stays as it was, at offset 15 of the output.
  assert.deepEqual(await tools.convert_legacy_to_unicode.execute({ text: "PÀ£ÀßqÀ ¤ÃqÀÄªÀÅzÀÄ ñ" }), {
    text: "ಕನ್ನಡ ನೀಡುವುದು ñ",
    layout: "nudi",
    unknown_glyph_offsets: [15],
    malformed_syllables: [],
  });
  // A bare subscript glyph converts to a sign with no letter; the converter reports it.
  const bare = await tools.convert_legacy_to_unicode.execute({ text: "PÀx", layout: "nudi" });
  assert.equal(bare.text, "ಕಥ");
  assert.deepEqual(bare.malformed_syllables, [[1, 2]]);
});

test("Unicode to Nudi returns the typed bytes and input offsets of what it cannot encode", async () => {
  assert.deepEqual(await tools.convert_unicode_to_legacy.execute({ text: "ಸರ್ಕಾರಿ" }), {
    text: "¸ÀPÁðj",
    unencodable_offsets: [],
    malformed_syllables: [],
  });
  const mixed = await tools.convert_unicode_to_legacy.execute({ text: "ಕ ೝ" });
  assert.deepEqual(mixed.unencodable_offsets, [2]);
});

test("transliteration and counts run the library", async () => {
  assert.deepEqual(await tools.transliterate.execute({ text: "namaskAra", from: "baraha", to: "kannada" }), { text: "ನಮಸ್ಕಾರ" });
  assert.deepEqual(await tools.count_aksharas.execute({ text: "ಕನ್ನಡ ನಾಡು" }), { aksharas: 5, words: 2, characters: 10 });
});

test("options default as the editor does, and bad input comes back as an error the agent can read", async () => {
  let seen;
  const spy = editorTools({ ...kannadi, convertLegacy: (text, o) => ((seen = o), kannadi.convertLegacy(text, o)) });
  await spy[0].execute({ text: "x" });
  assert.deepEqual(seen, { layout: "auto", kannadaDigits: false, zeroAsAnusvara: true });
  await spy[0].execute({ text: "x", layout: "akruti", kannada_digits: true, zero_as_anusvara: false });
  assert.deepEqual(seen, { layout: "akruti", kannadaDigits: true, zeroAsAnusvara: false });
  assert.deepEqual(await tools.convert_legacy_to_unicode.execute({ text: "x", layout: "baraha" }), { error: "layout must be one of auto, nudi, akruti" });
  assert.deepEqual(await tools.convert_legacy_to_unicode.execute({ text: "x", kannada_digits: "yes" }), { error: "kannada_digits must be true or false" });
  assert.deepEqual(await tools.count_aksharas.execute({}), { error: "text must be a string" });
  assert.deepEqual(await tools.count_aksharas.execute({ text: "x".repeat(MAX_TEXT + 1) }), { error: `text is longer than ${MAX_TEXT} characters` });
  assert.deepEqual(await tools.transliterate.execute({ text: "x", from: "latin", to: "kannada" }), { error: "from must be one of kannada, baraha, iso15919, iast" });
});

test("Unicode Kannada needs no conversion, and converts to itself with nothing to check", () => {
  for (const text of ["ಕನ್ನಡ ನಾಡು", "ನಮಸ್ಕಾರ, ಕನ್ನಡ ನಾಡು ನುಡಿ.\nOffice hours 10 to 5, 30°C"]) {
    assert.equal(kannadi.isUnicode(text), true, text);
  }
  // Convert checks isUnicode first; converting anyway keeps Kannada and reports nothing in it.
  const result = kannadi.convertLegacy("ಕನ್ನಡ ನಾಡು");
  assert.equal(result.text, "ಕನ್ನಡ ನಾಡು");
  assert.deepEqual(result.unknown, []);
  assert.equal(kannadi.isUnicode("PÀ£ÀßqÀ"), false);
  assert.equal(kannadi.isUnicode("ಕ PÀ£ÀßqÀ", "nudi"), false);
});
