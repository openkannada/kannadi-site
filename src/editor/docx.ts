// DOCX to text segments, and text to DOCX. Only the main document text is
// read: headers, footers, notes, images and formatting are left out.
import { escapeMarkup, legacyLayout, type Layout, type Segment } from "./text.ts";
import { readZip, writeZip } from "./zip.ts";

const SKIPPED = new Set(["mc:Fallback", "w:rPrChange", "w:pPrChange"]);
const TOKEN = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<[?!][^>]*>|([^<]+)/g;
const ATTRIBUTE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const ENTITY = /&(?:#x([0-9a-f]+)|#(\d+)|(lt|gt|amp|quot|apos));/gi;
const NAMED: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function codePoint(n: number): string {
  return n <= 0x10ffff ? String.fromCodePoint(n) : "\uFFFD";
}

function unescapeXml(text: string): string {
  return text.replace(ENTITY, (_, hex: string | undefined, dec: string | undefined, name: string) =>
    hex ? codePoint(parseInt(hex, 16)) : dec ? codePoint(Number(dec)) : NAMED[name.toLowerCase()]!,
  );
}

// XML 1.0 forbids most C0 control characters; Word rejects a file that has them.
function escapeXml(text: string): string {
  return escapeMarkup(text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, ""));
}

type Token = { text: string; name?: undefined } | { text?: undefined; close: boolean; name: string; attrs: Record<string, string>; empty: boolean };

/** Yields tags with their attributes, and character data. */
function* tokens(xml: string): Generator<Token> {
  for (const m of xml.matchAll(TOKEN)) {
    if (m[5] !== undefined) {
      yield { text: unescapeXml(m[5]) };
    } else if (m[2]) {
      const attrs: Record<string, string> = {};
      for (const a of (m[3] ?? "").matchAll(ATTRIBUTE)) attrs[a[1]!] = unescapeXml(a[2] ?? a[3] ?? "");
      yield { close: m[1] === "/", name: m[2], attrs, empty: m[4] === "/" };
    }
  }
}

function fontOf(attrs: Record<string, string>): string | null {
  return attrs["w:ascii"] || attrs["w:hAnsi"] || null;
}

/** The layout of a legacy font in the Latin slots, or false. */
function legacyRunFont(attrs: Record<string, string>): Layout | false {
  return legacyLayout(attrs["w:ascii"]) ?? legacyLayout(attrs["w:hAnsi"]) ?? false;
}

/** Style id to {font, basedOn}, plus the document default font under "". */
interface Style {
  font: string | null;
  legacy: Layout | false;
  basedOn: string | null;
}

function readStyles(xml: string): Map<string, Style> {
  const styles = new Map<string, Style>();
  if (!xml) return styles;
  let current: Style | null = null;
  let inDefaults = false;
  for (const t of tokens(xml)) {
    if (t.text !== undefined) continue;
    if (t.name === "w:style" && !t.close) {
      current = { font: null, legacy: false, basedOn: null };
      styles.set(t.attrs["w:styleId"] ?? "", current);
    } else if (t.name === "w:style" && t.close) {
      current = null;
    } else if (t.name === "w:docDefaults") {
      inDefaults = !t.close;
      if (inDefaults) styles.set("", (current = { font: null, legacy: false, basedOn: null }));
      else current = null;
    } else if (t.name === "w:basedOn" && current) {
      current.basedOn = t.attrs["w:val"] ?? null;
    } else if (t.name === "w:rFonts" && current && !t.close) {
      current.font = fontOf(t.attrs);
      current.legacy = legacyRunFont(t.attrs);
    }
  }
  return styles;
}

/** The layout if the style, or a style it is based on, uses a legacy font, false if another font; null if none sets a font. */
function styleLegacy(styles: Map<string, Style>, id: string | null): Layout | false | null {
  for (let seen = 0; id && seen < 20; seen++) {
    const style = styles.get(id);
    if (!style) return null;
    if (style.font) return style.legacy;
    id = style.basedOn;
  }
  return null;
}

