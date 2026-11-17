# Hosting

openkannada.org runs on Cloudflare Workers with static assets, in Prasad's personal Cloudflare account (`47ac3abdfba61feac39847f19ee678b1`). Everything the hosting needs is declared in code:

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
- On Prasad's Mac, the same token in the keychain: service `openkannada.cloudflare.api`, account `prasadus92`. `npm run deploy` reads it there and never prints it.
- The token holds Workers Scripts, Pages and Account Settings on the account, and Workers Routes, DNS and Zone Read on the 2 zones.

## In the dashboard only

These are not in code and change rarely:
- The registrar, the domain registrations and auto-renew for openkannada.org and openkannada.com.
- The zones themselves, on Cloudflare nameservers.
- Zone settings: AI Crawl Control and the managed robots.txt (Bot Preference Sync), which stays off so the site's own `robots.txt` is served.
- Email routing, when the project gets its own address.

## Launch

The site is live but asks search engines not to index it. To launch, set `LIVE.launched` to `true` in `src/content/site.ts` in a pull request. Merged, the next deploy drops the noindex header, runs the placeholder check, and sends the pages to IndexNow when `INDEXNOW.enabled` is on.

Never run `wrangler login` or `wrangler logout` on Prasad's Mac: the login there belongs to another account.
