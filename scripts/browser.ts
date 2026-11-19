// What the browser checks share: a static server for the built site, and the Chrome to drive.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join } from "node:path";

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".wasm": "application/wasm", ".json": "application/json", ".tsv": "text/plain; charset=utf-8" };

/** Serves `dist` on `port`, or on a free local port. */
export function serve(dist: string, port = 0): { server: Server; port: number } {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    const file = join(dist, path.endsWith("/") ? `${path}index.html` : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  }).listen(port);
  return { server, port: (server.address() as { port: number }).port };
}

/** A Chrome or Chromium binary, from CHROME_PATH or the usual places. */
export function chrome(): string {
  const path = process.env.CHROME_PATH ?? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
  if (!path) throw new Error("Set CHROME_PATH to a Chrome or Chromium binary.");
  return path;
}
