// Copy for the contribute page. Strings are trusted HTML. The Kannada waits for a native reader.
import type { Lang } from "../i18n/core.ts";
import { RIGHTS } from "./site.ts";

const REPO = '<a href="https://github.com/openkannada/kannadi">openkannada/kannadi</a>';
const SUPPORT = '<a href="mailto:support@luminik.io">support@luminik.io</a>';
const DCO = '<a href="https://developercertificate.org/">Developer Certificate of Origin</a>';
const SIGNED = "<code>Signed-off-by: Your Name &lt;you@example.com&gt;</code>";

const CONTRIBUTE_EN = {
  sections: [
    {
      heading: "Report a bad conversion",
      paragraphs: [
        `Open an issue on ${REPO} on GitHub with a short sample of the text, the font it was typed in, and what it should read. Every fixed case becomes a test.`,
        `For a document that can't be public, write to ${SUPPORT}.`,
      ],
    },
    {
      heading: "Read Kannada",
      paragraphs: [`If you read Kannada well, help check converted text against the original. It turns our results into verified ones. Write to ${SUPPORT} and say which kinds of text you read.`],
    },
    {
      heading: "Design type",
      paragraphs: [`Several open Kannada fonts are missing letters and heavier weights. If you draw letters, help with <a href="/fonts/">Neha Sans, Neha Serif and Gari</a>, or with the open fonts people already use. Write to ${SUPPORT}.`],
    },
    {
      heading: "Write code",
      paragraphs: [`Send pull requests to ${REPO}, the open-source Rust library behind the editor and its converters. Fixes of 1 word are as welcome as new features.`],
    },
    {
      heading: "Sign off your commits",
      paragraphs: [
        `Open Kannada uses the ${DCO} in place of a contributor agreement. Add a sign-off to each commit with <code>git commit -s</code>. It adds a line such as ${SIGNED}, with your real name and email address.`,
        "The sign-off says that you wrote the change, or have the right to submit it, under the license of the files it touches.",
        RIGHTS.en,
      ],
    },
  ],
};

type Contribute = typeof CONTRIBUTE_EN;

const CONTRIBUTE_KN: Contribute = {
  sections: [
    {
      heading: "ತಪ್ಪು ಪರಿವರ್ತನೆಯನ್ನು ತಿಳಿಸಿ",
      paragraphs: [
        `GitHub ನಲ್ಲಿ ${REPO} ಯಲ್ಲಿ ಸಮಸ್ಯೆಯನ್ನು (issue) ದಾಖಲಿಸಿ. ಪಠ್ಯದ ಸಣ್ಣ ಭಾಗ, ಅದನ್ನು ಟೈಪ್ ಮಾಡಿದ ಫಾಂಟ್, ಮತ್ತು ಅದು ಹೇಗೆ ಓದಬೇಕಿತ್ತು ಎಂಬುದನ್ನು ಸೇರಿಸಿ. ಸರಿಪಡಿಸಿದ ಪ್ರತಿ ಉದಾಹರಣೆಯೂ ಪರೀಕ್ಷೆಯಾಗಿ ಉಳಿಯುತ್ತದೆ.`,
        `ಸಾರ್ವಜನಿಕವಾಗಿ ಹಂಚಿಕೊಳ್ಳಲಾಗದ ದಾಖಲೆಗೆ ${SUPPORT} ಗೆ ಬರೆಯಿರಿ.`,
      ],
    },
    {
      heading: "ಕನ್ನಡ ಓದಿ ನೆರವಾಗಿ",
      paragraphs: [`ಕನ್ನಡ ಚೆನ್ನಾಗಿ ಓದುವವರಾದರೆ, ಪರಿವರ್ತಿಸಿದ ಪಠ್ಯವನ್ನು ಮೂಲದೊಂದಿಗೆ ಹೋಲಿಸಲು ನೆರವಾಗಿ. ಅದು ನಮ್ಮ ಫಲಿತಾಂಶಗಳನ್ನು ಖಚಿತಪಡಿಸುತ್ತದೆ. ನೀವು ಯಾವ ಬಗೆಯ ಪಠ್ಯ ಓದುತ್ತೀರಿ ಎಂದು ${SUPPORT} ಗೆ ಬರೆಯಿರಿ.`],
    },
    {
      heading: "ಅಕ್ಷರವಿನ್ಯಾಸ",
      paragraphs: [`ಹಲವು ಮುಕ್ತ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಕೆಲವು ಅಕ್ಷರಗಳು ಮತ್ತು ದಪ್ಪ ತೂಕಗಳು ಇಲ್ಲ. ನೀವು ಅಕ್ಷರಗಳನ್ನು ಬರೆಯುವವರಾದರೆ, <a href="/fonts/">Neha Sans, Neha Serif ಮತ್ತು Gari</a> ಗೆ, ಅಥವಾ ಜನರು ಈಗಾಗಲೇ ಬಳಸುತ್ತಿರುವ ಮುಕ್ತ ಫಾಂಟ್‌ಗಳಿಗೆ ನೆರವಾಗಿ. ${SUPPORT} ಗೆ ಬರೆಯಿರಿ.`],
    },
    {
      heading: "ಕೋಡ್ ಬರೆಯಿರಿ",
      paragraphs: [`ಸಂಪಾದಕ ಮತ್ತು ಅದರ ಪರಿವರ್ತಕಗಳ ಹಿಂದಿರುವ ಮುಕ್ತ ಮೂಲದ Rust ಲೈಬ್ರರಿ ${REPO} ಗೆ pull request ಕಳುಹಿಸಿ. 1 ಪದದ ತಿದ್ದುಪಡಿಗೂ ಹೊಸ ಸೌಲಭ್ಯಕ್ಕೂ ಒಂದೇ ಸ್ವಾಗತ.`],
    },
    {
      heading: "ನಿಮ್ಮ commit ಗಳಿಗೆ ಸಹಿ ಹಾಕಿ",
      paragraphs: [
        `ಓಪನ್ ಕನ್ನಡ, ಕೊಡುಗೆದಾರರ ಒಪ್ಪಂದದ ಬದಲು ${DCO} ಬಳಸುತ್ತದೆ. ಪ್ರತಿ commit ಗೆ <code>git commit -s</code> ಮೂಲಕ ಸಹಿ ಸೇರಿಸಿ. ಅದು ನಿಮ್ಮ ನಿಜವಾದ ಹೆಸರು ಮತ್ತು ಇಮೇಲ್ ವಿಳಾಸದೊಂದಿಗೆ ${SIGNED} ನಂತಹ ಸಾಲನ್ನು ಸೇರಿಸುತ್ತದೆ.`,
        "ಆ ಬದಲಾವಣೆಯನ್ನು ನೀವೇ ಬರೆದಿದ್ದೀರಿ, ಅಥವಾ ಅದು ತಟ್ಟುವ ಫೈಲ್‌ಗಳ ಲೈಸೆನ್ಸ್ ಅಡಿಯಲ್ಲಿ ಅದನ್ನು ಸಲ್ಲಿಸುವ ಹಕ್ಕು ನಿಮಗಿದೆ ಎಂದು ಈ ಸಹಿ ಹೇಳುತ್ತದೆ.",
        RIGHTS.kn,
      ],
    },
  ],
};

export const CONTRIBUTE: Record<Lang, Contribute> = { en: CONTRIBUTE_EN, kn: CONTRIBUTE_KN };
