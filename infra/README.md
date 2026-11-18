# Hosting

openkannada.org runs on Cloudflare Workers with static assets, in my personal Cloudflare account (`47ac3abdfba61feac39847f19ee678b1`). Everything the hosting needs is declared in code:

| What | Where |
|---|---|
| The Worker, its account, its static files and its 404 page | `wrangler.jsonc` |
| The 4 domains, as custom domains: openkannada.org, www.openkannada.org, openkannada.com, www.openkannada.com | `wrangler.jsonc`, `routes` |
| No `*.workers.dev` address and no preview URLs | `wrangler.jsonc`, `workers_dev` and `preview_urls` |
| A 301 from every other host, and from http, to https://openkannada.org, with the path and query kept | `worker/index.ts`, `src/lib/edge.ts` |
| Markdown on request (`Accept: text/markdown`) | `src/lib/edge.ts` |
| `X-Robots-Tag: noindex` on every response until launch | `LIVE.launched` in `src/content/site.ts` |
| Security, cache and content-type headers | `public/_headers` |
| Deploys | `.github/workflows/ci.yml`, job `deploy`, on every push to `main` that passes the checks |

## Secrets

- GitHub repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, for the deploy job.
- On my Mac, the same token in the keychain: service `openkannada.cloudflare.api`, account `prasadus92`. `npm run deploy` reads it there and never prints it.
- The token holds Workers Scripts, Pages and Account Settings on the account, and Workers Routes, DNS and Zone Read on the 2 zones.

## In the dashboard only

These are not in code and change rarely:
- The registrar, the domain registrations and auto-renew for openkannada.org and openkannada.com.
- The zones themselves, on Cloudflare nameservers.
- Zone settings: AI Crawl Control and the managed robots.txt, which stays off so the site's own `robots.txt` is served.
- Email routing, when the project gets its own address.

## Before the first deploy

The merge that adds the deploy job also deploys, so these have to be in place first:
- The 2 repository secrets.
- No DNS record, redirect rule or Pages custom domain on any of the 4 hostnames. Wrangler attaches each as a Worker custom domain and creates its DNS record and certificate; an existing record makes that fail.

The certificates can take a few minutes, so the live check retries for up to 5 minutes before it fails.

## Requests

Pages and other files run the Worker first, so it can redirect and set noindex. Hashed scripts, styles and fonts under `/_astro/` and `/fonts/` go straight to the asset server, which does not count as a Worker request; `_headers` marks them noindex. The Workers free plan allows 100,000 Worker requests a day.

## Build files across a deploy

Build files under `/_astro/` are named by a hash of their content, and a deploy replaces them. A page already open, or HTML a cache still holds, asks for the previous names, so before each publish `scripts/keep-assets.ts` copies every build file the live pages name, and the files those name, into the new upload. They stay until the deploy after, so a tab opened 2 deploys back can still miss them. The live check then fails if a build file named by the pages it checks, or kept by the deploy, does not answer 200.

Build files are cached for a year as `immutable`. That header also applies to a 404, and for up to a minute after a publish the edge can still miss a new file, so a browser could keep a 404 for a file that exists moments later. A deploy therefore goes out in 2 steps (`scripts/stage.ts`):
1. The new build is published with the live HTML and the live 404 page in place of the new. Every build file that HTML names goes out with it, so it names nothing missing. Pages new in this build show the 404 page until step 2.
2. Once every build file answers 200 here, plus 30 seconds for other locations, the new build is published as is.

If a file never answers, step 2 does not run. Step 1's build stays live: the old HTML with the new Worker, markdown mirrors, llms files and sitemap. It is consistent, and the next deploy starts from it.

The word list is served as `text/plain`, so the edge compresses it.

## Rolling back

`npx wrangler rollback` returns to the previous version of the Worker, with its files. A revert merged to `main` then makes it permanent.

## Launch

The site is live but asks search engines not to index it. To launch, set `LIVE.launched` to `true` in `src/content/site.ts` in a pull request. Once merged, the next deploy drops the noindex header, runs the placeholder check before it publishes, and sends the pages to IndexNow after the live check, when `INDEXNOW.enabled` is on.

Never run `wrangler login` or `wrangler logout` on my Mac: the login there belongs to another account.
