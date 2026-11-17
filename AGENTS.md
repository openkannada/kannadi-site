# Agent notes for kannadi-site

Read `PRODUCT.md` for who the site is for, and `DESIGN.md` for the visual system, before changing UI.

## Rules

- Commit as Prasad, signed: `git -c user.name="Prasad Subrahmanya" -c user.email=prasadus92@gmail.com commit -S`. No AI attribution in commits, PR bodies or review replies.
- Branch from `origin/main` and open a pull request. Never push `main` or force-push.
- Only Prasad deploys, with `npm run deploy` on his Cloudflare account (see the README). Agents never run it. `SITE_URL` stays unset in CI except for the smoke build at `example.org`.
- Pin every dependency to an exact version, checked on the registry.
- Copy is in `src/content/pages.ts`. Plain American English, digits for numbers, no em dashes, no hype, no disclaimers. `npm run voice-lint` checks the built text.
- Every new page needs an entry in `PAGES`; `npm run seo-smoke` fails on a built page without one.
- A change to any page's text needs `npm run build && npm run page-dates`, with `data/page-dates.json` committed, so the sitemap's `lastmod` stays true; `npm run seo-smoke` fails until it is.
- The page CSP allows no inline style attributes. Put styles in CSS.
- Library changes go to openkannada/kannadi as pull requests; then update `kannadi.rev`.

## Commands

`npm run wasm`, `npm run build`, `npm run check`, `npm test`, `npm run seo-smoke`, `npm run voice-lint`, `npm run page-dates`, `npm run lighthouse`. `npm run deploy` publishes; Prasad runs it.
