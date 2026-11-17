// Open Kannada's story, approved by Prasad on 17 November 2026. The About page opens with it
// and the press kit carries it as the boilerplate. Strings are trusted HTML.
// The Kannada is a draft for Prasad's read; the Kannada tagline is his.
import type { Lang } from "../i18n/core.ts";

export const TAGLINE: Record<Lang, string> = {
  en: "Kannada should be as easy to use on a computer as English.",
  kn: "ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್‌ನಷ್ಟೇ ಸುಲಭ.",
};

export const STORY: Record<Lang, readonly string[]> = {
  en: [
    "Kannada is my mother tongue. About 44 million people speak it, but many everyday tasks on a computer are still harder in Kannada than in English.",
    "In the 2000s, government offices typed 1000s of documents in Nudi and Baraha fonts, and search engines can't read them today. Many free fonts draw ottaksharas, Kannada's stacked letters, incorrectly. The spell checker on most computers dates from 2009. AI models are trained mostly on internet text, which has little Kannada, and the same sentence takes up to 8 times as many tokens in Kannada as in English.",
    "Each of these problems can be fixed, and most have had very few people working on them.",
    "Open Kannada is free, open-source software that fixes them one at a time. We test every tool on real Kannada text, publish the results, and send our fixes back to the fonts and programs people already use, so everyone benefits, not only our own users.",
    "Neha and I started it together, and it needs more people. If you read, write, type or build in Kannada, you can help.",
  ],
  kn: [
    "ಕನ್ನಡ ನನ್ನ ಮಾತೃಭಾಷೆ. ಸುಮಾರು 4.4 ಕೋಟಿ ಜನ ಕನ್ನಡ ಮಾತನಾಡುತ್ತಾರೆ. ಆದರೂ ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ದಿನನಿತ್ಯದ ಹಲವು ಕೆಲಸಗಳು ಇಂಗ್ಲಿಷ್‌ಗಿಂತ ಕನ್ನಡದಲ್ಲಿ ಇನ್ನೂ ಕಷ್ಟ.",
    "2000ರ ದಶಕದಲ್ಲಿ ಸರ್ಕಾರಿ ಕಚೇರಿಗಳು 1000ಗಟ್ಟಲೆ ದಾಖಲೆಗಳನ್ನು ನುಡಿ ಮತ್ತು ಬರಹ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಟೈಪ್ ಮಾಡಿದವು. ಇಂದು ಸರ್ಚ್ ಎಂಜಿನ್‌ಗಳಿಗೆ ಅವನ್ನು ಓದಲು ಆಗುವುದಿಲ್ಲ. ಹಲವು ಉಚಿತ ಫಾಂಟ್‌ಗಳು ಒತ್ತಕ್ಷರಗಳನ್ನು ತಪ್ಪಾಗಿ ತೋರಿಸುತ್ತವೆ. ಹೆಚ್ಚಿನ ಕಂಪ್ಯೂಟರ್‌ಗಳಲ್ಲಿರುವ ಕಾಗುಣಿತ ಪರೀಕ್ಷಕ 2009ರದ್ದು. AI ಮಾದರಿಗಳು ಹೆಚ್ಚಾಗಿ ಇಂಟರ್ನೆಟ್‌ನ ಪಠ್ಯದಿಂದ ಕಲಿಯುತ್ತವೆ, ಅದರಲ್ಲಿ ಕನ್ನಡ ಕಡಿಮೆ. ಹೀಗಾಗಿ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿರುವ ವಾಕ್ಯವೇ ಕನ್ನಡದಲ್ಲಿ 8 ಪಟ್ಟು ಹೆಚ್ಚು ಟೋಕನ್‌ಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಬಹುದು.",
    "ಈ ಪ್ರತಿ ಸಮಸ್ಯೆಯನ್ನೂ ಸರಿಪಡಿಸಬಹುದು. ಆದರೆ ಇವುಗಳಲ್ಲಿ ಹೆಚ್ಚಿನವುಗಳ ಮೇಲೆ ಕೆಲಸ ಮಾಡಿದವರು ಬಹಳ ಕಡಿಮೆ.",
    "ಓಪನ್ ಕನ್ನಡ (Open Kannada) ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ತಂತ್ರಾಂಶ. ಅದು ಈ ಸಮಸ್ಯೆಗಳನ್ನು ಒಂದೊಂದಾಗಿ ಸರಿಪಡಿಸುತ್ತದೆ. ನಾವು ಪ್ರತಿ ಸಾಧನವನ್ನು ನಿಜವಾದ ಕನ್ನಡ ಪಠ್ಯದ ಮೇಲೆ ಪರೀಕ್ಷಿಸುತ್ತೇವೆ, ಫಲಿತಾಂಶಗಳನ್ನು ಪ್ರಕಟಿಸುತ್ತೇವೆ, ಮತ್ತು ಜನರು ಈಗಾಗಲೇ ಬಳಸುತ್ತಿರುವ ಫಾಂಟ್‌ಗಳಿಗೂ ಪ್ರೋಗ್ರಾಂಗಳಿಗೂ ನಮ್ಮ ತಿದ್ದುಪಡಿಗಳನ್ನು ಕಳುಹಿಸುತ್ತೇವೆ. ಹೀಗಾಗಿ ನಮ್ಮ ಬಳಕೆದಾರರಿಗೆ ಮಾತ್ರವಲ್ಲ, ಎಲ್ಲರಿಗೂ ಉಪಯೋಗ.",
    "ನೇಹಾ ಮತ್ತು ನಾನು ಇದನ್ನು ಜೊತೆಯಾಗಿ ಶುರು ಮಾಡಿದೆವು. ಇದಕ್ಕೆ ಇನ್ನೂ ಹೆಚ್ಚು ಜನ ಬೇಕು. ನೀವು ಕನ್ನಡದಲ್ಲಿ ಓದುವವರು, ಬರೆಯುವವರು, ಟೈಪ್ ಮಾಡುವವರು ಅಥವಾ ತಂತ್ರಾಂಶ ಕಟ್ಟುವವರಾದರೆ, ನೀವೂ ನೆರವಾಗಬಹುದು.",
  ],
};
