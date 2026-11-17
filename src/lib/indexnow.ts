// IndexNow: tells Bing and other engines which pages changed in a deploy.

/** The most URLs 1 IndexNow request may carry. */
export const INDEXNOW_LIMIT = 10_000;

/** Each URL in a sitemap with its lastmod, or null where it has none. */
export function parseSitemap(xml: string): Map<string, string | null> {
  const urls = new Map<string, string | null>();
  for (const [, body = ""] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = body.match(/<loc>([^<]+)<\/loc>/)?.[1]?.replace(/&amp;/g, "&");
    if (loc) urls.set(loc, body.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null);
  }
  return urls;
}

/** URLs on `host` that are new or have a different lastmod than in the live sitemap; every URL when nothing is live yet. */
export function changedUrls(live: Map<string, string | null>, next: Map<string, string | null>, host: string): string[] {
  return [...next]
    .filter(([url, lastmod]) => new URL(url).host === host && (!live.has(url) || live.get(url) !== lastmod))
    .map(([url]) => url)
    .slice(0, INDEXNOW_LIMIT);
}

/** The JSON body of an IndexNow request. */
export function indexNowBody(site: URL, key: string, urls: string[]): { host: string; key: string; keyLocation: string; urlList: string[] } {
  return { host: site.host, key, keyLocation: new URL(`${key}.txt`, site).href, urlList: urls };
}
