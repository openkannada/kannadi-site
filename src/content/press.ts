// Copy for the press kit. Strings are trusted HTML.
// "PRASAD:" marks words still to come; once launched, the deploy fails while any remain.
// The Kannada waits for a native reader.
import type { Lang } from "../i18n/core.ts";

const KANNADI = "https://github.com/openkannada/kannadi";

/** Descriptions to quote, each within its word count. */
const DESCRIPTIONS = [
  {
    words: 25,
    text: "Open Kannada makes free, open-source tools for Kannada on computers. Its first, kannadi, converts documents typed in old Kannada fonts to Unicode in the browser.",
  },
  {
    words: 50,
    text: "Open Kannada makes free, open-source software for Kannada. Its first project, kannadi, converts documents typed in 6 old Kannada fonts, including Nudi, Baraha and Akruti, to Unicode. The editor runs in the browser, so files stay on the device. It also types Kannada from English letters.",
  },
  {
    words: 100,
    text: "Open Kannada makes free, open-source software so that Kannada works properly on computers. Government orders, budgets and newspapers from the 2000s were typed in Nudi, Baraha and other fonts that store glyph codes in place of letters, so they cannot be searched or read aloud. Its first project, kannadi, converts 6 of these fonts to Unicode, as a Rust library, a command-line tool and an editor that runs in the browser with no upload. Each conversion is measured on real documents. Open Kannada also tests Kannada fonts and adds checks to shared tools, such as Google Fonts' shaperglot.",
  },
];

const BIOS = [
  {
    name: "Prasad Subrahmanya",
    role: "Founding member",
    text: "Prasad Subrahmanya builds Open Kannada's software. He is the founder and CEO of Luminik. Before that, he was CTO of Aura at Bain's Founder's Studio, where he took a workforce-analytics platform from concept to $3.6M ARR in 15 months, and co-founder and CTO of Mainteny. He is based in Oslo, Norway.",
    source: "https://prasad.tech",
  },
  {
    name: "Neha Prasad",
    role: "Founding member",
    text: "Neha Prasad is a founding member of Open Kannada. She is a design engineer in Norway and Lead Designer for CPR Finder at Laerdal Medical. She also founded Niyora, an app for the emotional side of PMS, perimenopause and ADHD. Before that, she was the founding product designer at Infinity Games. She trained as a doctor in India.",
    source: "https://neha-prasad.com/",
  },
];

/** Facts with the page that shows each one. */
const FACTS = [
  {
    fact: "kannadi converts text typed in 6 legacy Kannada fonts to Unicode: Nudi, Baraha, Nudi B-Akshara, Kan-Eng, Akruti and Shree-Lipi.",
    source: KANNADI,
    label: "kannadi README",
  },
  {
    fact: "On the benchmark corpus of 207 lines from 31 Karnataka government pages of 2002, all 207 Nudi and Baraha lines match the reviewed output of the converter, and 1 line is flagged. A Kannada reader's check of 100 lines is in progress.",
    source: `${KANNADI}#measured-results`,
    label: "Measured results",
  },
  {
    fact: "Unicode back to Nudi: 9,029 of 9,047 words from Karnataka government pages of 2002 encode to the exact bytes that were typed.",
    source: `${KANNADI}#measured-results`,
    label: "Measured results",
  },
  {
    fact: "Akruti: 908,075 glyphs from 33 Karnataka Acts and Ordinances and 2 budget papers, with 6 unknown glyphs and 22 malformed syllables, each read against the page.",
    source: `${KANNADI}/blob/main/docs/akruti.md`,
    label: "Akruti notes",
  },
  {
    fact: "Shree-Lipi: 233,346 glyphs from 173 Udayavani newspaper pages of 2003 and 2004, with 0 unknown glyphs and 20 malformed syllables, each read against the text rendered in the font.",
    source: `${KANNADI}/blob/main/docs/shree-lipi.md`,
    label: "Shree-Lipi notes",
  },
  {
    fact: "Shaping tests for Kannada fonts, with results for 41 fonts.",
    source: `${KANNADI}/tree/main/tools/fontqa`,
    label: "fontqa",
  },
  {
    fact: "Google Fonts' shaperglot includes Kannada conjunct and arkavattu checks written by Open Kannada, merged on 17 November 2026.",
    source: "https://github.com/googlefonts/shaperglot/pull/192",
    label: "shaperglot pull request 192",
  },
  {
    fact: "The editor runs on the visitor's device with WebAssembly. Files are not uploaded, and the site has no cookies and no analytics.",
    source: "/editor/",
    label: "Editor",
  },
  {
    fact: "The code is open source under MIT OR Apache-2.0, at your choice.",
    source: KANNADI,
    label: "kannadi on GitHub",
  },
];

