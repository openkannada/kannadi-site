// Content negotiation for the markdown mirrors.

/** The quality an Accept header gives a media type: its exact entry, then type/*, then *\/*. */
function quality(accept: string, type: string): number {
  const [major] = type.split("/");
  let best = -1;
  let rank = -1;
  for (const part of accept.split(",")) {
    const [range = "", ...params] = part.trim().toLowerCase().split(";");
    const q = Number(params.map((p) => p.trim()).find((p) => p.startsWith("q="))?.slice(2) ?? "1");
    const r = range === type ? 3 : range === `${major}/*` ? 2 : range === "*/*" ? 1 : 0;
    if (r > rank && r > 0) {
      rank = r;
      best = Number.isFinite(q) ? q : 0;
    }
  }
  return best < 0 ? 0 : best;
}

/** True when the client names text/markdown and wants it at least as much as HTML. */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept || !/text\/markdown/i.test(accept)) return false;
  const md = quality(accept, "text/markdown");
  return md > 0 && md >= quality(accept, "text/html");
}

/** The markdown mirror of a page URL path, or null for paths that are not pages. */
export function markdownPathFor(pathname: string): string | null {
  return pathname.endsWith("/") ? `${pathname}index.md` : null;
}

