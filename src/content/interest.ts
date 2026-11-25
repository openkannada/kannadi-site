// The interest form on the contribute page: whether it takes submissions, its choices and its copy.
// Strings are trusted HTML. The Kannada waits for a native reader.
import type { Lang } from "../i18n/core.ts";

/**
 * Whether the form takes submissions. Closed, it renders disabled and the Worker refuses every submission. Open,
 * it needs the D1 binding in wrangler.jsonc and the Worker secret TURNSTILE_SECRET (see infra/README.md).
 */
export const INTEREST = {
  open: true,
  /** The public Turnstile site key of the openkannada.org widget; its secret is the Worker secret TURNSTILE_SECRET. */
  turnstileSiteKey: "0x4AAAAAAGSFG91KSCqC2D44",
} as const;

/** The ways to help, by the ids stored with each submission, so stored answers read the same in any language. */
export const HELP_AREAS = ["code", "type", "reading", "ocr", "docs", "outreach"] as const;
export const HOURS = ["up-to-5", "5-10", "10-20", "over-20"] as const;
export const KANNADA = ["fluent", "well", "a-little", "not-yet"] as const;

export type HelpArea = (typeof HELP_AREAS)[number];

const GITHUB = '<a href="https://github.com/openkannada">GitHub</a>';
const ISSUES = '<a href="https://github.com/openkannada/kannadi/issues">open an issue</a>';
const PULLS = '<a href="https://github.com/openkannada/kannadi/pulls">send a pull request</a>';
const SUPPORT = '<a href="mailto:support@luminik.io">support@luminik.io</a>';

const INTEREST_EN = {
  heading: "Join us",
  intro: `We build these tools in our spare time, and help is welcome. Tell us how you'd like to help, and we'll write back. You can also ${ISSUES} or ${PULLS} on ${GITHUB} at any time.`,
  expectations: {
    heading: "How we work together",
    items: [
      "Every change is reviewed before it ships.",
      "Whatever tools you use, understand, test and stand behind what you submit.",
      "Small, steady help counts. The people who stay and keep helping matter most.",
    ],
  },
  fields: {
    name: "Name",
    email: "Email",
    place: "Where you're based",
    placeHint: "City and country",
    link: "GitHub or portfolio",
    optional: "optional",
    areas: "How you'd like to help",
    areasHint: "Choose any.",
    experience: "Relevant experience",
    experienceHint: "1 to 3 lines.",
    hours: "Hours a month",
    kannada: "How well you read Kannada",
    consent: "You can email me about helping with Open Kannada.",
  },
  areas: {
    code: "Code: Rust, Python or the web",
    type: "Fonts and type design",
    reading: "Checking Kannada text as a fluent reader",
    ocr: "OCR and data",
    docs: "Documentation and translation",
    outreach: "Outreach and community",
  } satisfies Record<HelpArea, string>,
  hours: { "up-to-5": "Up to 5", "5-10": "5 to 10", "10-20": "10 to 20", "over-20": "More than 20" },
  kannada: { fluent: "Fluently", well: "Well", "a-little": "A little", "not-yet": "Not yet" },
  choose: "Choose",
  areasNeeded: "Choose at least 1 way to help.",
  send: "Send",
  closed: "The form opens soon",
  closedNote: `Until it opens, write to ${SUPPORT}.`,
  sending: "Sending",
  sent: "Thank you. We'll write back.",
  failed: `This did not send. Try again, or write to ${SUPPORT}.`,
  privacy: `We use these details only to reply to you and to plan the work. Only the founding members see them. We keep them until you ask us to delete them; write to ${SUPPORT}.`,
};

type Interest = typeof INTEREST_EN;

