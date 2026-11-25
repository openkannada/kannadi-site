// DOCX to text segments, and text to DOCX. Only the main document text is read, with its headings, lists, quotes,
// bold, italic, underline and links; headers, footers, notes, images and other formatting are left out.
import { S } from "./strings.ts";
import { escapeMarkup, legacyLayout, type Layout, type LineBlock, type RunFormat, type Segment } from "./text.ts";
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

/** Style id to {font, basedOn, name}, plus the document default font under "". */
interface Style {
  font: string | null;
  legacy: Layout | false;
  basedOn: string | null;
  /** Word's built-in style names stay English in every language of Word, unlike style ids. */
  name: string;
}

function readStyles(xml: string): Map<string, Style> {
  const styles = new Map<string, Style>();
  if (!xml) return styles;
  let current: Style | null = null;
  let inDefaults = false;
  for (const t of tokens(xml)) {
    if (t.text !== undefined) continue;
    if (t.name === "w:style" && !t.close) {
      current = { font: null, legacy: false, basedOn: null, name: "" };
      styles.set(t.attrs["w:styleId"] ?? "", current);
    } else if (t.name === "w:style" && t.close) {
      current = null;
    } else if (t.name === "w:docDefaults") {
      inDefaults = !t.close;
      if (inDefaults) styles.set("", (current = { font: null, legacy: false, basedOn: null, name: "" }));
      else current = null;
    } else if (t.name === "w:name" && current) {
      current.name = (t.attrs["w:val"] ?? "").toLowerCase();
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

/** The block a paragraph style makes, by its built-in name. */
function styleBlock(styles: Map<string, Style>, id: string | null): LineBlock["block"] {
  const name = (id && styles.get(id)?.name) || id?.toLowerCase() || "";
  if (name === "title" || name === "heading 1" || name === "heading1") return "h1";
  if (name === "subtitle" || name === "heading 2" || name === "heading2") return "h2";
  if (/^heading ?[3-9]$/.test(name)) return "h3";
  if (name === "quote" || name === "intense quote") return "quote";
  return "p";
}

/** numId to the formats of its levels, from word/numbering.xml; "bullet" or a numbering such as "decimal". */
function readNumbering(xml: string): Map<string, string[]> {
  const abstract = new Map<string, string[]>();
  const nums = new Map<string, string>();
  let current: string[] | null = null;
  let level = 0;
  let num: string | null = null;
  for (const t of tokens(xml)) {
    if (t.text !== undefined) continue;
    if (t.name === "w:abstractNum" && !t.close) abstract.set(t.attrs["w:abstractNumId"] ?? "", (current = []));
    else if (t.name === "w:abstractNum" && t.close) current = null;
    else if (t.name === "w:lvl" && !t.close) level = Number(t.attrs["w:ilvl"] ?? 0);
    else if (t.name === "w:numFmt" && current) current[level] = t.attrs["w:val"] ?? "decimal";
    else if (t.name === "w:num" && !t.close) num = t.attrs["w:numId"] ?? null;
    else if (t.name === "w:abstractNumId" && num) nums.set(num, t.attrs["w:val"] ?? "");
  }
  return new Map([...nums].map(([id, a]) => [id, abstract.get(a) ?? []]));
}

/** Relationship id to its target, for links. */
function readRels(xml: string): Map<string, string> {
  const rels = new Map<string, string>();
  for (const t of tokens(xml)) if (t.text === undefined && t.name === "Relationship") rels.set(t.attrs["Id"] ?? "", t.attrs["Target"] ?? "");
  return rels;
}

/** A w:b, w:i or w:u that is on: present, and not set to off. */
const on = (attrs: Record<string, string>) => !/^(0|false|off|none)$/i.test(attrs["w:val"] ?? "");

/** Reads the paragraphs of a DOCX file as segments, each marked with the layout of its run's legacy font, or false. */
export async function readDocx(bytes: Uint8Array): Promise<Segment[]> {
  return (await readDocxRich(bytes)).segments;
}

/**
 * Reads a DOCX file as segments with their runs' formats, and the block of each line of the text they make: a line
 * starts with each paragraph and each line break.
 */
export async function readDocxRich(bytes: Uint8Array): Promise<{ segments: Segment[]; lines: LineBlock[] }> {
  const entries = await readZip(bytes, ["word/document.xml", "word/styles.xml", "word/numbering.xml", "word/_rels/document.xml.rels"]);
  const documentXml = entries.get("word/document.xml");
  if (!documentXml) throw new Error(S.files.errors.noDocument);
  const decoder = new TextDecoder();
  const stylesXml = entries.get("word/styles.xml");
  const styles = readStyles(stylesXml ? decoder.decode(stylesXml) : "");
  const defaultLegacy = styles.get("")?.legacy ?? false;
  const numberingXml = entries.get("word/numbering.xml");
  const numbering = readNumbering(numberingXml ? decoder.decode(numberingXml) : "");
  const relsXml = entries.get("word/_rels/document.xml.rels");
  const rels = readRels(relsXml ? decoder.decode(relsXml) : "");

  interface Run {
    style: string | null;
    legacy: Layout | false | null;
    format: RunFormat;
  }
  const segments: Segment[] = [];
  const lines: LineBlock[] = [];
  let line: LineBlock = { block: "p" };
  let href: string | null = null;
  let numId: string | null = null;
  let level = 0;
  /** A line break starts a line of the same kind. */
  const breakLine = () => {
    segments.push({ text: "\n", legacy: false });
    lines.push({ ...line });
  };
  let paragraphStyle: string | null = null;
  let run: Run | null = null;
  let inText = false;
  let inParagraphProps = false;
  let paragraphs = 0;
  // Text boxes nest paragraphs inside a run; the outer state comes back after them.
  const outer: { paragraphStyle: string | null; run: Run | null; line: LineBlock }[] = [];
  // Markup inside these elements is a copy or a past state, not the document.
  let skipDepth = 0;
  const push = (text: string, legacy: Layout | false) => {
    const format = run && (run.format.bold || run.format.italic || run.format.underline || href) ? { ...run.format, ...(href ? { href } : {}) } : null;
    segments.push(format ? { text, legacy, format } : { text, legacy });
  };
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
            ({ paragraphStyle, run, line } = back);
            breakLine();
          }
        } else {
          if (paragraphs++ > 0) segments.push({ text: "\n", legacy: false });
          if (run) outer.push({ paragraphStyle, run, line });
          paragraphStyle = null;
          line = { block: "p" };
          lines.push(line);
          const back = t.empty ? outer.pop() : undefined;
          if (back) ({ paragraphStyle, run } = back);
          else run = null;
        }
        break;
      case "w:pPr":
        inParagraphProps = !t.close && !t.empty;
        if (!inParagraphProps && numId && numId !== "0") {
          const format = numbering.get(numId)?.[level] ?? "bullet";
          line.list = { ordered: format !== "bullet" && format !== "none", level: Math.min(level, 2) };
        } else if (!inParagraphProps && !line.list) {
          // Lists Word numbers through a paragraph style, such as List Bullet 2 or List Number.
          const name = (paragraphStyle && styles.get(paragraphStyle)?.name) || "";
          const m = name.match(/^list (bullet|number)(?: (\d))?$/);
          if (m) line.list = { ordered: m[1] === "number", level: Math.min(Number(m[2] ?? 1) - 1, 2) };
        }
        if (t.close || t.empty) numId = null;
        if (!t.close) level = 0;
        break;
      case "w:pStyle":
        if (inParagraphProps) {
          paragraphStyle = t.attrs["w:val"] ?? null;
          line.block = styleBlock(styles, paragraphStyle);
        }
        break;
      case "w:ilvl":
        if (inParagraphProps) level = Number(t.attrs["w:val"] ?? 0);
        break;
      case "w:numId":
        if (inParagraphProps) numId = t.attrs["w:val"] ?? null;
        break;
      case "w:hyperlink":
        // A link to a place inside the document has no relationship and stays plain text.
        href = t.close || t.empty ? null : (rels.get(t.attrs["r:id"] ?? "") ?? null);
        break;
      case "w:r":
        run = t.close || t.empty ? null : { style: null, legacy: null, format: {} };
        break;
      case "w:b":
        if (run && on(t.attrs)) run.format.bold = true;
        break;
      case "w:i":
        if (run && on(t.attrs)) run.format.italic = true;
        break;
      case "w:u":
        if (run && on(t.attrs)) run.format.underline = true;
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
        if (run && !t.close) breakLine();
        break;
    }
  }
  return { segments, lines };
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

