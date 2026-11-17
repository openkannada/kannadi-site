# Agent notes for kannadi-site

Read `PRODUCT.md` for who the site is for, and `DESIGN.md` for the visual system, before changing UI.

## Rules

- Commit with my identity, signed and signed off for the DCO: `git -c user.name="Prasad Subrahmanya" -c user.email=prasadus92@gmail.com commit -S -s`. No AI attribution in commits, PR bodies or review replies. Other contributors sign off with `git commit -s` (see CONTRIBUTING.md).
- Branch from `origin/main` and open a pull request. Never push `main` or force-push.
- Every push to `main` deploys to https://openkannada.org from CI (see `infra/README.md`), so a merge is a release. Only maintainers deploy production by hand; contributors never run `npm run deploy`, `wrangler deploy`, `wrangler login` or `wrangler logout`. `SITE_URL` stays unset in CI except for the smoke build at `example.org` and the deploy job.
- The site stays noindex until launch: `LIVE.launched` in `src/content/site.ts` changes only in a maintainer's pull request.
- Pin every dependency to an exact version, checked on the registry.
- Copy is in `src/content/pages.ts`. Plain American English, digits for numbers, no em dashes, no hype, no disclaimers. `npm run voice-lint` checks the built text.
- Every new page needs an entry in `PAGES`; `npm run seo-smoke` fails on a built page without one.
- A change to any page's text needs `npm run build && npm run page-hashes`, with `data/page-hashes.json` committed in the same pull request, so the sitemap's `lastmod` stays true; `npm run seo-smoke` fails until it is.
- The page CSP allows no inline style attributes. Put styles in CSS.
- Library changes go to openkannada/kannadi as pull requests; then update `kannadi.rev`.

## Commands

`uvx reuse lint` (every file has a license; see REUSE.toml and LICENSING.md), `npm run wasm`, `npm run build`, `npm run check`, `npm test`, `npm run seo-smoke`, `npm run voice-lint`, `npm run page-hashes`, `npm run lighthouse`. `npm run deploy` publishes by hand; CI deploys every push to `main`.
