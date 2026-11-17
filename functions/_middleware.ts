// Cloudflare Pages: answers requests that prefer text/markdown with the
// page's markdown mirror, tells caches the page varies by Accept, and keeps
// pages.dev copies of the site out of search results.
import { isPreviewHost, markdownPathFor, prefersMarkdown } from "../src/lib/negotiate.ts";

interface Context {
  request: Request;
  env: { ASSETS: { fetch: (input: Request | URL | string) => Promise<Response> } };
  next: () => Promise<Response>;
}

export async function onRequest(context: Context): Promise<Response> {
  const response = await respond(context);
  if (!isPreviewHost(new URL(context.request.url).hostname)) return response;
  const headers = new Headers(response.headers);
  headers.set("x-robots-tag", "noindex");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function respond({ request, env, next }: Context): Promise<Response> {
  const url = new URL(request.url);
  const mdPath = markdownPathFor(url.pathname);
  if ((request.method === "GET" || request.method === "HEAD") && mdPath && prefersMarkdown(request.headers.get("accept"))) {
    const md = await env.ASSETS.fetch(new URL(mdPath, url));
    if (md.ok) {
      const headers = new Headers(md.headers);
      headers.set("content-type", "text/markdown; charset=utf-8");
      headers.set("vary", "Accept");
      return new Response(request.method === "HEAD" ? null : md.body, { status: 200, headers });
    }
  }
  const response = await next();
  if (mdPath && response.headers.get("content-type")?.startsWith("text/html")) {
    const headers = new Headers(response.headers);
    headers.append("vary", "Accept");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
}
