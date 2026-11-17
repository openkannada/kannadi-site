// Copy for the About page, from Prasad's draft. Strings are trusted HTML.
// "PRASAD:" marks words only Prasad can supply; the deploy stops while any remain.
import { STORY } from "./story.ts";

export const ABOUT = {
  sections: [{ heading: "Why", paragraphs: STORY }],
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
  /** The people of Open Kannada, in 1 list with 1 layout: a role is a label, never a rank. */
  people: [
    { name: "Prasad Subrahmanya", role: "Founding member", url: "https://prasad.tech", site: "prasad.tech" },
    { name: "Neha Prasad", role: "Founding member", url: "https://neha-prasad.com/", site: "neha-prasad.com" },
  ],
  dedication: [
    'I dedicate this work to my parents, Veena and Subramanya. They were farmers, and the values and principles they lived by made my sister <a href="https://www.pramodinisubramanya.com/">Pramodini</a> and me who we are today.',
    "And to Neha, my wife, who backs every hour and every bit of money we put into this. She has been my other shoulder throughout.",
  ],
  signature: "Prasad",
  help: [
    "<b>Have an old Nudi, Baraha or Shree-Lipi file that converts wrongly?</b> Send a short sample. Every fixed case becomes a test.",
    "<b>Read Kannada well?</b> Help check converted text against the original. It turns our results into verified ones.",
    "<b>Design type?</b> Several open Kannada fonts are missing letters and heavier weights.",
  ],
  supporter: '<a href="https://www.luminik.io">DataRavel Inc. (dba Luminik)</a>, Prasad\'s company, supports Open Kannada.',
  contact: [
    'Bugs and file samples: open an issue on <a href="https://github.com/openkannada">GitHub</a>. For documents you can\'t share publicly, write to <a href="mailto:support@luminik.io">support@luminik.io</a>.',
    'Press, partnerships and government offices: <a href="mailto:founders@luminik.io">founders@luminik.io</a>.',
    'Security issues: <a href="mailto:prasad@luminik.io">prasad@luminik.io</a>.',
  ],
} as const;
