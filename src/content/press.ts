// Copy for the press kit. Strings are trusted HTML.
// "PRASAD:" marks words and photos only Prasad can supply; the deploy stops while any remain.

const KANNADI = "https://github.com/openkannada/kannadi";

/** Descriptions to quote, each within its word count. */
export const DESCRIPTIONS = [
  {
    words: 25,
    text: "Open Kannada makes free, open-source tools for Kannada on computers. Its first, kannadi, converts documents typed in old Kannada fonts to Unicode in the browser.",
  },
  {
    words: 50,
    text: "Open Kannada makes free, open-source software for Kannada. Its first project, kannadi, converts documents typed in 6 old Kannada font layouts, including Nudi, Baraha and Akruti, to Unicode. The editor runs in the browser, so files stay on the device. It also types Kannada from English letters.",
  },
  {
    words: 100,
    text: "Open Kannada makes free, open-source software so that Kannada works properly on computers. Government orders, budgets and newspapers from the 2000s were typed in Nudi, Baraha and other fonts that store glyph codes in place of letters, so they cannot be searched or read aloud. Its first project, kannadi, converts 6 of these font layouts to Unicode, as a Rust library, a command-line tool and an editor that runs in the browser with no upload. Each conversion is measured on real documents. Open Kannada also tests Kannada fonts and adds checks to shared tools, such as Google Fonts' shaperglot.",
  },
] as const;

export const BIOS = [
  {
    name: "Prasad Subrahmanya",
    role: "Co-founder",
    text: "Prasad Subrahmanya builds Open Kannada's software. He is the founder and CEO of Luminik. Before that, he was CTO of Aura at Bain's Founder's Studio, where he took a workforce-analytics platform from concept to $3.6M ARR in 15 months, and co-founder and CTO of Mainteny. He is based in Oslo, Norway.",
    source: "https://prasad.tech",
  },
  {
    name: "Neha Prasad",
    role: "Co-founder",
    text: '<mark class="todo">PRASAD: Neha\'s bio, about 60 words.</mark>',
    source: "https://neha-prasad.com/",
  },
] as const;

/** Facts with the page that shows each one. */
export const FACTS = [
  {
    fact: "kannadi converts 6 legacy Kannada font layouts to Unicode: Nudi, Baraha, Nudi B-Akshara, Kan-Eng, Akruti and Shree-Lipi.",
    source: KANNADI,
    label: "kannadi README",
  },
  {
    fact: "On the benchmark corpus of 207 lines from 31 Karnataka government pages of 2002, all 207 Nudi and Baraha lines match the reviewed output. A Kannada reader's check of 100 lines is in progress.",
    source: `${KANNADI}#measured-results`,
    label: "Measured results",
  },
  {
    fact: "Unicode back to Nudi: 9,029 of 9,047 words from those pages encode to the exact bytes that were typed.",
    source: `${KANNADI}#measured-results`,
    label: "Measured results",
  },
  {
    fact: "Akruti: 908,075 glyphs from 33 Karnataka Acts and Ordinances and 2 budget papers, with 6 unknown glyphs and 22 malformed syllables, each read against the page.",
    source: `${KANNADI}/blob/main/docs/akruti.md`,
    label: "Akruti notes",
  },
  {
    fact: "Shree-Lipi: 233,346 glyphs from 173 Udayavani newspaper pages of 2003 and 2004, with 0 unknown glyphs.",
    source: `${KANNADI}/blob/main/docs/shree-lipi.md`,
    label: "Shree-Lipi notes",
  },
  {
    fact: "Shaping tests for Kannada fonts, with results for 41 fonts.",
    source: `${KANNADI}/tree/main/tools/fontqa`,
    label: "fontqa",
  },
  {
    fact: "Google Fonts' shaperglot now checks every font for Kannada conjuncts and the arkavattu, from checks Open Kannada wrote. Merged on 17 November 2026.",
    source: "https://github.com/googlefonts/shaperglot/pull/192",
    label: "shaperglot pull request 192",
  },
  {
    fact: "The editor runs on the visitor's device with WebAssembly. Files are not uploaded, and the site has no cookies and no analytics.",
    source: "/",
    label: "Editor",
  },
  {
    fact: "The code is open source under the MIT license.",
    source: KANNADI,
    label: "kannadi on GitHub",
  },
] as const;

/** Logo files in public/brand, for download. */
export const LOGOS = [
  { name: "Open Kannada", mark: "open-kannada", files: ["mark-light.svg", "mark-dark.svg", "wordmark-light.svg", "wordmark-dark.svg", "1024-light.png", "1024-dark.png"] },
  { name: "kannadi", mark: "kannadi", files: ["mark-light.svg", "mark-dark.svg", "wordmark-light.svg", "wordmark-dark.svg", "1024-light.png", "1024-dark.png"] },
] as const;

export const COLORS = [
  { name: "Indigo", use: "The tile in light mode, links and buttons", hex: "#4441be" },
  { name: "Periwinkle", use: "The tile in dark mode", hex: "#96a2fc" },
  { name: "Ink", use: "Text in light mode", hex: "#111622" },
  { name: "Paper", use: "The page in light mode", hex: "#f3f6fa" },
  { name: "Night", use: "The page in dark mode", hex: "#0c0e15" },
] as const;

export const SCREENSHOTS = [
  { file: "editor-desktop-light.png", width: 2560, height: 1180, alt: "The editor on a computer in light mode, after pasting 4 lines typed in a Baraha font in 2002. The text is now Unicode Kannada, with 1 unknown glyph and 1 malformed syllable marked." },
  { file: "editor-phone-dark.png", width: 1170, height: 1980, alt: "The same 4 lines in the editor on a phone in dark mode, with the toolbar at the bottom." },
] as const;

export const PHOTOS = ["Prasad Subrahmanya", "Neha Prasad"] as const;

export const CONTACT = '<mark class="todo">PRASAD: press contact, an email address or a form.</mark>';
