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
