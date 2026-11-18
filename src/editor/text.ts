// Pure text helpers shared by the editor and the importers. No DOM access.
import { count as countOf, S } from "./strings.ts";

/** A legacy font layout, or "auto" for legacy text in an unknown font. */
export type Layout = "nudi" | "akruti";
export type TypingMode = "kannada" | "english" | "baraha" | "iso15919";
export type SegmentFont = false | Layout | "auto";

export interface Segment {
  text: string;
  legacy: SegmentFont;
}

/** start..oldEnd of the text before was replaced by start..newEnd of the text after. */
export interface Edit {
  start: number;
  oldEnd: number;
  newEnd: number;
}

export interface Anchor {
  offset: number;
  glyph: string;
}

export interface Converted {
  text: string;
  unknown: number[];
  layout: Layout;
}

export interface Joined {
  text: string;
  unknown: number[];
  converted: number;
  layouts: Layout[];
}

// Windows-1252 characters above ASCII, where Nudi and Baraha fonts draw glyphs.
const LEGACY_CHAR = /[¡-ÿŒœŠšŸŽžƒˆ˜–—‘-„†-•…‰‹›€™]/gu;
const KANNADA_CHAR = /[ಀ-೿]/gu;
const NON_SPACE = /\S/gu;
// Legacy font families and their layouts. Nudi's Unicode fonts carry "Uni" in their names.
const LEGACY_FONTS: [RegExp, Layout][] = [
  [/^(?!.*uni)\s*['"]?(nudi|brh\b|baraha)/i, "nudi"],
  [/^\s*['"]?akruti\s*knd\s*padma/i, "akruti"],
];

const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

/**
 * True when text reads like Nudi or Baraha glyph codes. In real Nudi lines at
 * least 59% of the non-space characters are Latin-1 symbols such as À and Ä
 * (10th percentile, 2002 RDPR pages); accented European text stays near 33%.
 */
export function looksLegacy(text: string): boolean {
  const legacy = count(text, LEGACY_CHAR);
  if (legacy < 2) return false;
  if (count(text, KANNADA_CHAR) >= legacy) return false;
  return legacy / count(text, NON_SPACE) >= 0.4;
}

/** The layout of the first legacy family in a font-family list, or null. */
export function legacyLayout(family: unknown): Layout | null {
  if (typeof family !== "string") return null;
  for (const f of family.split(",")) {
    const found = LEGACY_FONTS.find(([pattern]) => pattern.test(f.trim()));
    if (found) return found[1];
  }
  return null;
}

export function isLegacyFont(family: unknown): boolean {
  return legacyLayout(family) !== null;
}

/**
 * Decodes a text file: UTF-16 with a byte order mark, UTF-8 when valid, and
 * Windows-1252 otherwise, the encoding of legacy Kannada files.
 */
export function decodeBytes(bytes: Uint8Array, decodeWindows1252: (bytes: Uint8Array) => string): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return decodeWindows1252(bytes);
  }
}

/**
 * Replaces "auto" in every segment with 1 layout, chosen over all their text
 * together, so a document is not read in 2 layouts by chance.
 */
export function resolveAuto(segments: Segment[], bestLayout: (text: string) => Layout): Segment[] {
  const auto = segments.filter((s) => s.legacy === "auto");
  if (!auto.length) return segments;
  const layout = bestLayout(auto.map((s) => s.text).join("\n"));
  return segments.map((s) => (s.legacy === "auto" ? { ...s, legacy: layout } : s));
}

/**
 * Joins text segments, converting the legacy ones. Adjacent segments of the
 * same kind are merged first, so a syllable split across Word runs converts whole.
 */
export function joinSegments(segments: Segment[], convert: (text: string, layout: Layout | "auto") => Converted): Joined {
  const merged: Segment[] = [];
  for (const s of segments) {
    if (!s.text) continue;
    const last = merged[merged.length - 1];
    if (last && last.legacy === s.legacy) last.text += s.text;
    else merged.push({ ...s });
  }
  let text = "";
  const unknown: number[] = [];
  let converted = 0;
  const layouts = new Set<Layout>();
  for (const s of merged) {
    if (s.legacy) {
      const result = convert(s.text, s.legacy);
      layouts.add(result.layout);
      for (const offset of result.unknown) unknown.push(text.length + offset);
      text += result.text;
      converted += s.text.length;
    } else {
      text += s.text;
    }
  }
  return { text, unknown, converted, layouts: [...layouts] };
}

const CHUNK = 4096;

/** Length of the common prefix, compared in native chunks so a 1 MB text costs microseconds. */
function commonPrefix(a: string, b: string, limit: number): number {
  let i = 0;
  while (i + CHUNK <= limit && a.substring(i, i + CHUNK) === b.substring(i, i + CHUNK)) i += CHUNK;
  while (i < limit && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
}

function commonSuffix(a: string, b: string, limit: number): number {
  let i = 0;
  while (
    i + CHUNK <= limit &&
    a.substring(a.length - i - CHUNK, a.length - i) === b.substring(b.length - i - CHUNK, b.length - i)
  )
    i += CHUNK;
  while (i < limit && a.charCodeAt(a.length - 1 - i) === b.charCodeAt(b.length - 1 - i)) i++;
  return i;
}

/**
 * The single edit that turns `before` into `after`. An insertion or deletion
 * inside a run of equal letters fits several places; when `caret` (the
 * collapsed caret after the edit) is given and fits, the edit is put there.
 */
export function diff(rawBefore: string, rawAfter: string, caret = -1): Edit {
  // Browsers swap a space for a no-break space at the end of a line and back; that is not an edit.
  const before = rawBefore.replace(/\u00a0/g, " ");
  const after = rawAfter.replace(/\u00a0/g, " ");
  const start = commonPrefix(before, after, Math.min(before.length, after.length));
  const tail = commonSuffix(before, after, Math.min(before.length, after.length) - start);
  const edit = { start, oldEnd: before.length - tail, newEnd: after.length - tail };
  const inserted = edit.newEnd - edit.start;
  const removed = edit.oldEnd - edit.start;
  if (caret < 0 || (inserted && removed) || caret === edit.newEnd) return edit;
  if (removed === 0) {
    const at = caret - inserted;
    if (at >= 0 && before.slice(0, at) === after.slice(0, at) && before.slice(at) === after.slice(caret)) {
      return { start: at, oldEnd: at, newEnd: caret };
    }
  } else if (inserted === 0) {
    if (before.slice(0, caret) === after.slice(0, caret) && before.slice(caret + removed) === after.slice(caret)) {
      return { start: caret, oldEnd: caret + removed, newEnd: caret };
    }
  }
  return edit;
}

/** Moves anchored glyphs through an edit, dropping those inside it or whose glyph moved away. */
export function shiftAnchors(anchors: Anchor[], edit: Edit, after: string): Anchor[] {
  const delta = edit.newEnd - edit.oldEnd;
  const out: Anchor[] = [];
  for (const a of anchors) {
    let offset = a.offset;
    if (offset >= edit.oldEnd) offset += delta;
    else if (offset + a.glyph.length > edit.start) continue;
    if (after.startsWith(a.glyph, offset)) out.push({ offset, glyph: a.glyph });
  }
  return out;
}

/** Moves flat [start, end, ...] ranges through an edit, dropping those it touches. */
export function shiftRanges(ranges: ArrayLike<number>, edit: Edit): number[] {
  const delta = edit.newEnd - edit.oldEnd;
  const out: number[] = [];
  for (let i = 0; i + 1 < ranges.length; i += 2) {
    const start = ranges[i]!;
    const end = ranges[i + 1]!;
    if (end < edit.start) out.push(start, end);
    else if (start > edit.oldEnd) out.push(start + delta, end + delta);
  }
  return out;
}

const MARKUP: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" };

/** Escapes text for HTML or XML content and attribute values. */
export function escapeMarkup(text: string): string {
  return text.replace(/[<>&"]/g, (c) => MARKUP[c]!);
}

/**
 * What a Unicode to Nudi conversion could not write, in 1 or 2 sentences.
 * `questionMarks` counts characters a Nudi text file had to write as "?".
 */
export function nudiNotes(unencodable: number, malformed: number, questionMarks = 0): string {
  const kept = unencodable - questionMarks;
  return [
    kept ? countOf(kept, S.nudi.unencodable) : "",
    questionMarks ? countOf(questionMarks, S.nudi.questionMarks) : "",
    malformed ? countOf(malformed, S.nudi.malformed) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Words separated by white space. */
export function countWords(text: string): number {
  return count(text, /\S+/gu);
}

/** "U+0CCD U+0C95" for a short string. */
export function codePoints(text: string): string {
  return Array.from(text, (c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")).join(" ");
}
