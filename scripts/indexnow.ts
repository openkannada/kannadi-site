// IndexNow around a deploy. Before publishing: node scripts/indexnow.ts snapshot <site URL>
// saves the live sitemap. After: node scripts/indexnow.ts submit <site URL> sends the pages
// whose lastmod changed. Does nothing while INDEXNOW.enabled is false.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { INDEXNOW } from "../src/content/site.ts";
import { changedUrls, indexNowBody, parseSitemap } from "../src/lib/indexnow.ts";

const [mode, siteArg] = process.argv.slice(2);
const SNAPSHOT = ".deploy/live-sitemap.xml";
if (!siteArg || (mode !== "snapshot" && mode !== "submit")) {
  console.error("Usage: node scripts/indexnow.ts snapshot|submit <site URL>");
  process.exit(1);
}
const site = new URL(siteArg);
if (!INDEXNOW.enabled) {
  console.log("IndexNow is off (INDEXNOW.enabled in src/content/site.ts).");
  process.exit(0);
}

if (mode === "snapshot") {
  const res = await fetch(new URL("sitemap.xml", site));
  mkdirSync(".deploy", { recursive: true });
  writeFileSync(SNAPSHOT, res.ok ? await res.text() : "");
  console.log(res.ok ? "Saved the live sitemap." : `No live sitemap (status ${res.status}); every page counts as new.`);
} else {
  const live = parseSitemap(existsSync(SNAPSHOT) ? readFileSync(SNAPSHOT, "utf8") : "");
  const urls = changedUrls(live, parseSitemap(readFileSync("dist/sitemap.xml", "utf8")), site.host);
  if (!urls.length) {
    console.log("No page changed; nothing sent to IndexNow.");
    process.exit(0);
  }
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(indexNowBody(site, INDEXNOW.key, urls)),
  });
  if (!res.ok && res.status !== 202) {
    console.error(`IndexNow answered ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  console.log(`Sent ${urls.length} changed pages to IndexNow.`);
}
