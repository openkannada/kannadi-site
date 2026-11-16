// Thin wrapper over the WebAssembly bindings: plain values in and out, and
// every wasm object freed before returning.
import init, * as wasm from "./wasm/kannadi_wasm.js";
import type { Converted, Layout } from "./text.ts";

export { init };

export interface ConvertOptions {
  kannadaDigits?: boolean;
  zeroAsAnusvara?: boolean;
  layout?: Layout | "auto";
}

/** A legacy conversion with the converter's own report of malformed output ranges. */
export interface LegacyConversion extends Converted {
  malformed: number[];
}

export interface Encoded {
  text: string;
  unencodable: number[];
  malformed: number[];
}

export interface Fix {
  start: number;
  end: number;
  replacement: string;
  kind: string;
}

export type Scheme = "kannada" | "baraha" | "iso15919" | "iast";

/** The layout the text reads best in, with the fewest problems. */
export function bestLayout(text: string): Layout {
  return wasm.bestLayout(text) as Layout;
}

/**
 * Converts legacy font text in `layout`, or in the layout it reads best in.
 * Unknown glyph offsets are UTF-16 code units in the output.
 */
export function convertLegacy(text: string, { kannadaDigits = false, zeroAsAnusvara = true, layout = "auto" }: ConvertOptions = {}): LegacyConversion {
  const used = layout === "auto" ? bestLayout(text) : layout;
  const options = new wasm.NudiOptions();
  options.kannadaDigits = kannadaDigits;
  options.zeroAsAnusvara = zeroAsAnusvara;
  let result: wasm.Conversion;
  try {
    result = wasm.toUnicode(text, used, options);
  } finally {
    options.free();
  }
  const out = { text: result.text, unknown: Array.from(result.unknownInText), malformed: Array.from(result.malformed), layout: used };
  result.free();
  return out;
}

/** Unicode Kannada as Nudi and Baraha glyph codes. Report offsets are UTF-16 code units in the input. */
export function toNudi(text: string): Encoded {
  const result = wasm.unicodeToNudi(text);
  const out = { text: result.text, unencodable: Array.from(result.unencodable), malformed: Array.from(result.malformed) };
  result.free();
  return out;
}

/** Flat [start, end, ...] ranges of aksharas that are not well formed. */
export function malformed(text: string): Uint32Array {
  return wasm.malformed(text);
}

/** Checked repairs for the malformed akshara at start..end. */
export function fixes(text: string, start: number, end: number): Fix[] {
  return wasm.fixes(text, start, end).map((f) => {
    const fix = { start: f.start, end: f.end, replacement: f.replacement, kind: f.kind };
    f.free();
    return fix;
  });
}

export function transliterate(text: string, from: Scheme, to: Scheme): string {
  return wasm.transliterate(text, from, to);
}

/** The medium-level sound-alike key of a Kannada word. */
export function phoneticKey(word: string): string {
  return wasm.phoneticKey(word, "medium");
}

/** The medium-level sound-alike key of a word typed in Latin letters. */
export function latinKey(latin: string): string {
  return wasm.latinKey(latin, "medium");
}

export const normalize = wasm.normalize;
export const modernize = wasm.modernize;
export const countAksharas = wasm.countAksharas;
export const decodeWindows1252 = (bytes: Uint8Array): string => wasm.decodeWindows1252(bytes);
export const encodeWindows1252 = wasm.encodeWindows1252;