/** A line of a formatted document: its block, and its text in runs of 1 format. */
export interface RichLine {
  block: LineBlock;
  runs: { text: string; format?: RunFormat }[];
}

// Headings and quotes, bold for Kannada too: Word treats Kannada as a complex script, with its own bold and size.
const RICH_STYLES = STYLES.replace(
  "</w:styles>",
  [1, 2, 3]
    .map((n) => {
      const size = [40, 32, 28][n - 1]!;
      return `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;
    })
    .join("") +
    // Word's schema orders paragraph properties, and refuses a file where pBdr comes after ind.
    `<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:pBdr><w:left w:val="single" w:sz="12" w:space="12" w:color="BFBFBF"/></w:pBdr><w:ind w:left="720"/></w:pPr></w:style>` +
    `<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="3F3FBF"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`,
);

const NUMBERED = ["decimal", "lowerLetter", "lowerRoman"];
const BULLETS = ["•", "◦", "▪"];

/** 1 list definition: 3 levels, each a bullet or a number as the list's own lines have them. */
const ABSTRACT = (id: number, bullets: boolean[]) =>
  `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="hybridMultilevel"/>${[0, 1, 2]
    .map(
      (l) =>
        `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="${bullets[l] ? "bullet" : NUMBERED[l]}"/><w:lvlText w:val="${bullets[l] ? BULLETS[l] : `%${l + 1}.`}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (l + 1)}" w:hanging="360"/></w:pPr></w:lvl>`,
    )
    .join("")}</w:abstractNum>`;

/** Each list is its own definition and instance, so a numbered list starts at 1 and counts on past a nested list. */
function numberingXml(lists: boolean[][]): string {
  const defs = lists.map((bullets, i) => ABSTRACT(i, bullets)).join("");
  const nums = lists.map((_, i) => `<w:num w:numId="${i + 1}"><w:abstractNumId w:val="${i}"/></w:num>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${defs}${nums}</w:numbering>`;
}

const RICH_CONTENT_TYPES = CONTENT_TYPES.replace(
  "</Types>",
  `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
);

const HYPERLINK = `<w:rStyle w:val="Hyperlink"/>`;
const UNDERLINE = `<w:u w:val="single"/>`;

function runXml(text: string, format: RunFormat | undefined): string {
  const props = format
    ? [format.href && HYPERLINK, format.bold && "<w:b/><w:bCs/>", format.italic && "<w:i/><w:iCs/>", format.underline && UNDERLINE].filter(Boolean).join("")
    : "";
  const body = text
    .split("\t")
    .map((part, i) => (i > 0 ? "<w:tab/>" : "") + (part ? `<w:t xml:space="preserve">${escapeXml(part)}</w:t>` : ""))
    .join("");
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}${body}</w:r>`;
}

/** A DOCX file of formatted lines: headings, quotes, bulleted and numbered lists, bold, italic, underline and links. */
export function writeRichDocx(lines: RichLine[]): Promise<Uint8Array> {
  const links: string[] = [];
  /** For each list, whether each level is bulleted, from the first line at that level. */
  const lists: boolean[][] = [];
  /** A sub-list of the other kind than the first at its level is numbered on its own, by level; see below. */
  let list: { kinds: (boolean | undefined)[]; num: number; own: ({ num: number; bullet: boolean } | undefined)[] } | null = null;
  const body = lines
    .map(({ block, runs }) => {
      let num = 0;
      // Consecutive list lines are 1 list, until a line at the top level is of the other kind.
      if (!block.list) list = null;
      else {
        const { level } = block.list;
        const bullet = !block.list.ordered;
        const kind = list?.kinds[level];
        if (!list || (level === 0 && kind !== undefined && kind !== bullet)) {
          lists.push([true, true, true]);
          list = { kinds: [], num: lists.length, own: [] };
        }
        if (list.kinds[level] === undefined) {
          list.kinds[level] = bullet;
          lists[list.num - 1]![level] = bullet;
        }
        num = list.num;
        if (level === 0) list.own = [];
        else if (list.kinds[level] !== bullet) {
          // Its own list, used by this level only, so the items above it keep counting in theirs.
          if (list.own[level]?.bullet !== bullet) {
            const kinds = [true, true, true];
            kinds[level] = bullet;
            lists.push(kinds);
            list.own[level] = { num: lists.length, bullet };
          }
          num = list.own[level]!.num;
        }
      }
      const style = { h1: "Heading1", h2: "Heading2", h3: "Heading3", quote: "Quote", p: "" }[block.block];
      const numPr = block.list && num ? `<w:numPr><w:ilvl w:val="${block.list.level}"/><w:numId w:val="${num}"/></w:numPr>` : "";
      const pPr = style || numPr ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${numPr}</w:pPr>` : "";
      const content = runs
        .map(({ text, format }) => {
          if (!format?.href) return runXml(text, format);
          links.push(format.href);
          return `<w:hyperlink r:id="rIdLink${links.length}" w:history="1">${runXml(text, format)}</w:hyperlink>`;
        })
        .join("");
      return `<w:p>${pPr}${content}</w:p>`;
    })
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const rels = DOCUMENT_RELS.replace(
    "</Relationships>",
    `<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${links
      .map((href, i) => `<Relationship Id="rIdLink${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(href)}" TargetMode="External"/>`)
      .join("")}</Relationships>`,
  );
  return writeZip([
    ["[Content_Types].xml", RICH_CONTENT_TYPES],
    ["_rels/.rels", PACKAGE_RELS],
    ["word/document.xml", documentXml],
    ["word/_rels/document.xml.rels", rels],
    ["word/styles.xml", RICH_STYLES],
    ["word/numbering.xml", numberingXml(lists)],
  ]);
}
