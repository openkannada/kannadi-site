// The 4 converters side by side, for the table on each converter page. Cells are trusted HTML.
import type { Comparison } from "./pages.ts";

export const CONVERTERS_HEADING = "All converters";

export const CONVERTERS: Comparison & { slugs: string[] } = {
  head: ["Converter", "From", "To"],
  slugs: ["nudi-to-unicode", "baraha-to-unicode", "akruti-to-unicode", "unicode-to-nudi"],
  rows: [
    ['<a href="/nudi-to-unicode/">Nudi to Unicode</a>', "Nudi fonts up to version 5", "Unicode"],
    ['<a href="/baraha-to-unicode/">Baraha to Unicode</a>', "Baraha ANSI fonts, such as BRH Kannada", "Unicode"],
    ['<a href="/akruti-to-unicode/">Akruti to Unicode</a>', "Akruti Kannada fonts, such as AkrutiKndPadma", "Unicode"],
    ['<a href="/unicode-to-nudi/">Unicode to Nudi</a>', "Unicode", "Text for Nudi and BRH fonts"],
  ],
};
