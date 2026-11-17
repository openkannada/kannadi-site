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
