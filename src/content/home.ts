// Copy for the home page around its heading and intro. Strings are trusted HTML. The Kannada waits for a native reader.
import type { Lang } from "../i18n/core.ts";
import type { IconName } from "../icons/icons.ts";
import type { IllustrationName } from "../lib/illustrations.ts";
import { ABOUT } from "./about.ts";
import { STORY } from "./story.ts";

/** The story paragraphs the home page shows, chosen from the About page's story without rewording. */
export const STORY_PICK = [0, 1, 3] as const;
/** The story paragraph that opens "How to help". */
export const HELP_PICK = 4;

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

const HOME_EN = {
  story: { heading: "Why", paragraphs: STORY_PICK.map((i) => STORY.en[i]!), more: 'Read <a href="/about/">the whole story</a>.' },
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
      { slug: "fonts", icon: "type", art: "font", name: "Fonts", text: "Neha Sans, Neha Serif and Gari, 3 open Kannada fonts.", soon: true },
      { slug: "spell-check", icon: "spell", art: "spell", name: "Spell check", text: "A Hunspell dictionary for LibreOffice and Firefox that accepts 88.9% of held-out words.", soon: true },
      { slug: "dictionary", icon: "book", art: "dictionary", name: "Dictionary", text: "English to Kannada, with the spellings to read and type each word.", soon: true },
      { slug: "ocr", icon: "scan", art: "scan", name: "OCR", text: "A Tesseract model for Kannada print, especially old print.", soon: true },
      { slug: "ai-benchmark", icon: "chart", art: "benchmark", name: "AI benchmark", text: "Kannada costs between 1.1 and 8.3 times as many tokens as English." },
    ] as ToolCard[],
  },
  help: { heading: "How to help", intro: STORY.en[HELP_PICK]!, items: ABOUT.en.help, contribute: "How to contribute" },
};

type Home = typeof HOME_EN;

const HOME_KN: Home = {
  story: { heading: "ಯಾಕೆ", paragraphs: STORY_PICK.map((i) => STORY.kn[i]!), more: '<a href="/kn/about/">ಪೂರ್ತಿ ಕಥೆ</a> ಓದಿ.' },
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
      { slug: "fonts", icon: "type", art: "font", name: "ಫಾಂಟ್‌ಗಳು", text: "Neha Sans, Neha Serif ಮತ್ತು Gari, 3 ಮುಕ್ತ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳು.", soon: true },
      { slug: "spell-check", icon: "spell", art: "spell", name: "ಕಾಗುಣಿತ ಪರೀಕ್ಷೆ", text: "ಹೊರಗಿಟ್ಟ ಪದಗಳಲ್ಲಿ 88.9% ಅನ್ನು ಒಪ್ಪುವ, LibreOffice ಮತ್ತು Firefox ಗಾಗಿ Hunspell ನಿಘಂಟು.", soon: true },
      { slug: "dictionary", icon: "book", art: "dictionary", name: "ನಿಘಂಟು", text: "ಇಂಗ್ಲಿಷ್‌ನಿಂದ ಕನ್ನಡಕ್ಕೆ, ಪ್ರತಿ ಪದವನ್ನು ಓದಲು ಮತ್ತು ಟೈಪ್ ಮಾಡಲು ಲಿಪ್ಯಂತರದೊಂದಿಗೆ.", soon: true },
      { slug: "ocr", icon: "scan", art: "scan", name: "OCR", text: "ಕನ್ನಡ ಮುದ್ರಣಕ್ಕಾಗಿ, ಅದರಲ್ಲೂ ಹಳೆಯ ಮುದ್ರಣಕ್ಕಾಗಿ, Tesseract ಮಾದರಿ.", soon: true },
      { slug: "ai-benchmark", icon: "chart", art: "benchmark", name: "AI ಮಾನದಂಡ", text: "ಕನ್ನಡಕ್ಕೆ ಇಂಗ್ಲಿಷ್‌ಗಿಂತ 1.1 ರಿಂದ 8.3 ಪಟ್ಟು ಟೋಕನ್‌ಗಳು ಬೇಕು." },
    ],
  },
  help: { heading: "ನೀವು ಹೇಗೆ ನೆರವಾಗಬಹುದು", intro: STORY.kn[HELP_PICK]!, items: ABOUT.kn.help, contribute: "ಕೊಡುಗೆ ನೀಡುವ ವಿಧಾನ" },
};

export const HOME_COPY: Record<Lang, Home> = { en: HOME_EN, kn: HOME_KN };
