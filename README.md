# kannadi-site

The Open Kannada website, with kannadi, a Kannada editor and converter that runs in the browser. It converts text typed in the old Nudi, Baraha and Akruti fonts to Unicode, types Kannada from English letters, marks what could not be converted with fixes, and saves Word, web, text and Nudi files. Nothing leaves the visitor's device.

The conversion runs on [kannadi](https://github.com/openkannada/kannadi), a Rust library compiled to WebAssembly.

## Pages

| Path | What |
|---|---|
| `/` | The Open Kannada home page: the tagline, the story in short, a box that hands pasted Nudi or Baraha text to the editor through `sessionStorage`, every tool, and how to help |
| `/editor/` | The editor |
| `/nudi-to-unicode/`, `/unicode-to-nudi/`, `/baraha-to-unicode/`, `/akruti-to-unicode/` | Converter pages, each with the editor |
| `/kannada-typing/`, `/english-to-kannada-typing/` | Typing pages, opening in English letters with word suggestions |
| `/kannada-alphabet/`, `/kagunita/` | Reference pages: every letter, and every consonant with every vowel sign, spelled by the library at build time |
| `/fonts/`, `/spell-check/`, `/dictionary/`, `/ocr/`, `/ai-benchmark/` | Project pages: what each tool does, its measured result, downloads and license |
| `/about/`, `/contribute/`, `/press/`, `/brand/` | Open Kannada itself. `/names-and-logos/` answers with a 301 to `/brand/` (`REDIRECTS` in `src/lib/edge.ts`) |
| `/kn/`, `/kn/about/`, `/kn/press/`, `/kn/brand/` | The Kannada pages, each the twin of an English page; `/kn/` is the Kannada editor, the twin of `/editor/`. A new Kannada page can be marked `needsReview` in `src/content/pages.ts` to keep it out of the build until a native reader has checked it; `KANNADA_DRAFTS=1 npm run build` (or `npm run dev`) includes it for reading. |

Every page also has a markdown mirror at `<page>index.md`. In browsers with WebMCP, every page with the editor registers 4 read-only tools (`convert_legacy_to_unicode`, `convert_unicode_to_legacy`, `transliterate`, `count_aksharas`) on `document.modelContext`, or the older `navigator.modelContext`, after the page is idle. The build writes `llms.txt`, `llms-full.txt` and `robots.txt`, and `sitemap.xml` once a site URL is set.

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

- **From Cloudflare Workers Builds:** every push to `main` is built and checked for https://openkannada.org (`scripts/cf-build.sh`), published with Wrangler, then checked live (`scripts/live-check.ts`). Every other branch gets a noindex Preview on workers.dev, linked from its pull request.
- **By hand,** from a clean `main` that matches `origin/main`: `npm run deploy`. It runs the same steps. The API token comes from `CLOUDFLARE_API_TOKEN`, or else from the macOS keychain item `openkannada.cloudflare.api`.
- **Since launch,** on 22 November 2026 (`LIVE.launched` in `src/content/site.ts`):
  - pages are indexable, and only the form endpoint, build files and markdown mirrors send `X-Robots-Tag: noindex`;
  - the placeholder check runs before each publish;
  - after the live check, IndexNow gets the pages whose lastmod changed (`INDEXNOW.enabled`).

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
| `src/lib/` | JSON-LD, agent files, content negotiation, the home page's handoff to the editor |
| `src/integrations/agent-files.ts` | Writes the markdown mirrors and llms files after the build |
| `worker/index.ts`, `src/lib/edge.ts` | The Worker: the canonical-host redirect, markdown on `Accept: text/markdown`, and the interest form's endpoint |
| `public/_headers` | Security and cache headers |
| `wrangler.jsonc`, `scripts/deploy.ts`, `infra/` | The Cloudflare Worker, the deploy command, and the hosting notes |
| `scripts/` | wasm build, Open Graph cards, SEO smoke, voice lint |

## Related

- [kannadi](https://github.com/openkannada/kannadi): the converter, typing engine and text tools behind the editor, compiled to WebAssembly.
- [Neha Sans and Neha Serif](https://github.com/openkannada/neha-fonts) and [Gari](https://github.com/openkannada/gari-font): the Kannada fonts the site uses and offers on `/fonts/`.
- [font-health-action](https://github.com/openkannada/font-health-action): the shaping tests those fonts pass.

## License

- Code: MIT OR Apache-2.0, at your choice (`LICENSE-MIT`, `LICENSE-APACHE`).
- Page copy, documents and the images we make: CC BY 4.0.
- `data/words.tsv`: CC BY-SA 4.0, as a work derived from Kannada Wikipedia. Its header gives the source and the changes.
- Fonts: Neha Sans, Neha Serif and Gari for Kannada, and Noto Sans and the Latin subset of Noto Serif Kannada for Latin, all under the SIL Open Font License (`public/fonts/OFL.txt`).

`LICENSING.md` has the details and the third-party credits, and `REUSE.toml` records the license of every path. Contributions are signed off under the Developer Certificate of Origin; see `CONTRIBUTING.md`.

Part of [Open Kannada](https://github.com/openkannada), free and open-source tools that make Kannada work properly on computers.