/** Logo files in public/brand, for download; `width` is the wordmark at 48 px tall. */
const LOGOS = [
  { name: "Open Kannada", mark: "open-kannada", width: 276, files: ["mark-light.svg", "mark-dark.svg", "wordmark-light.svg", "wordmark-dark.svg", "1024-light.png", "1024-dark.png"] },
  { name: "kannadi", mark: "kannadi", width: 232, files: ["mark-light.svg", "mark-dark.svg", "wordmark-light.svg", "wordmark-dark.svg", "1024-light.png", "1024-dark.png"] },
];

const COLORS = [
  { name: "Indigo", use: "The tile in light mode, links and buttons", hex: "#4441be" },
  { name: "Periwinkle", use: "The tile in dark mode", hex: "#96a2fc" },
  { name: "Ink", use: "Text in light mode", hex: "#111622" },
  { name: "Paper", use: "The page in light mode", hex: "#f3f6fa" },
  { name: "Night", use: "The page in dark mode", hex: "#0c0e15" },
];

const SCREENSHOTS = [
  { file: "editor-desktop-light.png", width: 2560, height: 1180, alt: "The editor on a computer in light mode, after pasting 4 lines typed in a Baraha font in 2002. The text is now Unicode Kannada, with 1 unknown glyph and 1 malformed syllable marked." },
  { file: "editor-phone-dark.png", width: 1170, height: 1980, alt: "The same 4 lines in the editor on a phone in dark mode, with the toolbar at the bottom." },
];

const CONTACT = 'Press, partnerships and government offices: <a href="mailto:founders@luminik.io">founders@luminik.io</a>. Open Kannada is supported by <a href="https://www.luminik.io">DataRavel Inc. (dba Luminik)</a>.';

const PRESS_EN = { descriptions: DESCRIPTIONS, bios: BIOS, facts: FACTS, logos: LOGOS, colors: COLORS, screenshots: SCREENSHOTS, contact: CONTACT };
type Press = typeof PRESS_EN;

