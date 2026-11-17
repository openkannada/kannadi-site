// Copy for the About page, from Prasad's draft. Strings are trusted HTML.
// "PRASAD:" marks words only Prasad can supply; the deploy stops while any remain.

export const ABOUT = {
  sections: [
    {
      heading: "Why",
      paragraphs: [
        "Years of Kannada writing are stuck in old font encodings that computers can't search or read aloud. Many everyday tools still get Kannada wrong: missing letters, broken conjuncts, no spell check. We build the missing pieces, measure them on real text, and fix problems at the source, in the fonts and libraries everyone uses.",
      ],
    },
  ],
  founders: [
    {
      name: "Prasad Subrahmanya",
      url: "https://prasad.tech",
      site: "prasad.tech",
      line: "builds the software. Kannada is his mother tongue.",
    },
    {
      name: "Neha Prasad",
      url: "https://neha-prasad.com/",
      site: "neha-prasad.com",
      line: '<mark class="todo">PRASAD: 1 line on Neha\'s part in Open Kannada, in your words.</mark>',
    },
  ],
  dedication: [
    'I dedicate this work to my parents, Veena and Subramanya. They were farmers, and the values and principles they lived by made my sister <a href="https://www.pramodinisubramanya.com/">Pramodini</a> and me who we are today.',
    "And to Neha, my wife and co-founder, who backs every hour and every bit of money we put into this. She has been my other shoulder throughout.",
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
