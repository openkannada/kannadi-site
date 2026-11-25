// Copy for the home page around its heading and intro. Strings are trusted HTML. The Kannada waits for a native reader.
import type { Lang } from "../i18n/core.ts";
import type { IconName } from "../icons/icons.ts";
import type { IllustrationName } from "../lib/illustrations.ts";
import { ABOUT } from "./about.ts";
import { STORY } from "./story.ts";

/** The story paragraph that opens "How to help". */
export const HELP_PICK = 7;

export interface ToolCard {
  /** The English page the card links to; the Kannada home links to its twin once it is built. */
  slug: string;
  icon: IconName;
  art: IllustrationName;
  name: string;
  text: string;
  /** Not released yet. */
  soon?: true;
  /** Other pages the card lists under its own. */
  also?: string[];
}

const CONVERTERS = ["unicode-to-nudi", "baraha-to-unicode", "akruti-to-unicode"];

/** 1 of the problems Open Kannada works on: a short name, its 1 number, and 1 or 2 short sentences. */
export interface Problem {
  icon: IconName;
  title: string;
  value: string;
  text: string;
}

/** The icons for the 3 ways to help, in the About page's order: old files, reading, type design. */
const HELP_ICONS: IconName[] = ["legacy", "book", "type"];

/** 1 part of how the work is done. */
export interface Practice {
  icon: IconName;
  title: string;
  text: string;
}

const HOME_EN = {
  story: { heading: "Why", more: 'Read <a href="/about/">the whole story</a>.' },
  why: {
    lead: STORY.en[0]!,
    problems: [
      { icon: "legacy", title: "Old documents", value: "1000s", text: "Government offices typed them in Nudi and Baraha fonts in the 2000s. Search engines can't read them today." },
      { icon: "type", title: "Stacked letters", value: "41 fonts", text: "We test how each draws ottaksharas, Kannada's stacked letters. Many free fonts draw them incorrectly." },
      { icon: "spell", title: "Spell check", value: "2009", text: "The year of the spell checker on most computers." },
      { icon: "chart", title: "AI token tax", value: "8 times", text: "The same sentence can take up to 8 times as many tokens in Kannada as in English." },
    ] as Problem[],
    practiceHeading: "How we work",
    practices: [
      { icon: "check", title: "Test on real text", text: "Every tool is tested on real Kannada documents." },
      { icon: "chart", title: "Publish the results", text: "The numbers and the method are on each tool's page." },
      { icon: "people", title: "Fix it for everyone", text: "We send our fixes to the fonts and programs people already use." },
    ] as Practice[],
  },
  paste: {
    label: "Paste Nudi, Baraha or Akruti text",
    hint: "It opens in the editor, converted to Unicode. Nothing is uploaded.",
    failed: "This browser would not pass the text on. Open the editor and paste it there.",
    button: "Convert in the editor",
    open: "Open the editor",
  },
  tools: {
    heading: "Tools",
    soon: "Coming soon",
    also: "Also",
    items: [
      { slug: "editor", icon: "edit", art: "typing", name: "Editor", text: "Type Kannada in English letters, convert old documents and save Word files, in your browser." },
      { slug: "nudi-to-unicode", icon: "convert", art: "convert", name: "Converters", text: "Nudi, Baraha and Akruti to Unicode, and Unicode back to Nudi.", also: CONVERTERS },
      { slug: "fonts", icon: "type", art: "font", name: "Fonts", text: "Neha Sans, Neha Serif and Gari, 3 open Kannada fonts." },
      { slug: "spell-check", icon: "spell", art: "spell", name: "Spell check", text: "A Hunspell dictionary for LibreOffice and Firefox that accepts 88.9% of the words in Kannada Wikipedia text.", soon: true },
      { slug: "dictionary", icon: "book", art: "dictionary", name: "Dictionary", text: "English to Kannada, with the spellings to read and type each word.", soon: true },
      { slug: "ocr", icon: "scan", art: "scan", name: "OCR", text: "A Tesseract model for Kannada print, especially old print." },
      { slug: "ai-benchmark", icon: "chart", art: "benchmark", name: "AI benchmark", text: "Kannada costs between 1.1 and 8.3 times as many tokens as English." },
    ] as ToolCard[],
  },
  help: { heading: "How to help", intro: STORY.en[HELP_PICK]!, items: ABOUT.en.help, icons: HELP_ICONS, contribute: "How to contribute" },
};

