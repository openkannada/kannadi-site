// The widths every page must hold at, and what counts as broken.

export const WIDTHS = [360, 390, 768, 1024, 1440, 1920] as const;

/** CLS above this is a visible jump; Lighthouse's own budget is 0.1, and a page should not get near it. */
export const MAX_CLS = 0.05;

export interface Measure {
  scrollWidth: number;
  innerWidth: number;
  cls: number;
  clippedKannada: string[];
}

/** What is wrong with a page at 1 width, from what the browser measured. */
export function layoutProblems(m: Measure): string[] {
  const out: string[] = [];
  if (m.scrollWidth > m.innerWidth) out.push(`scrolls sideways by ${m.scrollWidth - m.innerWidth}px`);
  if (m.cls > MAX_CLS) out.push(`layout shift ${m.cls.toFixed(3)}`);
  for (const t of m.clippedKannada) out.push(`clipped Kannada: ${t}`);
  return out;
}

/** Phone screens as width and the height left once the browser's own bars show, from a small Android to a large iPhone. */
export const PHONES = [
  [360, 640],
  [390, 664],
  [430, 740],
] as const;

/** On a phone the editor's writing area starts within this share of the first screen. */
export const SHEET_TOP_MAX = 0.4;

/** What a phone's first screen shows of the editor or of the home page's paste box. */
export interface PhoneMeasure {
  height: number;
  /** The top of the editor's sheet, on a page with the editor. */
  sheetTop?: number;
  /** The editor's toolbar. */
  toolbar?: { top: number; bottom: number };
  /** The bottom of the home page's paste box input. */
  pasteBottom?: number;
}

/** What is wrong with the first screen on a phone: the writing area too low, the toolbar out of reach, or the paste box below the fold. */
export function phoneProblems(m: PhoneMeasure): string[] {
  const out: string[] = [];
  if (m.sheetTop !== undefined && m.sheetTop > m.height * SHEET_TOP_MAX) out.push(`the writing area starts at ${Math.round(m.sheetTop)}px, below ${Math.round(m.height * SHEET_TOP_MAX)}px`);
  if (m.toolbar && (m.toolbar.top < 0 || m.toolbar.bottom > m.height)) out.push(`the toolbar sits at ${Math.round(m.toolbar.top)} to ${Math.round(m.toolbar.bottom)}px, off the first screen`);
  if (m.pasteBottom !== undefined && m.pasteBottom > m.height) out.push(`the paste box ends at ${Math.round(m.pasteBottom)}px, below the first screen`);
  return out;
}

/** A card in a row of cards: its box, and the top of each part marked with `data-align`. */
export interface Card {
  top: number;
  bottom: number;
  width: number;
  parts: Record<string, number>;
}

const apart = (values: number[]) => Math.max(...values) - Math.min(...values);

/**
 * What does not line up across cards side by side. Cards whose heights overlap form a row, and only cards of the same
 * width are compared, so a card spanning 2 columns keeps its own layout. Within those, tops, bottoms and every marked
 * part must agree to 1px.
 */
export function misaligned(cards: Card[]): string[] {
  const rows: Card[][] = [];
  for (const c of [...cards].sort((a, b) => a.top - b.top)) {
    const row = rows.find((r) => r.some((o) => c.top < o.bottom - 1 && o.top < c.bottom - 1));
    if (row) row.push(c);
    else rows.push([c]);
  }
  const out: string[] = [];
  for (const row of rows) {
    const widths = new Map<number, Card[]>();
    for (const c of row) {
      const key = [...widths.keys()].find((w) => Math.abs(w - c.width) <= 1) ?? c.width;
      widths.set(key, [...(widths.get(key) ?? []), c]);
    }
    for (const alike of widths.values()) {
      if (alike.length < 2) continue;
      if (apart(alike.map((c) => c.top)) > 1) out.push(`card tops sit ${Math.round(apart(alike.map((c) => c.top)))}px apart across ${alike.length} cards`);
      if (apart(alike.map((c) => c.bottom)) > 1) out.push(`card bottoms sit ${Math.round(apart(alike.map((c) => c.bottom)))}px apart across ${alike.length} cards`);
      for (const part of new Set(alike.flatMap((c) => Object.keys(c.parts)))) {
        const tops = alike.map((c) => c.parts[part]).filter((t): t is number => t !== undefined);
        if (tops.length > 1 && apart(tops) > 1) out.push(`${part} sits ${Math.round(apart(tops))}px apart across ${tops.length} cards`);
      }
    }
  }
  return out;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** An ancestor that hides overflow, on the axes it hides. */
export interface Clipper {
  box: Box;
  x: boolean;
  y: boolean;
}

/** Whether text drawn in `text` is cut by any clipping ancestor, by more than 1px. Clippers of 1px or less are visually hidden text, not cuts. */
export function isClipped(text: Box, clippers: Clipper[]): boolean {
  return clippers.some(({ box, x, y }) => {
    if (box.right - box.left <= 1 || box.bottom - box.top <= 1) return false;
    const cutX = x && (text.left < box.left - 1 || text.right > box.right + 1);
    const cutY = y && (text.top < box.top - 1 || text.bottom > box.bottom + 1);
    return cutX || cutY;
  });
}

/**
 * What a snapshot "class|opacity|..." looks like: a finished animation reports an identity transform or a zero blur
 * where the rest frame says none, and a part at opacity 0 looks the same wherever it sits.
 */
function looksSame(style: string): string {
  const parts = style.replace(/matrix\(1, 0, 0, 1, 0, 0\)|blur\(0px\)/g, "none").split("|");
  return parts[1] === "0" ? parts.slice(0, 2).join("|") : parts.join("|");
}

/** The parts of an illustration whose final frame differs from its rest frame, from 1 style snapshot per part. */
export function frameDrift(rest: string[], final: string[]): string[] {
  return final.filter((f, i) => looksSame(f) !== looksSame(rest[i] ?? ""));
}
