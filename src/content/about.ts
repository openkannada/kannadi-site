// Copy for the About page. Strings are trusted HTML.
// "PRASAD:" marks words still to come; once launched, the deploy fails while any remain.
// The Kannada waits for a native reader.
import type { Lang } from "../i18n/core.ts";
import { STORY } from "./story.ts";

const ABOUT_EN = {
  sections: [{ heading: "Why", paragraphs: STORY.en }],
  /** What Open Kannada works on, in the intro's own words, each with its illustration. */
  work: {
    heading: "What we work on",
    items: [
      { illustration: "convert" as const, label: "Converting old documents to Unicode" },
      { illustration: "font" as const, label: "Fonts that draw every letter correctly" },
      { illustration: "spell" as const, label: "Spelling" },
      { illustration: "scan" as const, label: "Reading old printed books with OCR" },
    ],
  },
  /** The people of Open Kannada, in 1 list with 1 layout: a role is a label, never a rank. `photo` names a portrait in src/assets/people. */
  people: [
    { name: "Prasad Subrahmanya", role: "Founding member", url: "https://prasad.tech", site: "prasad.tech", photo: "prasad" as const, alt: "Portrait of Prasad Subrahmanya" },
    { name: "Neha Prasad", role: "Founding member", url: "https://neha-prasad.com/", site: "neha-prasad.com", photo: "neha" as const, alt: "Portrait of Neha Prasad" },
  ],
  dedication: [
    'I dedicate this work to my parents, Veena and Subramanya. They were farmers, and the values and principles they lived by made my sister <a href="https://www.pramodinisubramanya.com/">Pramodini</a> and me who we are today.',
    "And to Neha, my wife, who backs every hour and every bit of money we put into this. She has been my other shoulder throughout.",
  ],
  signature: "Prasad",
  /** The photo beside the dedication, in src/assets/family. The place is left unnamed. */
  family: {
    alt: "The 5 of us standing in front of a carved stone temple tower on a sunny day.",
    caption: "Subramanya, Veena, Pramodini, me and Neha.",
  },
  help: [
    "<b>Have an old Nudi, Baraha or Shree-Lipi file that converts wrongly?</b> Send a short sample. Every fixed case becomes a test.",
    "<b>Read Kannada well?</b> Help check converted text against the original. It turns our results into verified ones.",
    "<b>Design type?</b> Several open Kannada fonts are missing letters and heavier weights.",
  ],
  supporter: '<a href="https://www.luminik.io">DataRavel Inc. (dba Luminik)</a> supports Open Kannada.',
  contact: [
    'Bugs and file samples: open an issue on <a href="https://github.com/openkannada">GitHub</a>. For documents you can\'t share publicly, write to <a href="mailto:support@luminik.io">support@luminik.io</a>.',
    'Press, partnerships and government offices: <a href="mailto:founders@luminik.io">founders@luminik.io</a>.',
    'Security issues: <a href="mailto:prasad@luminik.io">prasad@luminik.io</a>.',
  ],
};

type About = typeof ABOUT_EN;

