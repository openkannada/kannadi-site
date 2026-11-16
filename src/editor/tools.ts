// The editor's WebMCP tools: the converter, transliterator and counter, run
// on the page's own WebAssembly. Each returns JSON text.
import type { ModelContextTool } from "../lib/model-context.ts";
import type { ConvertOptions, Encoded, Scheme } from "./kannadi.ts";
import { type Converted, countWords } from "./text.ts";

export interface ToolKannadi {
  convertLegacy: (text: string, options: ConvertOptions) => Converted;
  toNudi: (text: string) => Encoded;
  transliterate: (text: string, from: Scheme, to: Scheme) => string;
  countAksharas: (text: string) => number;
  malformed: (text: string) => ArrayLike<number>;
}

/** Larger inputs belong in a file opened in the editor, not in a tool call. */
export const MAX_TEXT = 200_000;
const SCHEMES: Scheme[] = ["kannada", "baraha", "iso15919", "iast"];

const text = { type: "string", description: "The text.", maxLength: MAX_TEXT };

function textOf(input: Record<string, unknown>): string {
  const value = input.text;
  if (typeof value !== "string") throw new TypeError("text must be a string");
  if (value.length > MAX_TEXT) throw new RangeError(`text is longer than ${MAX_TEXT} characters`);
  return value;
}

function pairs(flat: ArrayLike<number>): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i]!, flat[i + 1]!]);
  return out;
}

const json = (value: unknown) => JSON.stringify(value);

export function editorTools(k: ToolKannadi): ModelContextTool[] {
  return [
    {
      name: "convert_legacy_to_unicode",
      description:
        "Convert Kannada typed in the legacy Nudi, Baraha (BRH) or Akruti fonts, which looks like Latin symbols such as PÀ£ÀßqÀ, into Unicode Kannada such as ಕನ್ನಡ. Returns the Unicode text, the layout used, and the UTF-16 offsets in the output of glyphs that had no Kannada letter.",
      inputSchema: {
        type: "object",
        properties: {
          text,
          layout: { type: "string", enum: ["auto", "nudi", "akruti"], default: "auto", description: "The font layout; auto picks the one the text reads best in." },
          kannada_digits: { type: "boolean", default: false, description: "Write digits as Kannada digits, as the Nudi fonts whose names end in k draw them." },
          zero_as_anusvara: { type: "boolean", default: true, description: "Read a 0 inside a word as the anusvara ಂ, a common typing habit." },
        },
        required: ["text"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        const layout = input.layout === "nudi" || input.layout === "akruti" ? input.layout : "auto";
        const result = k.convertLegacy(textOf(input), {
          layout,
          kannadaDigits: input.kannada_digits === true,
          zeroAsAnusvara: input.zero_as_anusvara !== false,
        });
        return json({ text: result.text, layout: result.layout, unknown_glyph_offsets: result.unknown, malformed_syllables: pairs(k.malformed(result.text)) });
      },
    },
    {
      name: "convert_unicode_to_legacy",
      description:
        "Convert Unicode Kannada into Nudi and Baraha ANSI glyph codes, for documents that must be set in a Nudi font such as Nudi 01 e or a Baraha font such as BRH Kannada. Returns the encoded text and the UTF-16 offsets in the input of characters it could not encode.",
      inputSchema: { type: "object", properties: { text }, required: ["text"], additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute(input) {
        const result = k.toNudi(textOf(input));
        return json({ text: result.text, unencodable_offsets: result.unencodable, malformed_syllables: pairs(result.malformed) });
      },
    },
    {
      name: "transliterate",
      description:
        "Transliterate between Kannada script and Latin spellings: Baraha phonetic letters (kannaDa), ISO 15919 (kannaḍa) or IAST. For example, from baraha to kannada turns namaskAra into ನಮಸ್ಕಾರ. It changes the script, not the language.",
      inputSchema: {
        type: "object",
        properties: {
          text,
          from: { type: "string", enum: SCHEMES, description: "The script or scheme of the input." },
          to: { type: "string", enum: SCHEMES, description: "The script or scheme to write." },
        },
        required: ["text", "from", "to"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        const scheme = (value: unknown, field: string) => {
          if (!SCHEMES.includes(value as Scheme)) throw new TypeError(`${field} must be one of ${SCHEMES.join(", ")}`);
          return value as Scheme;
        };
        return json({ text: k.transliterate(textOf(input), scheme(input.from, "from"), scheme(input.to, "to")) });
      },
    },
    {
      name: "count_aksharas",
      description:
        "Count the aksharas (written syllables, such as ಕ್ಷ or ಕ್ಕಿ) in Kannada text, with its words and characters. Akshara counts are how Kannada text length is usually measured.",
      inputSchema: { type: "object", properties: { text }, required: ["text"], additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute(input) {
        const value = textOf(input);
        return json({ aksharas: k.countAksharas(value), words: countWords(value), characters: value.length });
      },
    },
  ];
}
