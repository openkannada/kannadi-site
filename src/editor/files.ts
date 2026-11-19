// Opening TXT, HTML and DOCX files as editor text, and saving the editor text
// as TXT, HTML or DOCX.
import { readDocx, writeDocx } from "./docx.ts";
import {
  type Converted,
  decodeBytes,
  isZip,
  notText,
  unixLines,
  escapeMarkup,
  type Joined,
  joinSegments,
  type Layout,
  legacyLayout,
  looksLegacy,
  resolveAuto,
  type Segment,
  type SegmentFont,
} from "./text.ts";

export interface Converter {
  convert: (text: string, layout: Layout | "auto") => Converted;
  bestLayout: (text: string) => Layout;
  decodeWindows1252: (bytes: Uint8Array) => string;
}

interface Font {
  layout: Layout | false;
  order: number;
}

const BLOCK = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT", "FIGCAPTION", "FIGURE", "FOOTER",
  "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION",
  "TABLE", "TR", "UL",
]);
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "TITLE", "TEXTAREA"]);
const FONT_FAMILY = /font-family\s*:\s*([^;}]+)/i;
// The page's Content-Security-Policy also applies to documents it parses, and
// would log every style attribute and element. Renamed, they stay readable:
// attributes as data-source-style, style elements as raw-text textareas.
const STYLE = "data-source-style";

function parseHtml(html: string): Document {
  const renamed = html
    .replace(/(<[a-z][^<>]*?\s)style(\s*=)/gi, `$1${STYLE}$2`)
    .replace(/<style\b[^>]*>/gi, `<textarea ${STYLE}>`)
    .replace(/<\/style\s*>/gi, "</textarea>");
  return new DOMParser().parseFromString(renamed, "text/html");
}

/**
 * The font that style rules in the page give class names and tag names: the
 * layout of a legacy font or false, and the rule's place in the page, since a
 * later rule wins. Tag rules count only for legacy fonts, so a page-wide rule
 * such as body{font-family:Arial} leaves text with no other font to be judged
 * by how it looks.
 */
function legacySelectors(doc: Document): { classes: Map<string, Font>; tags: Map<string, Font> } {
  const classes = new Map<string, Font>();
  const tags = new Map<string, Font>();
  let order = 0;
  for (const style of doc.querySelectorAll(`textarea[${STYLE}]`)) {
    const css = (style.textContent ?? "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--|-->/g, "");
    for (const [, selectors = "", body = ""] of css.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
      const family = body.match(FONT_FAMILY)?.[1];
      if (!family) continue;
      const font: Font = { layout: legacyLayout(family) ?? false, order: order++ };
      for (const selector of selectors.split(",")) {
        const [, tag, cls] = selector.trim().match(/^([a-z0-9]*)(?:\.([\w-]+))?$/i) ?? [];
        if (cls) classes.set(cls, font);
        else if (tag && font.layout) tags.set(tag.toUpperCase(), font);
      }
    }
  }
  return { classes, tags };
}

/** The layout of the legacy font an element sets, false for another font, or null for none. */
function elementFont(el: Element, selectors: ReturnType<typeof legacySelectors>): Layout | false | null {
  if (el.tagName === "FONT" && el.hasAttribute("face")) return legacyLayout(el.getAttribute("face")) ?? false;
  const family = el.getAttribute(STYLE)?.match(FONT_FAMILY)?.[1];
  if (family) return legacyLayout(family) ?? false;
  const byClass = [...el.classList]
    .map((c) => selectors.classes.get(c))
    .filter((f): f is Font => f !== undefined)
    .sort((a, b) => b.order - a.order)[0];
  return (byClass ?? selectors.tags.get(el.tagName))?.layout ?? null;
}

/** "auto" for text that looks like legacy glyph codes in an unknown font, else false. */
const byLooks = (text: string): SegmentFont => (looksLegacy(text) ? "auto" : false);

/**
 * Reads an HTML document as segments, 1 block per line, with white space
 * collapsed as a browser shows it. Text inherits the nearest font that an
 * element sets. Text with no font, or a whole page with no font information,
 * is judged by whether it looks like legacy glyph codes.
 */
export function htmlSegments(doc: Document): Segment[] {
  const selectors = legacySelectors(doc);
  const segments: { text: string; font: Layout | false | null }[] = [];
  let fontsSeen = false;
  const last = () => segments[segments.length - 1];
  const atLineStart = () => last()?.text.endsWith("\n") ?? true;
  const lineBreak = (always: boolean) => {
    const l = last();
    if (!l || (!always && atLineStart())) return;
    l.text = l.text.replace(/ +$/, "");
    segments.push({ text: "\n", font: false });
  };
  const walk = (node: Node, inherited: Layout | false | null): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = (node as Text).data.replace(/\s+/g, " ");
      if (atLineStart() || last()?.text.endsWith(" ")) text = text.replace(/^ /, "");
      if (text) segments.push({ text, font: inherited });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (SKIP.has(el.tagName)) return;
    if (el.tagName === "BR") {
      lineBreak(true);
      return;
    }
    const own = elementFont(el, selectors);
    if (own !== null) fontsSeen = true;
    const font = own ?? inherited;
    const block = BLOCK.has(el.tagName);
    if (block) lineBreak(false);
    for (const child of el.childNodes) walk(child, font);
    if (block) lineBreak(false);
  };
  walk(doc.body ?? doc.documentElement, null);
  while (last()?.text === "\n") segments.pop();
  const end = last();
  if (end) end.text = end.text.replace(/ +$/, "");

  if (!fontsSeen) {
    const lines = segments.map((s) => s.text).join("").split("\n");
    return lines.flatMap((line, i): Segment[] => [
      ...(i ? [{ text: "\n", legacy: false as const }] : []),
      { text: line, legacy: byLooks(line) },
    ]);
  }
  return segments.map(({ text, font }): Segment => ({ text, legacy: font === null ? byLooks(text) : font }));
}

