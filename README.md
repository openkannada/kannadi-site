# kannadi-site

The kannadi website: a Kannada editor and converter that runs in the browser. It converts text typed in the old Nudi, Baraha and Akruti fonts to Unicode and back, types Kannada from English letters, marks what could not be converted with fixes, and saves Word, web and text files. Nothing leaves the visitor's device.

The conversion runs on [kannadi](https://github.com/prasadus92/kannadi), a Rust library compiled to WebAssembly.

## Pages

| Path | What |
|---|---|
| `/` | The editor |
| `/nudi-to-unicode/`, `/unicode-to-nudi/`, `/baraha-to-unicode/`, `/akruti-to-unicode/` | Converter pages, each with the editor |
| `/kannada-typing/`, `/english-to-kannada-typing/` | Typing pages, opening in English letters with word suggestions |
| `/kannada-alphabet/`, `/kagunita/` | Reference pages: every letter, and every consonant with every vowel sign, spelled by the library at build time |

Every page also has a markdown mirror at `<page>index.md`. In browsers with WebMCP, the editor registers 4 read-only tools (`convert_legacy_to_unicode`, `convert_unicode_to_legacy`, `transliterate`, `count_aksharas`) on `document.modelContext`, or the older `navigator.modelContext`, after the page is idle. The build writes `llms.txt`, `llms-full.txt` and `robots.txt`, and `sitemap.xml` once a site URL is set.

## Build

Needs Node 24, Rust with the `wasm32-unknown-unknown` target, and the `wasm-bindgen` CLI at the version in kannadi's `Cargo.lock`.

```sh
npm ci
npm run wasm        # builds kannadi-wasm at the commit in kannadi.rev into src/editor/wasm
npm run build       # writes dist/
npm run preview
```

`npm run wasm` clones kannadi into `.kannadi`. Set `KANNADI_DIR` to use an existing checkout at the same commit.

Set `SITE_URL` (for example `https://example.org/` or `https://example.org/kannada/`) to add canonical links, absolute Open Graph images and the sitemap. Local builds and CI leave it unset; the deploy sets it.

## Deploy

The site is built for Cloudflare Pages: static files in `dist/`, plus `functions/_middleware.ts` for markdown on request. `wrangler.jsonc` names the project `kannadi`.

Once, on the machine that deploys:

1. Sign in to the Cloudflare account: `npx wrangler login`.
2. Create the project: `npx wrangler pages project create kannadi --production-branch main`.
3. Add the domain to Cloudflare (Add a domain, then set the registrar's nameservers to the 2 Cloudflare gives).
4. In Workers & Pages, open `kannadi`, then Custom domains, and add the domain and its `www` name. Add a redirect rule from `www` to the bare domain.

Each deploy, from a clean checkout of `main`:

```sh
SITE_URL=https://openkannada.org/ npm run deploy
```

`scripts/deploy.ts` refuses a missing, plain http or placeholder `SITE_URL` and a checkout with changes. It then builds the WebAssembly package and the site, runs the SEO smoke check at the production address and the voice lint, and publishes `dist/` and `functions/` to the production branch. It stops at the first step that fails.

## Typing in English letters

In English mode a word typed the way it sounds ("namaskara") becomes the commonest Kannada word that sounds the same (ನಮಸ್ಕಾರ). Tab or a tap picks another, and the choice is remembered in the browser. Words are matched by kannadi's sound-alike keys (`latinKey`, `phoneticKey`). The word list, `data/words.tsv`, holds the 30,000 commonest words in Kannada Wikipedia; regenerate it with `node scripts/words.ts <counts.tsv>`. It is under CC BY-SA 4.0, credited in the site footer.

Voice typing uses the browser's speech recognition in `kn-IN`, in browsers that have it (Chrome and Edge).

## Checks

```sh
npm run check       # TypeScript and Astro
npm test            # unit tests
npm run seo-smoke   # titles, descriptions, JSON-LD, FAQ parity, mirrors, links
npm run voice-lint  # writing rules on the built text
npm run lighthouse  # mobile Lighthouse, 95 or above in every category
```

CI runs all of them on every pull request.

## Layout

| Path | What |
|---|---|
| `src/content/` | Page copy and site facts |
| `src/editor/` | The editor island: document, typing, problems, files |
| `src/components/`, `src/layouts/` | Astro components |
| `src/lib/` | JSON-LD, agent files, content negotiation |
| `src/integrations/agent-files.ts` | Writes the markdown mirrors and llms files after the build |
| `functions/_middleware.ts` | Cloudflare Pages: markdown on `Accept: text/markdown` |
| `public/_headers` | Security and cache headers for Cloudflare Pages |
| `wrangler.jsonc`, `scripts/deploy.ts` | Cloudflare Pages project and the deploy command |
| `scripts/` | wasm build, Open Graph cards, SEO smoke, voice lint |

## License

MIT, except `data/words.tsv`, which is under CC BY-SA 4.0 as a work derived from Kannada Wikipedia (its header gives the source and changes). The fonts are Noto Sans Kannada and Noto Serif Kannada under the SIL Open Font License (`public/fonts/OFL.txt`).