const INTEREST_KN: Interest = {
  heading: "ನಮ್ಮೊಂದಿಗೆ ಸೇರಿ",
  intro: `ಈ ಸಾಧನಗಳನ್ನು ನಾವು ಬಿಡುವಿನ ವೇಳೆಯಲ್ಲಿ ಕಟ್ಟುತ್ತಿದ್ದೇವೆ, ನಿಮ್ಮ ನೆರವಿಗೆ ಸ್ವಾಗತ. ನೀವು ಹೇಗೆ ನೆರವಾಗಲು ಬಯಸುತ್ತೀರಿ ಎಂದು ತಿಳಿಸಿ, ನಾವು ಉತ್ತರಿಸುತ್ತೇವೆ. ಯಾವಾಗ ಬೇಕಾದರೂ ${GITHUB} ನಲ್ಲಿ <a href="https://github.com/openkannada/kannadi/issues">issue ದಾಖಲಿಸಬಹುದು</a> ಅಥವಾ <a href="https://github.com/openkannada/kannadi/pulls">pull request ಕಳುಹಿಸಬಹುದು</a>.`,
  expectations: {
    heading: "ನಾವು ಜೊತೆಯಾಗಿ ಕೆಲಸ ಮಾಡುವ ರೀತಿ",
    items: [
      "ಪ್ರತಿ ಬದಲಾವಣೆಯನ್ನು ಬಿಡುಗಡೆಗೆ ಮೊದಲು ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ.",
      "ನೀವು ಯಾವ ಸಾಧನ ಬಳಸಿದರೂ, ನೀವು ಸಲ್ಲಿಸುವುದನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡು, ಪರೀಕ್ಷಿಸಿ, ಅದಕ್ಕೆ ಹೊಣೆಯಾಗಿರಿ.",
      "ಸಣ್ಣ, ನಿರಂತರ ನೆರವೂ ಮುಖ್ಯ. ಉಳಿದು ನೆರವಾಗುತ್ತಲೇ ಇರುವವರು ಎಲ್ಲಕ್ಕಿಂತ ಮುಖ್ಯ.",
    ],
  },
  fields: {
    name: "ಹೆಸರು",
    email: "ಇಮೇಲ್",
    place: "ನೀವು ಇರುವ ಊರು",
    placeHint: "ಊರು ಮತ್ತು ದೇಶ",
    link: "GitHub ಅಥವಾ ಪೋರ್ಟ್‌ಫೋಲಿಯೊ",
    optional: "ಐಚ್ಛಿಕ",
    areas: "ನೀವು ಹೇಗೆ ನೆರವಾಗಲು ಬಯಸುತ್ತೀರಿ",
    areasHint: "ಎಷ್ಟು ಬೇಕಾದರೂ ಆರಿಸಿ.",
    experience: "ಸಂಬಂಧಿಸಿದ ಅನುಭವ",
    experienceHint: "1 ರಿಂದ 3 ಸಾಲು.",
    hours: "ತಿಂಗಳಿಗೆ ಎಷ್ಟು ಗಂಟೆ",
    kannada: "ನೀವು ಕನ್ನಡ ಎಷ್ಟು ಚೆನ್ನಾಗಿ ಓದುತ್ತೀರಿ",
    consent: "ಓಪನ್ ಕನ್ನಡಕ್ಕೆ ನೆರವಾಗುವ ಬಗ್ಗೆ ನೀವು ನನಗೆ ಇಮೇಲ್ ಮಾಡಬಹುದು.",
  },
  areas: {
    code: "ಕೋಡ್: Rust, Python ಅಥವಾ ವೆಬ್",
    type: "ಫಾಂಟ್ ಮತ್ತು ಅಕ್ಷರವಿನ್ಯಾಸ",
    reading: "ಕನ್ನಡ ಪಠ್ಯವನ್ನು ಓದಿ ಪರಿಶೀಲಿಸುವುದು",
    ocr: "OCR ಮತ್ತು ದತ್ತಾಂಶ",
    docs: "ದಸ್ತಾವೇಜು ಮತ್ತು ಅನುವಾದ",
    outreach: "ಜನರನ್ನು ತಲುಪುವುದು ಮತ್ತು ಸಮುದಾಯ",
  },
  hours: { "up-to-5": "5 ರವರೆಗೆ", "5-10": "5 ರಿಂದ 10", "10-20": "10 ರಿಂದ 20", "over-20": "20 ಕ್ಕಿಂತ ಹೆಚ್ಚು" },
  kannada: { fluent: "ಸರಾಗವಾಗಿ", well: "ಚೆನ್ನಾಗಿ", "a-little": "ಸ್ವಲ್ಪ", "not-yet": "ಇನ್ನೂ ಇಲ್ಲ" },
  choose: "ಆರಿಸಿ",
  areasNeeded: "ನೆರವಾಗುವ ಕನಿಷ್ಠ 1 ರೀತಿಯನ್ನು ಆರಿಸಿ.",
  send: "ಕಳುಹಿಸಿ",
  closed: "ಈ ಫಾರ್ಮ್ ಶೀಘ್ರದಲ್ಲೇ ತೆರೆಯುತ್ತದೆ",
  closedNote: `ಅಲ್ಲಿಯವರೆಗೆ ${SUPPORT} ಗೆ ಬರೆಯಿರಿ.`,
  sending: "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ",
  sent: "ಧನ್ಯವಾದ. ನಾವು ಉತ್ತರಿಸುತ್ತೇವೆ.",
  failed: `ಇದು ಕಳುಹಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ, ಅಥವಾ ${SUPPORT} ಗೆ ಬರೆಯಿರಿ.`,
  privacy: `ಈ ವಿವರಗಳನ್ನು ನಿಮಗೆ ಉತ್ತರಿಸಲು ಮತ್ತು ಕೆಲಸವನ್ನು ಯೋಜಿಸಲು ಮಾತ್ರ ಬಳಸುತ್ತೇವೆ. ಸ್ಥಾಪಕ ಸದಸ್ಯರು ಮಾತ್ರ ಅವನ್ನು ನೋಡುತ್ತಾರೆ. ನೀವು ಅಳಿಸಲು ಕೇಳುವವರೆಗೆ ಅವನ್ನು ಇಟ್ಟುಕೊಳ್ಳುತ್ತೇವೆ; ${SUPPORT} ಗೆ ಬರೆಯಿರಿ.`,
};

export const INTEREST_COPY: Record<Lang, Interest> = { en: INTEREST_EN, kn: INTEREST_KN };
