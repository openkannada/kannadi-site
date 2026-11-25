// Reading HTML without tripping the page's Content-Security-Policy, which also applies to documents it parses and
// would log every style attribute and element. Renamed, they stay readable: attributes as data-source-style, style
// elements as raw-text textareas.

export const STYLE = "data-source-style";

export function parseHtml(html: string): Document {
  const renamed = html
    .replace(/(<[a-z][^<>]*?\s)style(\s*=)/gi, `$1${STYLE}$2`)
    .replace(/<style\b[^>]*>/gi, `<textarea ${STYLE}>`)
    .replace(/<\/style\s*>/gi, "</textarea>");
  return new DOMParser().parseFromString(renamed, "text/html");
}