type Home = typeof HOME_EN;

const HOME_KN: Home = {
  story: { heading: "ಯಾಕೆ", more: '<a href="/kn/about/">ಪೂರ್ತಿ ಕಥೆ</a> ಓದಿ.' },
  why: {
    lead: STORY.kn[0]!,
    problems: [
      { icon: "legacy", title: "ಹಳೆಯ ದಾಖಲೆಗಳು", value: "1000ಗಟ್ಟಲೆ", text: "2000ರ ದಶಕದಲ್ಲಿ ಸರ್ಕಾರಿ ಕಚೇರಿಗಳು ಅವನ್ನು ನುಡಿ ಮತ್ತು ಬರಹ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಟೈಪ್ ಮಾಡಿದವು. ಇಂದು ಸರ್ಚ್ ಎಂಜಿನ್‌ಗಳಿಗೆ ಅವನ್ನು ಓದಲು ಆಗುವುದಿಲ್ಲ." },
      { icon: "type", title: "ಒತ್ತಕ್ಷರಗಳು", value: "41 ಫಾಂಟ್‌ಗಳು", text: "ಪ್ರತಿ ಫಾಂಟ್ ಒತ್ತಕ್ಷರಗಳನ್ನು ಹೇಗೆ ತೋರಿಸುತ್ತದೆ ಎಂದು ಪರೀಕ್ಷಿಸುತ್ತೇವೆ. ಹಲವು ಉಚಿತ ಫಾಂಟ್‌ಗಳು ಅವನ್ನು ತಪ್ಪಾಗಿ ತೋರಿಸುತ್ತವೆ." },
      { icon: "spell", title: "ಕಾಗುಣಿತ ಪರೀಕ್ಷೆ", value: "2009", text: "ಹೆಚ್ಚಿನ ಕಂಪ್ಯೂಟರ್‌ಗಳಲ್ಲಿರುವ ಕಾಗುಣಿತ ಪರೀಕ್ಷಕ ಈ ವರ್ಷದ್ದು." },
      { icon: "chart", title: "AI ಟೋಕನ್ ತೆರಿಗೆ", value: "8 ಪಟ್ಟು", text: "ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿರುವ ವಾಕ್ಯವೇ ಕನ್ನಡದಲ್ಲಿ 8 ಪಟ್ಟು ಹೆಚ್ಚು ಟೋಕನ್‌ಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಬಹುದು." },
    ],
    practiceHeading: "ನಾವು ಕೆಲಸ ಮಾಡುವ ರೀತಿ",
    practices: [
      { icon: "check", title: "ನಿಜವಾದ ಪಠ್ಯದ ಮೇಲೆ ಪರೀಕ್ಷೆ", text: "ಪ್ರತಿ ಸಾಧನವನ್ನು ನಿಜವಾದ ಕನ್ನಡ ದಾಖಲೆಗಳ ಮೇಲೆ ಪರೀಕ್ಷಿಸುತ್ತೇವೆ." },
      { icon: "chart", title: "ಫಲಿತಾಂಶಗಳ ಪ್ರಕಟಣೆ", text: "ಅಂಕಿಗಳು ಮತ್ತು ವಿಧಾನ ಪ್ರತಿ ಸಾಧನದ ಪುಟದಲ್ಲಿವೆ." },
      { icon: "people", title: "ಎಲ್ಲರಿಗೂ ತಿದ್ದುಪಡಿ", text: "ಜನರು ಈಗಾಗಲೇ ಬಳಸುತ್ತಿರುವ ಫಾಂಟ್‌ಗಳಿಗೂ ಪ್ರೋಗ್ರಾಂಗಳಿಗೂ ನಮ್ಮ ತಿದ್ದುಪಡಿಗಳನ್ನು ಕಳುಹಿಸುತ್ತೇವೆ." },
    ],
  },
  paste: {
    label: "ನುಡಿ, ಬರಹ ಅಥವಾ ಆಕೃತಿ ಪಠ್ಯವನ್ನು ಅಂಟಿಸಿ",
    hint: "ಅದು ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಾಗಿ ಸಂಪಾದಕದಲ್ಲಿ ತೆರೆಯುತ್ತದೆ. ಏನೂ ಅಪ್‌ಲೋಡ್ ಆಗುವುದಿಲ್ಲ.",
    failed: "ಈ ಬ್ರೌಸರ್ ಪಠ್ಯವನ್ನು ಮುಂದಕ್ಕೆ ಕಳುಹಿಸಲಿಲ್ಲ. ಸಂಪಾದಕವನ್ನು ತೆರೆದು ಅಲ್ಲಿ ಅಂಟಿಸಿ.",
    button: "ಸಂಪಾದಕದಲ್ಲಿ ಪರಿವರ್ತಿಸಿ",
    open: "ಸಂಪಾದಕ ತೆರೆಯಿರಿ",
  },
  tools: {
    heading: "ಸಾಧನಗಳು",
    soon: "ಶೀಘ್ರದಲ್ಲೇ",
    also: "ಇವೂ ಇವೆ",
    items: [
      { slug: "editor", icon: "edit", art: "typing", name: "ಸಂಪಾದಕ", text: "ಇಂಗ್ಲಿಷ್ ಅಕ್ಷರಗಳಲ್ಲಿ ಕನ್ನಡ ಟೈಪ್ ಮಾಡಿ, ಹಳೆಯ ದಾಖಲೆಗಳನ್ನು ಪರಿವರ್ತಿಸಿ, Word ಫೈಲ್‌ಗಳಾಗಿ ಉಳಿಸಿ, ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲೇ." },
      { slug: "nudi-to-unicode", icon: "convert", art: "convert", name: "ಪರಿವರ್ತಕಗಳು", text: "ನುಡಿ, ಬರಹ ಮತ್ತು ಆಕೃತಿಯಿಂದ ಯೂನಿಕೋಡ್‌ಗೆ, ಮತ್ತು ಯೂನಿಕೋಡ್‌ನಿಂದ ಮತ್ತೆ ನುಡಿಗೆ.", also: CONVERTERS },
      { slug: "fonts", icon: "type", art: "font", name: "ಫಾಂಟ್‌ಗಳು", text: "Neha Sans, Neha Serif ಮತ್ತು Gari, 3 ಮುಕ್ತ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳು." },
      { slug: "spell-check", icon: "spell", art: "spell", name: "ಕಾಗುಣಿತ ಪರೀಕ್ಷೆ", text: "ಕನ್ನಡ ವಿಕಿಪೀಡಿಯ ಪಠ್ಯದ 88.9% ಪದಗಳನ್ನು ಒಪ್ಪುವ, LibreOffice ಮತ್ತು Firefox ಗಾಗಿ Hunspell ನಿಘಂಟು.", soon: true },
      { slug: "dictionary", icon: "book", art: "dictionary", name: "ನಿಘಂಟು", text: "ಇಂಗ್ಲಿಷ್‌ನಿಂದ ಕನ್ನಡಕ್ಕೆ, ಪ್ರತಿ ಪದವನ್ನು ಓದಲು ಮತ್ತು ಟೈಪ್ ಮಾಡಲು ಲಿಪ್ಯಂತರದೊಂದಿಗೆ.", soon: true },
      { slug: "ocr", icon: "scan", art: "scan", name: "OCR", text: "ಕನ್ನಡ ಮುದ್ರಣಕ್ಕಾಗಿ, ಅದರಲ್ಲೂ ಹಳೆಯ ಮುದ್ರಣಕ್ಕಾಗಿ, Tesseract ಮಾದರಿ." },
      { slug: "ai-benchmark", icon: "chart", art: "benchmark", name: "AI ಮಾನದಂಡ", text: "ಕನ್ನಡಕ್ಕೆ ಇಂಗ್ಲಿಷ್‌ಗಿಂತ 1.1 ರಿಂದ 8.3 ಪಟ್ಟು ಟೋಕನ್‌ಗಳು ಬೇಕು." },
    ],
  },
  help: { heading: "ನೀವು ಹೇಗೆ ನೆರವಾಗಬಹುದು", intro: STORY.kn[HELP_PICK]!, items: ABOUT.kn.help, icons: HELP_ICONS, contribute: "ಕೊಡುಗೆ ನೀಡುವ ವಿಧಾನ" },
};

export const HOME_COPY: Record<Lang, Home> = { en: HOME_EN, kn: HOME_KN };