/** A file that is not text the editor can open: a .doc, a PDF, or other binary. */
export class NotText extends Error {
  readonly kind: "doc" | "pdf" | "other";
  constructor(kind: "doc" | "pdf" | "other") {
    super(kind);
    this.kind = kind;
  }
}

/** Opens a TXT, HTML or DOCX file as editor text, converting its legacy font text. Throws NotText for anything else. */
export async function openFile(file: File, { convert, bestLayout, decodeWindows1252 }: Converter): Promise<Joined> {
  const join = (segments: Segment[]) => joinSegments(resolveAuto(segments, bestLayout), convert);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  // A Word file is read by its contents, so a renamed .docx opens and a renamed .doc is named for what it is.
  if (isZip(bytes) && (name.endsWith(".docx") || !name.includes(".") || /\.(doc|txt)$/.test(name))) return join(await readDocx(bytes));
  const kind = notText(bytes);
  if (kind) throw new NotText(kind);
  const text = unixLines(decodeBytes(bytes, decodeWindows1252));
  const own = ours(text) ? ownText(text) : null;
  if (own !== null) return { text: own, unknown: [], converted: 0, layouts: [] };
  if (name.endsWith(".html") || name.endsWith(".htm") || /^\s*<(!doctype|html)/i.test(text)) {
    return join(htmlSegments(parseHtml(text)));
  }
  return join([{ text, legacy: byLooks(text) }]);
}

/** Pasted clipboard data as editor text, converting its legacy font text. */
export function pasted(html: string, rawPlain: string, { convert, bestLayout }: Omit<Converter, "decodeWindows1252">): Joined {
  const join = (segments: Segment[]) => joinSegments(resolveAuto(segments, bestLayout), convert);
  const plain = unixLines(rawPlain);
  if (html) {
    const segments = htmlSegments(parseHtml(html));
    if (segments.some((s) => s.legacy)) return join(segments);
  }
  return join([{ text: plain, legacy: byLooks(plain) }]);
}

const GENERATOR = "kannadi";

/** Whether HTML was saved by this editor, which writes 1 paragraph per line. */
function ours(html: string): boolean {
  return /^\s*<!doctype html>/i.test(html) && new RegExp(`<meta name="generator" content="${GENERATOR}">`).test(html);
}

/**
 * The text of HTML this editor saved, each paragraph 1 line kept exactly; null when the body holds anything else,
 * such as an edit made in another program, so the file is read like any other page.
 */
function ownText(html: string): string | null {
  const doc = parseHtml(html);
  // The parser moves the renamed <style>, a textarea, out of <head> into the body; it and comments hold no text of ours.
  const blocks = [...doc.body.childNodes].filter((n) =>
    n.nodeType === Node.TEXT_NODE ? (n as Text).data.trim() : n.nodeType === Node.ELEMENT_NODE && !(n as Element).hasAttribute(STYLE),
  );
  const plain = (p: Element) => p.tagName === "P" && [...p.childNodes].every((n) => n.nodeType === Node.TEXT_NODE);
  if (!blocks.every((n) => n.nodeType === Node.ELEMENT_NODE && plain(n as Element))) return null;
  return blocks.map((p) => p.textContent ?? "").join("\n");
}

const HTML_TEMPLATE = (title: string, body: string) => `<!doctype html>
<html lang="kn">
<head>
<meta charset="utf-8">
<meta name="generator" content="${GENERATOR}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>body{max-width:42rem;margin:2rem auto;padding:0 1rem;font:1.125rem/1.9 "Noto Sans Kannada","Nirmala UI","Tunga",sans-serif}p{margin:0;min-height:1.9em;white-space:pre-wrap}</style>
</head>
<body>
${body}
</body>
</html>
`;

export type ExportFormat = "docx" | "html" | "txt";

/** The editor text as a Blob in the given format. */
export async function exportBlob(text: string, format: ExportFormat, title: string): Promise<Blob> {
  if (format === "docx") {
    return new Blob([(await writeDocx(text)) as Uint8Array<ArrayBuffer>], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }
  if (format === "html") {
    // 1 paragraph per line, with spaces kept, so the file reads as typed and reopens the same.
    const body = text
      .split("\n")
      .map((line) => `<p>${escapeMarkup(line)}</p>`)
      .join("\n");
    return new Blob([HTML_TEMPLATE(escapeMarkup(title), body)], { type: "text/html;charset=utf-8" });
  }
  // The byte order mark lets older Windows editors detect UTF-8.
  return new Blob(["﻿", text], { type: "text/plain;charset=utf-8" });
}