const ABOUT_KN: About = {
  sections: [{ heading: "ಯಾಕೆ", paragraphs: STORY.kn }],
  work: {
    heading: "ನಾವು ಮಾಡುವ ಕೆಲಸ",
    items: [
      { illustration: "convert", label: "ಹಳೆಯ ದಾಖಲೆಗಳನ್ನು ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಿಸುವುದು" },
      { illustration: "font", label: "ಪ್ರತಿ ಅಕ್ಷರವನ್ನೂ ಸರಿಯಾಗಿ ತೋರಿಸುವ ಫಾಂಟ್‌ಗಳು" },
      { illustration: "spell", label: "ಕಾಗುಣಿತ" },
      { illustration: "scan", label: "ಹಳೆಯ ಮುದ್ರಿತ ಪುಸ್ತಕಗಳನ್ನು OCR ಮೂಲಕ ಓದುವುದು" },
    ],
  },
  people: [
    { name: "ಪ್ರಸಾದ್ ಸುಬ್ರಹ್ಮಣ್ಯ", role: "ಸ್ಥಾಪಕ ಸದಸ್ಯ", url: "https://prasad.tech", site: "prasad.tech", photo: "prasad", alt: "ಪ್ರಸಾದ್ ಸುಬ್ರಹ್ಮಣ್ಯ ಅವರ ಭಾವಚಿತ್ರ" },
    { name: "ನೇಹಾ ಪ್ರಸಾದ್", role: "ಸ್ಥಾಪಕ ಸದಸ್ಯೆ", url: "https://neha-prasad.com/", site: "neha-prasad.com", photo: "neha", alt: "ನೇಹಾ ಪ್ರಸಾದ್ ಅವರ ಭಾವಚಿತ್ರ" },
  ],
  dedication: [
    'ಈ ಕೆಲಸವನ್ನು ನನ್ನ ತಂದೆ ತಾಯಿ, ವೀಣಾ ಮತ್ತು ಸುಬ್ರಮಣ್ಯ ಅವರಿಗೆ ಅರ್ಪಿಸುತ್ತೇನೆ. ಅವರು ರೈತರು. ಅವರು ಬದುಕಿದ ಮೌಲ್ಯಗಳು ಮತ್ತು ತತ್ವಗಳೇ ನನ್ನ ತಂಗಿ <a href="https://www.pramodinisubramanya.com/">ಪ್ರಮೋದಿನಿ</a> ಮತ್ತು ನನ್ನನ್ನು ಇಂದು ಇರುವಂತೆ ರೂಪಿಸಿವೆ.',
    "ಮತ್ತು ನನ್ನ ಪತ್ನಿ ನೇಹಾಗೆ. ಇದಕ್ಕೆ ನಾವು ಕೊಡುವ ಪ್ರತಿ ಗಂಟೆ, ಪ್ರತಿ ರೂಪಾಯಿಯ ಹಿಂದೆ ಅವಳಿದ್ದಾಳೆ. ಇಡೀ ದಾರಿಯಲ್ಲಿ ಅವಳು ನನ್ನ ಇನ್ನೊಂದು ಹೆಗಲಾಗಿದ್ದಾಳೆ.",
  ],
  signature: "ಪ್ರಸಾದ್",
  family: {
    alt: "ಬಿಸಿಲಿನ ದಿನ, ಕೆತ್ತನೆಯ ಕಲ್ಲಿನ ದೇವಾಲಯ ಗೋಪುರದ ಮುಂದೆ ನಿಂತಿರುವ ನಾವು 5 ಜನ.",
    caption: "ಸುಬ್ರಹ್ಮಣ್ಯ, ವೀಣಾ, ಪ್ರಮೋದಿನಿ, ನಾನು ಮತ್ತು ನೇಹಾ.",
  },
  help: [
    "<b>ತಪ್ಪಾಗಿ ಪರಿವರ್ತನೆಯಾಗುವ ಹಳೆಯ ನುಡಿ, ಬರಹ ಅಥವಾ ಶ್ರೀಲಿಪಿ ಫೈಲ್ ನಿಮ್ಮ ಬಳಿ ಇದ್ದರೆ,</b> ಅದರ ಸಣ್ಣ ಭಾಗವನ್ನು ಕಳುಹಿಸಿ. ಸರಿಪಡಿಸಿದ ಪ್ರತಿ ಉದಾಹರಣೆಯೂ ಪರೀಕ್ಷೆಯಾಗಿ ಉಳಿಯುತ್ತದೆ.",
    "<b>ಕನ್ನಡ ಚೆನ್ನಾಗಿ ಓದುವವರಾದರೆ,</b> ಪರಿವರ್ತಿಸಿದ ಪಠ್ಯವನ್ನು ಮೂಲದೊಂದಿಗೆ ಹೋಲಿಸಲು ನೆರವಾಗಿ. ಅದು ನಮ್ಮ ಫಲಿತಾಂಶಗಳನ್ನು ಖಚಿತಪಡಿಸುತ್ತದೆ.",
    "<b>ಅಕ್ಷರವಿನ್ಯಾಸ ಮಾಡುವವರಾದರೆ,</b> ಹಲವು ಮುಕ್ತ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಕೆಲವು ಅಕ್ಷರಗಳು ಮತ್ತು ದಪ್ಪ ತೂಕಗಳು ಇಲ್ಲ. ಅವುಗಳನ್ನು ಸೇರಿಸಲು ನೆರವಾಗಿ.",
  ],
  supporter: '<a href="https://www.luminik.io">DataRavel Inc. (dba Luminik)</a> ಓಪನ್ ಕನ್ನಡಕ್ಕೆ ನೆರವು ನೀಡುತ್ತದೆ.',
  contact: [
    'ದೋಷಗಳು ಮತ್ತು ಫೈಲ್ ಮಾದರಿಗಳಿಗೆ: <a href="https://github.com/openkannada">GitHub</a> ನಲ್ಲಿ ಸಮಸ್ಯೆಯನ್ನು (issue) ದಾಖಲಿಸಿ. ಸಾರ್ವಜನಿಕವಾಗಿ ಹಂಚಿಕೊಳ್ಳಲಾಗದ ದಾಖಲೆಗಳಿಗೆ <a href="mailto:support@luminik.io">support@luminik.io</a> ಗೆ ಬರೆಯಿರಿ.',
    'ಪತ್ರಿಕೆಗಳು, ಸಹಭಾಗಿತ್ವ ಮತ್ತು ಸರ್ಕಾರಿ ಕಚೇರಿಗಳಿಗೆ: <a href="mailto:founders@luminik.io">founders@luminik.io</a>.',
    'ಭದ್ರತಾ ಸಮಸ್ಯೆಗಳಿಗೆ: <a href="mailto:prasad@luminik.io">prasad@luminik.io</a>.',
  ],
};

export const ABOUT: Record<Lang, About> = { en: ABOUT_EN, kn: ABOUT_KN };
