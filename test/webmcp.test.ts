// Tests for the WebMCP registry and the editor's tools: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { editorTools, MAX_TEXT } from "../src/editor/tools.ts";
import { registerWhenIdle, resolveModelContext } from "../src/lib/model-context.ts";

const registry = () => {
  const tools = [];
  return { tools, registerTool: (tool, options) => tools.push({ tool, options }) };
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

test("tools register when idle, and a refused tool does not stop the rest", () => {
  const ctx = registry();
  let run;
  const tools = [{ name: "a" }, { name: "b" }, { name: "c" }];
  const refuse = { ...ctx, registerTool: (tool, options) => (tool.name === "b" ? (() => { throw new Error("no"); })() : ctx.registerTool(tool, options)) };
  const warn = console.warn;
  console.warn = () => {};
  const controller = registerWhenIdle(refuse, tools, (fn) => (run = fn));
  assert.equal(ctx.tools.length, 0);
  run();
  console.warn = warn;
  assert.deepEqual(ctx.tools.map((t) => t.tool.name), ["a", "c"]);
  assert.equal(ctx.tools[0].options.signal, controller.signal);
  const late = registry();
  let later;
  registerWhenIdle(late, tools, (fn) => (later = fn)).abort();
  later();
  assert.equal(late.tools.length, 0);
});

const fake = {
  convertLegacy: (text, options) => ({ text: `U(${text})`, unknown: [2], layout: options.layout === "auto" ? "nudi" : options.layout, options }),
  toNudi: (text) => ({ text: `N(${text})`, unencodable: [0], malformed: [1, 3] }),
  transliterate: (text, from, to) => `${from}>${to}:${text}`,
  countAksharas: (text) => text.length - 1,
  malformed: () => new Uint32Array([4, 6]),
};
const tools = Object.fromEntries(editorTools(fake).map((t) => [t.name, t]));

test("the 4 editor tools are read-only and describe their input", () => {
  assert.deepEqual(Object.keys(tools), ["convert_legacy_to_unicode", "convert_unicode_to_legacy", "transliterate", "count_aksharas"]);
  for (const t of Object.values(tools)) {
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.inputSchema.type, "object");
    assert.ok(t.inputSchema.required.includes("text"));
    assert.ok(t.description.length > 60);
  }
});

test("the tools return JSON with offsets as pairs", async () => {
  assert.deepEqual(JSON.parse(await tools.convert_legacy_to_unicode.execute({ text: "PÀ" })), {
    text: "U(PÀ)",
    layout: "nudi",
    unknown_glyph_offsets: [2],
    malformed_syllables: [[4, 6]],
  });
  assert.deepEqual(JSON.parse(await tools.convert_unicode_to_legacy.execute({ text: "ಕ" })), {
    text: "N(ಕ)",
    unencodable_offsets: [0],
    malformed_syllables: [[1, 3]],
  });
  assert.deepEqual(JSON.parse(await tools.transliterate.execute({ text: "ka", from: "baraha", to: "kannada" })), { text: "baraha>kannada:ka" });
  assert.deepEqual(JSON.parse(await tools.count_aksharas.execute({ text: "ಕನ್ನಡ ನಾಡು" })), { aksharas: 9, words: 2, characters: 10 });
});

test("tool options default as the editor does, and bad input is refused", async () => {
  let seen;
  const spy = editorTools({ ...fake, convertLegacy: (text, o) => ((seen = o), fake.convertLegacy(text, o)) });
  await spy[0].execute({ text: "x", layout: "sideways" });
  assert.deepEqual(seen, { layout: "auto", kannadaDigits: false, zeroAsAnusvara: true });
  await spy[0].execute({ text: "x", layout: "akruti", kannada_digits: true, zero_as_anusvara: false });
  assert.deepEqual(seen, { layout: "akruti", kannadaDigits: true, zeroAsAnusvara: false });
  assert.throws(() => tools.count_aksharas.execute({}), TypeError);
  assert.throws(() => tools.count_aksharas.execute({ text: "x".repeat(MAX_TEXT + 1) }), RangeError);
  assert.throws(() => tools.transliterate.execute({ text: "x", from: "latin", to: "kannada" }), TypeError);
});