const PRESS_KN: Press = {
  descriptions: [
    {
      words: 25,
      text: "ಓಪನ್ ಕನ್ನಡ ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಕನ್ನಡಕ್ಕಾಗಿ ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ಸಾಧನಗಳನ್ನು ಮಾಡುತ್ತದೆ. ಅದರ ಮೊದಲ ಸಾಧನವಾದ ಕನ್ನಡಿ, ಹಳೆಯ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಟೈಪ್ ಮಾಡಿದ ದಾಖಲೆಗಳನ್ನು ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಿಸುತ್ತದೆ.",
    },
    {
      words: 50,
      text: "ಓಪನ್ ಕನ್ನಡ ಕನ್ನಡಕ್ಕಾಗಿ ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ತಂತ್ರಾಂಶವನ್ನು ಮಾಡುತ್ತದೆ. ಅದರ ಮೊದಲ ಯೋಜನೆಯಾದ ಕನ್ನಡಿ, ನುಡಿ, ಬರಹ ಮತ್ತು ಆಕೃತಿ ಸೇರಿದಂತೆ 6 ಹಳೆಯ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಟೈಪ್ ಮಾಡಿದ ದಾಖಲೆಗಳನ್ನು ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಿಸುತ್ತದೆ. ಸಂಪಾದಕ ಬ್ರೌಸರ್‌ನಲ್ಲೇ ನಡೆಯುತ್ತದೆ, ಹೀಗಾಗಿ ಫೈಲ್‌ಗಳು ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ಉಳಿಯುತ್ತವೆ. ಇಂಗ್ಲಿಷ್ ಅಕ್ಷರಗಳಿಂದ ಕನ್ನಡ ಟೈಪ್ ಮಾಡಲೂ ಆಗುತ್ತದೆ.",
    },
    {
      words: 100,
      text: "ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಕನ್ನಡ ಸರಿಯಾಗಿ ಕೆಲಸ ಮಾಡಲೆಂದು ಓಪನ್ ಕನ್ನಡ ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ತಂತ್ರಾಂಶವನ್ನು ಮಾಡುತ್ತದೆ. 2000ರ ದಶಕದ ಸರ್ಕಾರಿ ಆದೇಶಗಳು, ಬಜೆಟ್‌ಗಳು ಮತ್ತು ಪತ್ರಿಕೆಗಳನ್ನು ನುಡಿ, ಬರಹ ಮುಂತಾದ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಟೈಪ್ ಮಾಡಲಾಗಿತ್ತು. ಆ ಫಾಂಟ್‌ಗಳು ಅಕ್ಷರಗಳ ಬದಲು ಗ್ಲಿಫ್ ಸಂಕೇತಗಳನ್ನು ಉಳಿಸುತ್ತವೆ, ಹೀಗಾಗಿ ಆ ದಾಖಲೆಗಳನ್ನು ಹುಡುಕಲೂ ಗಟ್ಟಿಯಾಗಿ ಓದಿಸಲೂ ಆಗುವುದಿಲ್ಲ. ಅದರ ಮೊದಲ ಯೋಜನೆಯಾದ ಕನ್ನಡಿ, ಇಂತಹ 6 ಫಾಂಟ್‌ಗಳನ್ನು ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಿಸುತ್ತದೆ: Rust ಲೈಬ್ರರಿಯಾಗಿ, ಕಮಾಂಡ್ ಲೈನ್ ಸಾಧನವಾಗಿ, ಮತ್ತು ಏನನ್ನೂ ಅಪ್‌ಲೋಡ್ ಮಾಡದೆ ಬ್ರೌಸರ್‌ನಲ್ಲೇ ನಡೆಯುವ ಸಂಪಾದಕವಾಗಿ. ಪ್ರತಿ ಪರಿವರ್ತನೆಯನ್ನು ನಿಜವಾದ ದಾಖಲೆಗಳ ಮೇಲೆ ಅಳೆಯಲಾಗುತ್ತದೆ. ಓಪನ್ ಕನ್ನಡ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳನ್ನೂ ಪರೀಕ್ಷಿಸುತ್ತದೆ, ಮತ್ತು Google Fonts ನ shaperglot ನಂತಹ ಹಂಚಿಕೆಯ ಸಾಧನಗಳಿಗೆ ಪರೀಕ್ಷೆಗಳನ್ನು ಸೇರಿಸುತ್ತದೆ.",
    },
  ],
  bios: [
    {
      name: "ಪ್ರಸಾದ್ ಸುಬ್ರಹ್ಮಣ್ಯ",
      role: "ಸ್ಥಾಪಕ ಸದಸ್ಯ",
      text: "ಪ್ರಸಾದ್ ಸುಬ್ರಹ್ಮಣ್ಯ ಓಪನ್ ಕನ್ನಡದ ತಂತ್ರಾಂಶವನ್ನು ಕಟ್ಟುತ್ತಾರೆ. ಅವರು Luminik ನ ಸ್ಥಾಪಕರು ಮತ್ತು CEO. ಅದಕ್ಕೂ ಮೊದಲು Bain's Founder's Studio ನಲ್ಲಿ Aura ದ CTO ಆಗಿದ್ದರು. ಅಲ್ಲಿ ಕಾರ್ಯಪಡೆ ವಿಶ್ಲೇಷಣೆಯ ವೇದಿಕೆಯೊಂದನ್ನು ಕಲ್ಪನೆಯಿಂದ 15 ತಿಂಗಳಲ್ಲಿ $3.6M ARR ಮಟ್ಟಕ್ಕೆ ಬೆಳೆಸಿದರು. ಅದಕ್ಕೂ ಮೊದಲು Mainteny ಯ ಸಹಸ್ಥಾಪಕರು ಮತ್ತು CTO ಆಗಿದ್ದರು. ಅವರು ನಾರ್ವೆಯ ಓಸ್ಲೋದಲ್ಲಿ ನೆಲೆಸಿದ್ದಾರೆ.",
      source: "https://prasad.tech",
    },
    {
      name: "ನೇಹಾ ಪ್ರಸಾದ್",
      role: "ಸ್ಥಾಪಕ ಸದಸ್ಯೆ",
      text: "ನೇಹಾ ಪ್ರಸಾದ್ ಓಪನ್ ಕನ್ನಡದ ಸ್ಥಾಪಕ ಸದಸ್ಯೆ. ಅವರು ನಾರ್ವೆಯಲ್ಲಿ ಡಿಸೈನ್ ಎಂಜಿನಿಯರ್ ಆಗಿದ್ದು, Laerdal Medical ನಲ್ಲಿ CPR Finder ನ ಲೀಡ್ ಡಿಸೈನರ್. PMS, ಪೆರಿಮೆನೋಪಾಸ್ ಮತ್ತು ADHD ಯ ಭಾವನಾತ್ಮಕ ಅಂಶಗಳಿಗಾಗಿ ರೂಪಿಸಿದ Niyora ಆ್ಯಪ್ ಅನ್ನು ಅವರು ಸ್ಥಾಪಿಸಿದ್ದಾರೆ. ಅದಕ್ಕೂ ಮೊದಲು Infinity Games ನಲ್ಲಿ ಸ್ಥಾಪಕ ಪ್ರಾಡಕ್ಟ್ ಡಿಸೈನರ್ ಆಗಿದ್ದರು. ಅವರು ಭಾರತದಲ್ಲಿ ವೈದ್ಯಕೀಯ ತರಬೇತಿ ಪಡೆದವರು.",
      source: "https://neha-prasad.com/",
    },
  ],
  facts: [
    { fact: "ಕನ್ನಡಿ 6 ಹಳೆಯ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಟೈಪ್ ಮಾಡಿದ ಪಠ್ಯವನ್ನು ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಿಸುತ್ತದೆ: ನುಡಿ, ಬರಹ, ನುಡಿ ಬಿ-ಅಕ್ಷರ, ಕನ್-ಇಂಗ್, ಆಕೃತಿ ಮತ್ತು ಶ್ರೀಲಿಪಿ.", source: KANNADI, label: "ಕನ್ನಡಿ README" },
    { fact: "2002ರ 31 ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಪುಟಗಳಿಂದ ತೆಗೆದ 207 ಸಾಲುಗಳ ಮಾನದಂಡ ಸಂಗ್ರಹದಲ್ಲಿ, ನುಡಿ ಮತ್ತು ಬರಹದ ಎಲ್ಲ 207 ಸಾಲುಗಳು ಪರಿವರ್ತಕದ ಪರಿಶೀಲಿತ ಔಟ್‌ಪುಟ್‌ಗೆ ಹೊಂದುತ್ತವೆ, ಮತ್ತು 1 ಸಾಲನ್ನು ಗುರುತಿಸಲಾಗಿದೆ. 100 ಸಾಲುಗಳನ್ನು ಕನ್ನಡ ಓದುಗರೊಬ್ಬರು ಪರಿಶೀಲಿಸುವ ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ.", source: `${KANNADI}#measured-results`, label: "ಅಳೆದ ಫಲಿತಾಂಶಗಳು" },
    { fact: "ಯೂನಿಕೋಡ್‌ನಿಂದ ಮತ್ತೆ ನುಡಿಗೆ: 2002ರ ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಪುಟಗಳ 9,047 ಪದಗಳಲ್ಲಿ 9,029 ಪದಗಳು, ಮೂಲದಲ್ಲಿ ಟೈಪ್ ಮಾಡಿದ ಬೈಟ್‌ಗಳಿಗೇ ನಿಖರವಾಗಿ ಬದಲಾಗುತ್ತವೆ.", source: `${KANNADI}#measured-results`, label: "ಅಳೆದ ಫಲಿತಾಂಶಗಳು" },
    { fact: "ಆಕೃತಿ: 33 ಕರ್ನಾಟಕ ಕಾಯ್ದೆ ಮತ್ತು ಅಧ್ಯಾದೇಶಗಳು ಹಾಗೂ 2 ಬಜೆಟ್ ದಾಖಲೆಗಳ 908,075 ಗ್ಲಿಫ್‌ಗಳಲ್ಲಿ 6 ಅಪರಿಚಿತ ಗ್ಲಿಫ್‌ಗಳು ಮತ್ತು 22 ತಪ್ಪು ರಚನೆಯ ಅಕ್ಷರಗಳು. ಪ್ರತಿಯೊಂದನ್ನೂ ಮೂಲ ಪುಟದೊಂದಿಗೆ ಓದಿ ನೋಡಲಾಗಿದೆ.", source: `${KANNADI}/blob/main/docs/akruti.md`, label: "ಆಕೃತಿ ಟಿಪ್ಪಣಿಗಳು" },
    { fact: "ಶ್ರೀಲಿಪಿ: 2003 ಮತ್ತು 2004ರ 173 ಉದಯವಾಣಿ ಪತ್ರಿಕೆ ಪುಟಗಳ 233,346 ಗ್ಲಿಫ್‌ಗಳಲ್ಲಿ 0 ಅಪರಿಚಿತ ಗ್ಲಿಫ್‌ಗಳು ಮತ್ತು 20 ತಪ್ಪು ರಚನೆಯ ಅಕ್ಷರಗಳು. ಪ್ರತಿಯೊಂದನ್ನೂ ಫಾಂಟ್‌ನಲ್ಲಿ ಮೂಡಿದ ಪಠ್ಯದೊಂದಿಗೆ ಓದಿ ನೋಡಲಾಗಿದೆ.", source: `${KANNADI}/blob/main/docs/shree-lipi.md`, label: "ಶ್ರೀಲಿಪಿ ಟಿಪ್ಪಣಿಗಳು" },
    { fact: "ಕನ್ನಡ ಫಾಂಟ್‌ಗಳ ಅಕ್ಷರ ಜೋಡಣೆ ಪರೀಕ್ಷೆಗಳು, 41 ಫಾಂಟ್‌ಗಳ ಫಲಿತಾಂಶಗಳೊಂದಿಗೆ.", source: `${KANNADI}/tree/main/tools/fontqa`, label: "fontqa" },
    { fact: "Google Fonts ನ shaperglot ನಲ್ಲಿ ಓಪನ್ ಕನ್ನಡ ಬರೆದ ಒತ್ತಕ್ಷರ ಮತ್ತು ಅರ್ಕಾವೊತ್ತು ಪರೀಕ್ಷೆಗಳಿವೆ. ಅವು 17 ನವೆಂಬರ್ 2026ರಂದು ಸೇರಿದವು.", source: "https://github.com/googlefonts/shaperglot/pull/192", label: "shaperglot ಪುಲ್ ರಿಕ್ವೆಸ್ಟ್ 192" },
    { fact: "ಸಂಪಾದಕ WebAssembly ಮೂಲಕ ಓದುಗರ ಸಾಧನದಲ್ಲೇ ನಡೆಯುತ್ತದೆ. ಫೈಲ್‌ಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡುವುದಿಲ್ಲ, ಮತ್ತು ಸೈಟ್‌ನಲ್ಲಿ ಕುಕೀಗಳಾಗಲಿ ಅನಾಲಿಟಿಕ್ಸ್ ಆಗಲಿ ಇಲ್ಲ.", source: "/kn/", label: "ಸಂಪಾದಕ" },
    { fact: "ಕೋಡ್ MIT ಅಥವಾ Apache-2.0 ಲೈಸೆನ್ಸ್ ಅಡಿಯಲ್ಲಿ ಮುಕ್ತ ಮೂಲ; ಯಾವುದನ್ನಾದರೂ ಆರಿಸಬಹುದು.", source: KANNADI, label: "GitHub ನಲ್ಲಿ ಕನ್ನಡಿ" },
  ],
  logos: [
    { ...LOGOS[0]!, name: "ಓಪನ್ ಕನ್ನಡ" },
    { ...LOGOS[1]!, name: "ಕನ್ನಡಿ" },
  ],
  colors: [
    { name: "ಇಂಡಿಗೊ", use: "ತಿಳಿ ಮೋಡ್‌ನಲ್ಲಿ ಹಿನ್ನೆಲೆ ಚೌಕ, ಲಿಂಕ್‌ಗಳು ಮತ್ತು ಬಟನ್‌ಗಳು", hex: "#4441be" },
    { name: "ತಿಳಿ ನೀಲಿ", use: "ಗಾಢ ಮೋಡ್‌ನಲ್ಲಿ ಹಿನ್ನೆಲೆ ಚೌಕ", hex: "#96a2fc" },
    { name: "ಮಸಿ", use: "ತಿಳಿ ಮೋಡ್‌ನಲ್ಲಿ ಪಠ್ಯ", hex: "#111622" },
    { name: "ಕಾಗದ", use: "ತಿಳಿ ಮೋಡ್‌ನಲ್ಲಿ ಪುಟ", hex: "#f3f6fa" },
    { name: "ರಾತ್ರಿ", use: "ಗಾಢ ಮೋಡ್‌ನಲ್ಲಿ ಪುಟ", hex: "#0c0e15" },
  ],
  screenshots: [
    { ...SCREENSHOTS[0]!, alt: "ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ತಿಳಿ ಮೋಡ್‌ನಲ್ಲಿರುವ ಸಂಪಾದಕ: 2002ರಲ್ಲಿ ಬರಹ ಫಾಂಟ್‌ನಲ್ಲಿ ಟೈಪ್ ಮಾಡಿದ 4 ಸಾಲುಗಳನ್ನು ಅಂಟಿಸಿದ ನಂತರ. ಪಠ್ಯ ಈಗ ಯೂನಿಕೋಡ್ ಕನ್ನಡದಲ್ಲಿದೆ, 1 ಅಪರಿಚಿತ ಗ್ಲಿಫ್ ಮತ್ತು 1 ತಪ್ಪು ರಚನೆಯ ಅಕ್ಷರವನ್ನು ಗುರುತಿಸಲಾಗಿದೆ." },
    { ...SCREENSHOTS[1]!, alt: "ಅದೇ 4 ಸಾಲುಗಳು, ಫೋನ್‌ನಲ್ಲಿ ಗಾಢ ಮೋಡ್‌ನಲ್ಲಿ, ಕೆಳಭಾಗದಲ್ಲಿ ಟೂಲ್‌ಬಾರ್‌ನೊಂದಿಗೆ." },
  ],
  contact: 'ಪತ್ರಿಕೆಗಳು, ಸಹಭಾಗಿತ್ವ ಮತ್ತು ಸರ್ಕಾರಿ ಕಚೇರಿಗಳಿಗೆ: <a href="mailto:founders@luminik.io">founders@luminik.io</a>. ಓಪನ್ ಕನ್ನಡಕ್ಕೆ <a href="https://www.luminik.io">DataRavel Inc. (dba Luminik)</a> ನೆರವು ನೀಡುತ್ತದೆ.',
};

export const PRESS: Record<Lang, Press> = { en: PRESS_EN, kn: PRESS_KN };
