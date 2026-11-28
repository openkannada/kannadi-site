# Licensing

This site is part of Open Kannada. Copyright 2026 The Open Kannada Authors: everyone who has contributed, as listed in the git history.

## What each part is under

| Part | License | Notes |
|---|---|---|
| Code: `src/`, `scripts/`, `worker/`, `infra/`, `design/`, `test/` and the configuration | MIT OR Apache-2.0 | `LICENSE-MIT`, `LICENSE-APACHE`. Choose either. |
| Words we write: page copy in `src/content/` and `src/i18n/`, and the Markdown documents | CC BY 4.0 | `LICENSES/CC-BY-4.0.txt` |
| Images we make: logos, icons, Open Graph cards, screenshots | CC BY 4.0 | The letters in the logos are Noto Sans Kannada outlines, and the Open Graph cards are set in Neha Sans and Noto Sans, all under the SIL Open Font License. Names and logos are also covered by the section below. |
| Photos of the founding members in `src/assets/people/` and of our family in `src/assets/family/` | All rights reserved | `LICENSES/LicenseRef-AllRightsReserved.txt`. Not for reuse without permission. |
| `data/words.tsv` | CC BY-SA 4.0 | See below. |
| Fonts in `src/fonts/` | SIL Open Font License 1.1 | See below. |

`REUSE.toml` records the same thing per path, and `reuse lint` checks that every file is covered.

## Third-party material

- **`data/words.tsv`:** the 30,000 most common words in the article text of Kannada Wikipedia, with their counts. It is derived from the work of Kannada Wikipedia contributors, under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Its header gives the source dump and the changes made. The share-alike terms apply to this file alone. The site credits it in the footer of every page.
- **The typing model, `kn.typing`:** built by `scripts/build-wasm.sh` from the kannadi checkout in `kannadi.rev` and served gzipped with the editor for `?typing=next`; it is not in this repository. It is adapted from Aksharantar (AI4Bharat), the Dakshina lexicons (Google) and Kannada Wikipedia, under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); kannadi's `crates/kannadi-typing/README.md` lists the sources. The share-alike terms apply to that file alone. The brand page credits it.
- **Fonts:** all under the SIL Open Font License 1.1. `public/fonts/OFL.txt` has the license and each font's copyright line.
  - Neha Sans and Neha Serif 1.000, from https://github.com/openkannada/neha-fonts/releases/tag/v1.000: copyright 2022 The Noto Project Authors and 2026 The Open Kannada Authors. They are based on Noto Sans Kannada and Noto Serif Kannada. The files are the release's woff2 files, unchanged.
  - Gari 1.300, from https://github.com/openkannada/gari-font/releases/tag/v1.300: copyright 2026 The Open Kannada Authors, 2011-2012 Aravinda VK and 2005-2010 the Indian Institute of Science, Bangalore, with Reserved Font Name Navilu. The file is the release's woff2 file, unchanged.
  - Noto Sans and Noto Serif Kannada, Latin subsets only: copyright 2022 The Noto Project Authors. The glyphs are unmodified; Fontsource subsets the files, and this site serves them.
  - A test checks each Neha and Gari file against the SHA-256 digest GitHub records for its release asset.

## Names and logos

The licenses above cover copying and changing the work. They grant no rights in the names Open Kannada, kannadi and Neha Sans or in the logos as marks; CC BY 4.0 says so itself, in section 2(b)(1). The names and logos say who made something: anyone may say their work is built with kannadi, and no product, fork or service may present itself as Open Kannada, kannadi or Neha Sans, or use the logos as its own.

Contributors keep the copyright to their work and license it under the project's licenses. The Open Kannada and kannadi names and logos are covered by [TRADEMARKS.md](https://github.com/openkannada/.github/blob/main/TRADEMARKS.md).

## Contact

Requests to remove or credit material: support@luminik.io, until the project has its own address.
