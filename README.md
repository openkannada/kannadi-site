# kannadi-site

The kannadi website: a Kannada editor and converter that runs in the browser. It converts text typed in the old Nudi, Baraha and Akruti fonts to Unicode, types Kannada from English letters, marks what could not be converted with fixes, and saves Word, web, text and Nudi files. Nothing leaves the visitor's device.

The conversion runs on [kannadi](https://github.com/openkannada/kannadi), a Rust library compiled to WebAssembly.

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

`npm run wasm` clones kannadi into `.kannadi`. Set `KANNADI_DIR` to use an existing checkout at the same commit, with no uncommitted changes.

Set `SITE_URL` (for example `https://example.org/` or `https://example.org/kannada/`) to add canonical links, absolute Open Graph images and the sitemap. Local builds leave it unset, CI sets it only for a second smoke build at `example.org`, and the deploy sets the real address.

## Deploy

The site runs on Cloudflare Workers with static assets at https://openkannada.org. `infra/README.md` describes the hosting, which `wrangler.jsonc` declares in full.

- **From CI:** every push to `main` that passes the checks is built for https://openkannada.org, published with Wrangler, then checked live (`scripts/live-check.ts`).
- **By hand,** from a clean `main` that matches `origin/main`: `npm run deploy`. It runs the same steps. The API token comes from `CLOUDFLARE_API_TOKEN`, or else from the macOS keychain item `openkannada.cloudflare.api`.
- **Before launch:**
  - every response carries `X-Robots-Tag: noindex`;
  - the placeholder check waits;
  - IndexNow stays quiet.

  Launching is `LIVE.launched` in `src/content/site.ts`.

The deploy refuses a missing, plain http, placeholder, `pages.dev`, `workers.dev` or sub-path `SITE_URL`, local changes, any branch other than `main`, and a `main` that differs from `origin/main`. It ignores `KANNADI_DIR`, so the WebAssembly package comes from kannadi at `kannadi.rev`.

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
| `worker/index.ts`, `src/lib/edge.ts` | The Worker: the canonical-host redirect, markdown on `Accept: text/markdown`, noindex until launch |
| `public/_headers` | Security and cache headers |
| `wrangler.jsonc`, `scripts/deploy.ts`, `infra/` | The Cloudflare Worker, the deploy command, and the hosting notes |
| `scripts/` | wasm build, Open Graph cards, SEO smoke, voice lint |

## License

- Code: MIT OR Apache-2.0, at your choice (`LICENSE-MIT`, `LICENSE-APACHE`).
- Page copy, documents and the images we make: CC BY 4.0.
- `data/words.tsv`: CC BY-SA 4.0, as a work derived from Kannada Wikipedia. Its header gives the source and the changes.
- Fonts: Noto Sans, Noto Sans Kannada and Noto Serif Kannada, under the SIL Open Font License (`public/fonts/OFL.txt`).

`LICENSING.md` has the details and the third-party credits, and `REUSE.toml` records the license of every path. Contributions are signed off under the Developer Certificate of Origin; see `CONTRIBUTING.md`.

Part of [Open Kannada](https://github.com/openkannada), free and open-source tools that make Kannada work properly on computers.
