# Hosting

openkannada.org runs on Cloudflare Workers with static assets, in my personal Cloudflare account (`47ac3abdfba61feac39847f19ee678b1`). Everything the hosting needs is declared in code:

| What | Where |
|---|---|
| The Worker, its account, its static files and its 404 page | `wrangler.jsonc` |
| The 4 domains, as custom domains: openkannada.org, www.openkannada.org, openkannada.com, www.openkannada.com | `wrangler.jsonc`, `routes` |
| No `*.workers.dev` address for production | `wrangler.jsonc`, `workers_dev` |
| Branch Previews on workers.dev, served as themselves and noindex | `wrangler.jsonc`, `preview_urls` and `previews`; `PREVIEW` in `src/lib/edge.ts` |
| A 301 from every other host, and from http, to https://openkannada.org, with the path and query kept | `worker/index.ts`, `src/lib/edge.ts` |
| Markdown on request (`Accept: text/markdown`) | `src/lib/edge.ts` |
| Indexable pages since launch; `X-Robots-Tag: noindex` before it | `LIVE.launched` in `src/content/site.ts` |
| Security, cache and content-type headers | `public/_headers` |
| Deploys | Cloudflare Workers Builds, on every push to `main`: `scripts/cf-build.sh`, then `node scripts/deploy.ts publish` |

## Deploys

Workers Builds, Cloudflare's CI for Workers, is connected to this repository through the Cloudflare Workers and Pages GitHub app, which can see this repository only. Its settings are in the dashboard under the Worker's **Settings > Build**:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `scripts/cf-build.sh` |
| Deploy command | `node scripts/deploy.ts publish` |
| Preview builds | On, for every other branch |
| Preview command | `npx wrangler preview` |
| Build cache | On (npm's cache) |

The build image has Node.js but no Rust, so `scripts/cf-build.sh` installs the stable toolchain with rustup and the wasm-bindgen release that kannadi's `Cargo.lock` names, checked against the SHA-256 in `scripts/wasm-bindgen.sha256`. A `kannadi.rev` bump that moves wasm-bindgen adds its line there, from the release's `.sha256sum` file; the pull request's Preview build fails until it does. The build also fetches the full git history, since the sitemap dates each page from it, and fails on a shallow clone. It then runs the build phase of `scripts/deploy.ts`: the WebAssembly package from kannadi at `kannadi.rev`, the type check, the unit tests, the build for https://openkannada.org, the page check, the writing check and, after launch, the placeholder check. A failing step fails the build, and nothing is published.

On `main` the deploy command then runs the publish phase, below under "Build files across a deploy", and the live check; after launch it also sends the changed pages to IndexNow. It refuses any other branch. On other branches the Preview command publishes a branch Preview at `<branch>-openkannada.prasad-personal.workers.dev`, and Workers Builds posts its address on the pull request. A Preview runs with `PREVIEW=1`, so the Worker serves it on its own host instead of redirecting to openkannada.org, and marks every response noindex.

GitHub Actions still runs every check on pull requests and on `main`, including the browser tests, layout, typing and Lighthouse. Merge only on green CI: Workers Builds does not wait for it.

On the free plan Workers Builds allows 3,000 build minutes a month, 1 build at a time and 20 minutes a build.

## Secrets

- Workers Builds deploys with an API token it created for this account, kept in Cloudflare. GitHub holds no Cloudflare token.
- On my Mac, a token in the keychain: service `openkannada.cloudflare.api`, account `prasadus92`. `npm run deploy` reads it there and never prints it.
- That token holds Workers Scripts, Pages and Account Settings on the account, and Workers Routes, DNS and Zone Read on the 2 zones.

## In the dashboard only

These are not in code and change rarely:
- The registrar, the domain registrations and auto-renew for openkannada.org and openkannada.com.
- The zones themselves, on Cloudflare nameservers. The zones, their TLS settings and the 4 custom domains are also in OpenTofu, in the private repository openkannada/infra.
- Zone settings: AI Crawl Control and the managed robots.txt, which stays off so the site's own `robots.txt` is served.
- Email routing, when the project gets its own address.
- The Workers Builds connection and its settings, listed under "Deploys" above.

## Requests

Pages and other files run the Worker first, so it can redirect and answer markdown requests. Hashed scripts, styles and fonts under `/_astro/` go straight to the asset server, which does not count as a Worker request; `_headers` marks them noindex, as it does the markdown mirrors at their own `index.md` addresses and `/fonts/OFL.txt`. The Workers free plan allows 100,000 Worker requests a day.

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

The site launched on 22 November 2026: `LIVE.launched` is `true`, so pages carry no noindex header and every deploy runs the placeholder check before it publishes. IndexNow sends the changed pages after the live check once `INDEXNOW.enabled` is on in `src/content/site.ts`; its key file is served at https://openkannada.org/3601f9fcb12d8a620b36768a880d87ae.txt.

Never run `wrangler login` or `wrangler logout` on my Mac: the login there belongs to another account.

## The interest form

The form on /contribute/ is open. Submissions go to the D1 database `openkannada-interest`, bound as `DB` in `wrangler.jsonc`, after the Worker checks a Turnstile token from the widget named `openkannada.org` (managed mode, for openkannada.org and www.openkannada.org). The widget's site key is `INTEREST.turnstileSiteKey` in `src/content/interest.ts`; its secret is the Worker secret `TURNSTILE_SECRET`, which deploys keep. The endpoint takes only JSON from https://openkannada.org (or localhost), under 8 KB, with a Turnstile token solved on that host.

To close it, set `INTEREST.open` to `false` and change the test in `test/interest.test.ts` that expects it open: the button then says the form opens soon, the page loads no Turnstile script and drops `https://challenges.cloudflare.com` from its script and frame sources, and `POST /api/interest` answers 503 without reading the request.

To test a change locally, use Cloudflare's Turnstile test keys: set `turnstileSiteKey` to `1x00000000000000000000AA` for that build only, put `TURNSTILE_SECRET=1x0000000000000000000000000000000AA` in `.dev.vars` (ignored by Git), apply the migration with `npx wrangler d1 migrations apply openkannada-interest --local`, then run `npm run build && npx wrangler dev` and open /contribute/. The page gets a token and posts it, but test tokens report the host `example.com`, so the Worker answers 403 and stores nothing; that still shows the page's CSP and the request path. A stored row needs the real widget, which allows only the 2 production hosts.

Read submissions with `npx wrangler d1 execute openkannada-interest --remote --command "SELECT * FROM interest ORDER BY created_at DESC"`. To delete someone's details, `DELETE FROM interest WHERE email = '<their email>'`.