/** Reads the paragraphs of a DOCX file as segments, each marked with the layout of its run's legacy font, or false. */
export async function readDocx(bytes: Uint8Array): Promise<Segment[]> {
  const entries = await readZip(bytes, ["word/document.xml", "word/styles.xml"]);
  const documentXml = entries.get("word/document.xml");
  if (!documentXml) throw new Error("This file has no Word document inside.");
  const decoder = new TextDecoder();
  const stylesXml = entries.get("word/styles.xml");
  const styles = readStyles(stylesXml ? decoder.decode(stylesXml) : "");
  const defaultLegacy = styles.get("")?.legacy ?? false;

  interface Run {
    style: string | null;
    legacy: Layout | false | null;
  }
  const segments: Segment[] = [];
  let paragraphStyle: string | null = null;
  let run: Run | null = null;
  let inText = false;
  let inParagraphProps = false;
  let paragraphs = 0;
  // Text boxes nest paragraphs inside a run; the outer state comes back after them.
  const outer: { paragraphStyle: string | null; run: Run | null }[] = [];
  // Markup inside these elements is a copy or a past state, not the document.
  let skipDepth = 0;
  const push = (text: string, legacy: Layout | false) => segments.push({ text, legacy });
  const runLegacy = (r: Run) =>
    r.legacy ?? styleLegacy(styles, r.style) ?? styleLegacy(styles, paragraphStyle) ?? defaultLegacy;

  for (const t of tokens(decoder.decode(documentXml))) {
    if (t.text === undefined && SKIPPED.has(t.name) && !t.empty) {
      skipDepth += t.close ? -1 : 1;
      continue;
    }
    if (skipDepth > 0) continue;
    if (t.text !== undefined) {
      if (inText && run) push(t.text, runLegacy(run));
      continue;
    }
    switch (t.name) {
      case "w:p":
        if (t.close) {
          const back = outer.pop();
          if (back) {
            ({ paragraphStyle, run } = back);
            push("\n", false);
          }
        } else {
          if (paragraphs++ > 0) push("\n", false);
          if (run) outer.push({ paragraphStyle, run });
          paragraphStyle = null;
          const back = t.empty ? outer.pop() : undefined;
          if (back) ({ paragraphStyle, run } = back);
          else run = null;
        }
        break;
      case "w:pPr":
        inParagraphProps = !t.close && !t.empty;
        break;
      case "w:pStyle":
        if (inParagraphProps) paragraphStyle = t.attrs["w:val"] ?? null;
        break;
      case "w:r":
        run = t.close || t.empty ? null : { style: null, legacy: null };
        break;
      case "w:rStyle":
        if (run) run.style = t.attrs["w:val"] ?? null;
        break;
      case "w:rFonts":
        if (run && !inParagraphProps && fontOf(t.attrs)) run.legacy = legacyRunFont(t.attrs);
        break;
      case "w:t":
        inText = !t.close && !t.empty;
        break;
      case "w:tab":
        if (run && !t.close) push("\t", false);
        break;
      case "w:br":
      case "w:cr":
        if (run && !t.close) push("\n", false);
        break;
    }
  }
  return segments;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

const PACKAGE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

// Nirmala UI ships with Windows and covers Kannada; Word treats Kannada as a
// complex script, so the cs font and size apply to it.
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Nirmala UI" w:hAnsi="Nirmala UI" w:cs="Nirmala UI" w:eastAsia="Nirmala UI"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-IN" w:bidi="kn-IN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

function paragraphXml(line: string): string {
  const runs = line
    .split("\t")
    .map((part, i) => (i > 0 ? "<w:tab/>" : "") + (part ? `<w:t xml:space="preserve">${escapeXml(part)}</w:t>` : ""))
    .join("");
  return `<w:p>${runs ? `<w:r>${runs}</w:r>` : ""}</w:p>`;
}

/** A DOCX file with 1 paragraph per line of `text`. */
export function writeDocx(text: string): Promise<Uint8Array> {
  const body = text.split("\n").map(paragraphXml).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return writeZip([
    ["[Content_Types].xml", CONTENT_TYPES],
    ["_rels/.rels", PACKAGE_RELS],
    ["word/document.xml", documentXml],
    ["word/_rels/document.xml.rels", DOCUMENT_RELS],
    ["word/styles.xml", STYLES],
  ]);
}
