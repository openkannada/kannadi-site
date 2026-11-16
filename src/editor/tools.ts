// The editor's WebMCP tools on the page's WebAssembly; bad input returns { error } so the agent can correct it.
import type { ModelContextTool } from "../lib/model-context.ts";
import type { ConvertOptions, Encoded, LegacyConversion, Scheme } from "./kannadi.ts";
import { countWords } from "./text.ts";

export interface ToolKannadi {
  convertLegacy: (text: string, options: ConvertOptions) => LegacyConversion;
  toNudi: (text: string) => Encoded;
  transliterate: (text: string, from: Scheme, to: Scheme) => string;
  countAksharas: (text: string) => number;
  malformed: (text: string) => ArrayLike<number>;
}

/** Larger inputs go through a file opened in the editor. */
export const MAX_TEXT = 200_000;
const SCHEMES: Scheme[] = ["kannada", "baraha", "iso15919", "iast"];
const LAYOUTS = ["auto", "nudi", "akruti"] as const;

const text = { type: "string", description: "The text.", maxLength: MAX_TEXT };

/** An input the tool cannot use; its message goes back to the agent. */
class InputError extends Error {}

function textOf(input: Record<string, unknown>): string {
  const value = input.text;
  if (typeof value !== "string") throw new InputError("text must be a string");
  if (value.length > MAX_TEXT) throw new InputError(`text is longer than ${MAX_TEXT} characters`);
  return value;
}

function oneOf<T extends string>(input: Record<string, unknown>, field: string, allowed: readonly T[], fallback?: T): T {
  const value = input[field] ?? fallback;
  if (!allowed.includes(value as T)) throw new InputError(`${field} must be one of ${allowed.join(", ")}`);
  return value as T;
}

function flag(input: Record<string, unknown>, field: string, fallback: boolean): boolean {
  const value = input[field] ?? fallback;
  if (typeof value !== "boolean") throw new InputError(`${field} must be true or false`);
  return value;
}

function pairs(flat: ArrayLike<number>): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i]!, flat[i + 1]!]);
  return out;
}

/** The union of 2 sorted lists of [start, end] ranges, without repeats. */
function union(a: [number, number][], b: [number, number][]): [number, number][] {
  const seen = new Set<string>();
  return [...a, ...b]
    .sort((x, y) => x[0] - y[0] || x[1] - y[1])
    .filter(([s, e]) => !seen.has(`${s}:${e}`) && seen.add(`${s}:${e}`));
}

function guarded(run: (input: Record<string, unknown>) => unknown): ModelContextTool["execute"] {
  return (input) => {
    try {
      return run(input ?? {});
    } catch (e) {
      if (e instanceof InputError) return { error: e.message };
      throw e;
    }
  };
}

export function editorTools(k: ToolKannadi): ModelContextTool[] {
  return [
    {
      name: "convert_legacy_to_unicode",
      description:
        "Convert Kannada typed in the legacy Nudi, Baraha (BRH) or Akruti fonts, which looks like Latin symbols such as PÀ£ÀßqÀ, into Unicode Kannada such as ಕನ್ನಡ. Returns the Unicode text, the layout used, the UTF-16 offsets in the output of glyphs that had no Kannada letter, and the output ranges that are not valid syllables.",
      inputSchema: {
        type: "object",
        properties: {
          text,
          layout: {
            type: "string",
            enum: [...LAYOUTS],
            default: "auto",
            description: "The font layout. nudi covers Nudi and Baraha (BRH) fonts; auto picks the layout the text reads best in.",
          },
          kannada_digits: { type: "boolean", default: false, description: "Write digits as Kannada digits, as the Nudi fonts whose names end in k draw them." },
          zero_as_anusvara: { type: "boolean", default: true, description: "Read a 0 inside a word as the anusvara ಂ, a common typing habit." },
        },
        required: ["text"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: guarded((input) => {
        const result = k.convertLegacy(textOf(input), {
          layout: oneOf(input, "layout", LAYOUTS, "auto"),
          kannadaDigits: flag(input, "kannada_digits", false),
          zeroAsAnusvara: flag(input, "zero_as_anusvara", true),
        });
        return {
          text: result.text,
          layout: result.layout,
          unknown_glyph_offsets: result.unknown,
          malformed_syllables: union(pairs(result.malformed), pairs(k.malformed(result.text))),
        };
      }),
    },
    {
      name: "convert_unicode_to_legacy",
      description:
        "Convert Unicode Kannada into Nudi and Baraha ANSI glyph codes, for documents that must be set in a Nudi font such as Nudi 01 e or a Baraha font such as BRH Kannada. Returns the encoded text, the UTF-16 offsets in the input of characters it could not encode, and the input ranges that are not valid syllables.",
      inputSchema: { type: "object", properties: { text }, required: ["text"], additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: guarded((input) => {
        const result = k.toNudi(textOf(input));
        return { text: result.text, unencodable_offsets: result.unencodable, malformed_syllables: pairs(result.malformed) };
      }),
    },
    {
      name: "transliterate",
      description:
        "Transliterate between Kannada script and Latin spellings: Baraha phonetic letters (kannaDa), ISO 15919 (kannaḍa) or IAST. For example, from baraha to kannada turns namaskAra into ನಮಸ್ಕಾರ. The words stay the same and only the script changes.",
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
      execute: guarded((input) => ({
        text: k.transliterate(textOf(input), oneOf(input, "from", SCHEMES), oneOf(input, "to", SCHEMES)),
      })),
    },
    {
      name: "count_aksharas",
      description:
        "Count the aksharas (written syllables, such as ಕ್ಷ or ಕ್ಕಿ) in Kannada text, with its words and UTF-16 code units. Akshara counts are how Kannada text length is usually measured.",
      inputSchema: { type: "object", properties: { text }, required: ["text"], additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: guarded((input) => {
        const value = textOf(input);
        return { aksharas: k.countAksharas(value), words: countWords(value), characters: value.length };
      }),
    },
  ];
}
