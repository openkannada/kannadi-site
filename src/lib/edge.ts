// What the Worker in front of the static files does to each request: send every other host to the 1 canonical
// address, send moved pages to their new paths, answer requests that prefer markdown with the page's mirror,
// and, before launch, keep the site out of search results.
import { markdownPathFor, prefersMarkdown } from "./negotiate.ts";

export interface Assets {
  fetch: (input: Request | URL | string) => Promise<Response>;
}

export interface EdgeOptions {
  /** The canonical host, such as "openkannada.org". */
  host: string;
  launched: boolean;
}

/** Hosts where the Worker answers as itself, for wrangler dev. */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;

/** The 301 target for a request that is not on the canonical https host, with its path and query kept; null when it already is. */
export function canonicalRedirect(url: URL, host: string): string | null {
  if (LOCAL.test(url.hostname)) return null;
  if (url.hostname === host && url.protocol === "https:") return null;
  return `https://${host}${url.pathname}${url.search}`;
}

/** Pages that moved, old path to new; each covers the path without its slash and the files under it. */
export const REDIRECTS: Record<string, string> = {
  "/names-and-logos/": "/brand/",
  "/kn/names-and-logos/": "/kn/brand/",
};

/** The new path and query for a page that moved, or null. */
export function movedTo(url: URL): string | null {
  for (const [from, to] of Object.entries(REDIRECTS)) {
    if (url.pathname === from.slice(0, -1)) return `${to}${url.search}`;
    if (url.pathname.startsWith(from)) return `${to}${url.pathname.slice(from.length)}${url.search}`;
  }
  return null;
}

function withHeaders(response: Response, set: Record<string, string>, append: Record<string, string> = {}): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(set)) headers.set(k, v);
  for (const [k, v] of Object.entries(append)) headers.append(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function handle(request: Request, assets: Assets, options: EdgeOptions): Promise<Response> {
  const url = new URL(request.url);
  const target = canonicalRedirect(url, options.host);
  if (target) return new Response(null, { status: 301, headers: { location: target } });
  const moved = movedTo(url);
  if (moved) return noindex(new Response(null, { status: 301, headers: { location: moved } }), options);

  let response = await respond(request, url, assets);
  // The asset server adds a page's trailing slash with a 307; a permanent move is what search engines should keep.
  if (response.status === 307 && response.headers.has("location")) {
    response = new Response(null, { status: 308, headers: { location: response.headers.get("location") ?? "/" } });
  }
  return noindex(response, options);
}

function noindex(response: Response, options: EdgeOptions): Response {
  return options.launched ? response : withHeaders(response, { "x-robots-tag": "noindex" });
}

async function respond(request: Request, url: URL, assets: Assets): Promise<Response> {
  const mdPath = markdownPathFor(url.pathname);
  const readable = request.method === "GET" || request.method === "HEAD";
  if (readable && mdPath && prefersMarkdown(request.headers.get("accept"))) {
    const md = await assets.fetch(new URL(mdPath, url));
    if (md.ok) {
      // The mirror file is noindex as a copy, but served at the page's own address it is that page.
      const response = withHeaders(md, { "content-type": "text/markdown; charset=utf-8", vary: "Accept" });
      response.headers.delete("x-robots-tag");
      return request.method === "HEAD" ? new Response(null, { status: 200, headers: response.headers }) : response;
    }
  }
  const response = await assets.fetch(request);
  if (mdPath && response.headers.get("content-type")?.startsWith("text/html")) return withHeaders(response, {}, { vary: "Accept" });
  return response;
}
