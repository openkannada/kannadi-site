# kannadi-site

The kannadi website: a Kannada editor and converter that runs in the browser. It converts text typed in the old Nudi, Baraha and Akruti fonts to Unicode and back, types Kannada from English letters, marks what could not be converted with fixes, and saves Word, web and text files. Nothing leaves the visitor's device.

The conversion runs on [kannadi](https://github.com/prasadus92/kannadi), a Rust library compiled to WebAssembly.

## Pages

| Path | What |
|---|---|
| `/` | The editor |
| `/nudi-to-unicode/`, `/unicode-to-nudi/`, `/baraha-to-unicode/`, `/akruti-to-unicode/` | Converter pages, each with the editor |
| `/kannada-typing/`, `/english-to-kannada-typing/` | Typing pages, opening in Baraha letters |

Every page also has a markdown mirror at `<page>index.md`. The build writes `llms.txt`, `llms-full.txt` and `robots.txt`, and `sitemap.xml` once a site URL is set.

## Build

Needs Node 24, Rust with the `wasm32-unknown-unknown` target, and the `wasm-bindgen` CLI at the version in kannadi's `Cargo.lock`.

```sh
npm ci
npm run wasm        # builds kannadi-wasm at the commit in kannadi.rev into src/editor/wasm
npm run build       # writes dist/
npm run preview
```

`npm run wasm` clones kannadi into `.kannadi`. Set `KANNADI_DIR` to use an existing checkout at the same commit.

Set `SITE_URL` (for example `https://example.org/` or `https://example.org/kannada/`) to add canonical links, absolute Open Graph images and the sitemap. It stays unset until the domain is chosen.

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
| `scripts/` | wasm build, Open Graph cards, SEO smoke, voice lint |

## License

MIT. The fonts are Noto Sans Kannada and Noto Serif Kannada under the SIL Open Font License (`public/fonts/OFL.txt`).
