// Copy for the names and logos page. Strings are trusted HTML. The Kannada waits for a native reader.
import type { Lang } from "../i18n/core.ts";

const BRAND_EN = {
  sections: [
    {
      heading: "What you may do",
      items: [
        "Use, change and share our code and data under their licenses, in free or paid work, and the fonts we ship under the SIL Open Font License.",
        "Say that your work is built with kannadi or uses Open Kannada data, and link to us.",
        "Use our logos, unchanged, to refer to the project in articles, talks, lists and slides. The files are in the <a href=\"/press/\">press kit</a>.",
      ],
    },
    {
      heading: "What we ask",
      items: [
        "Do not name a product, fork or service Open Kannada, kannadi or Neha Sans, or use our logos as its own. Forks are welcome under a name of their own.",
        "Keep our copyright notices, as every license here requires.",
        "The licenses cover copying and changing the work. They grant no rights in the names or in the logos as marks of this project.",
      ],
    },
    {
      heading: "Licenses",
      items: [
        "Code: MIT OR Apache-2.0, at your choice.",
        "Page copy, documents and the images we make: CC BY 4.0. Credit Open Kannada and link to the page you used.",
        "The word list behind the suggestions, from Kannada Wikipedia: CC BY-SA 4.0.",
        "Fonts: the SIL Open Font License 1.1.",
      ],
    },
  ],
  owner:
    "The licenses and names of Open Kannada belong to the project and its contributors. DataRavel Inc. (dba Luminik) supports the project and holds none of them.",
  removal:
    'To ask for something to be removed or credited, write to <a href="mailto:support@luminik.io">support@luminik.io</a>, the address we use until the project has its own.',
};

type Brand = typeof BRAND_EN;

const BRAND_KN: Brand = {
  sections: [
    {
      heading: "ನೀವು ಏನು ಮಾಡಬಹುದು",
      items: [
        "ನಮ್ಮ ಕೋಡ್ ಮತ್ತು ಡೇಟಾವನ್ನು ಅವುಗಳ ಲೈಸೆನ್ಸ್‌ಗಳ ಅಡಿಯಲ್ಲಿ, ಉಚಿತ ಅಥವಾ ಹಣ ಪಡೆಯುವ ಕೆಲಸದಲ್ಲಿ ಬಳಸಿ, ಬದಲಿಸಿ, ಹಂಚಿಕೊಳ್ಳಿ. ನಾವು ಬಳಸುವ ಫಾಂಟ್‌ಗಳನ್ನು SIL Open Font License ಅಡಿಯಲ್ಲಿ ಬಳಸಿ.",
        "ನಿಮ್ಮ ಕೆಲಸ ಕನ್ನಡಿಯಿಂದ ಮಾಡಿದ್ದು ಅಥವಾ ಓಪನ್ ಕನ್ನಡದ ಡೇಟಾ ಬಳಸುತ್ತದೆ ಎಂದು ಹೇಳಿ, ನಮಗೆ ಲಿಂಕ್ ಕೊಡಿ.",
        "ಲೇಖನಗಳು, ಭಾಷಣಗಳು, ಪಟ್ಟಿಗಳು ಮತ್ತು ಸ್ಲೈಡ್‌ಗಳಲ್ಲಿ ಈ ಯೋಜನೆಯನ್ನು ಉಲ್ಲೇಖಿಸಲು ನಮ್ಮ ಲೋಗೊಗಳನ್ನು ಬದಲಿಸದೆ ಬಳಸಿ. ಫೈಲ್‌ಗಳು <a href=\"/kn/press/\">ಪತ್ರಿಕಾ ಕಿಟ್</a> ನಲ್ಲಿವೆ.",
      ],
    },
    {
      heading: "ನಮ್ಮ ಕೋರಿಕೆ",
      items: [
        "ಯಾವುದೇ ಉತ್ಪನ್ನ, ಫೋರ್ಕ್ ಅಥವಾ ಸೇವೆಗೆ ಓಪನ್ ಕನ್ನಡ, ಕನ್ನಡಿ ಅಥವಾ Neha Sans ಎಂದು ಹೆಸರಿಡಬೇಡಿ, ನಮ್ಮ ಲೋಗೊಗಳನ್ನು ಅದರದ್ದೆಂದು ಬಳಸಬೇಡಿ. ಸ್ವಂತ ಹೆಸರಿನಲ್ಲಿ ಫೋರ್ಕ್‌ಗಳಿಗೆ ಸ್ವಾಗತ.",
        "ಪ್ರತಿ ಲೈಸೆನ್ಸ್ ಕೇಳುವಂತೆ, ನಮ್ಮ ಕೃತಿಸ್ವಾಮ್ಯ ಸೂಚನೆಗಳನ್ನು ಉಳಿಸಿ.",
        "ಲೈಸೆನ್ಸ್‌ಗಳು ಕೃತಿಯನ್ನು ನಕಲಿಸುವುದು ಮತ್ತು ಬದಲಿಸುವುದನ್ನು ಒಳಗೊಳ್ಳುತ್ತವೆ. ಈ ಯೋಜನೆಯ ಗುರುತುಗಳಾಗಿ ಹೆಸರುಗಳು ಅಥವಾ ಲೋಗೊಗಳ ಮೇಲೆ ಅವು ಯಾವ ಹಕ್ಕನ್ನೂ ಕೊಡುವುದಿಲ್ಲ.",
      ],
    },
    {
      heading: "ಲೈಸೆನ್ಸ್‌ಗಳು",
      items: [
        "ಕೋಡ್: MIT OR Apache-2.0, ನಿಮ್ಮ ಆಯ್ಕೆಯಂತೆ.",
        "ಪುಟದ ಬರಹ, ದಾಖಲೆಗಳು ಮತ್ತು ನಾವು ಮಾಡುವ ಚಿತ್ರಗಳು: CC BY 4.0. ಓಪನ್ ಕನ್ನಡವನ್ನು ಉಲ್ಲೇಖಿಸಿ, ನೀವು ಬಳಸಿದ ಪುಟಕ್ಕೆ ಲಿಂಕ್ ಕೊಡಿ.",
        "ಸಲಹೆಗಳ ಹಿಂದಿನ, ಕನ್ನಡ ವಿಕಿಪೀಡಿಯದಿಂದ ಬಂದ ಪದಪಟ್ಟಿ: CC BY-SA 4.0.",
        "ಫಾಂಟ್‌ಗಳು: SIL Open Font License 1.1.",
      ],
    },
  ],
  owner:
    "ಓಪನ್ ಕನ್ನಡದ ಲೈಸೆನ್ಸ್‌ಗಳು ಮತ್ತು ಹೆಸರುಗಳು ಈ ಯೋಜನೆ ಮತ್ತು ಅದರ ಕೊಡುಗೆದಾರರಿಗೆ ಸೇರಿದ್ದು. DataRavel Inc. (dba Luminik) ಯೋಜನೆಗೆ ನೆರವು ನೀಡುತ್ತದೆ, ಆದರೆ ಇವುಗಳಲ್ಲಿ ಯಾವುದನ್ನೂ ಹೊಂದಿಲ್ಲ.",
  removal:
    'ಏನನ್ನಾದರೂ ತೆಗೆಯಲು ಅಥವಾ ಉಲ್ಲೇಖಿಸಲು ಕೇಳಬೇಕಾದರೆ <a href="mailto:support@luminik.io">support@luminik.io</a> ಗೆ ಬರೆಯಿರಿ. ಯೋಜನೆಗೆ ಸ್ವಂತ ವಿಳಾಸ ಬರುವವರೆಗೆ ನಾವು ಇದನ್ನೇ ಬಳಸುತ್ತೇವೆ.',
};

export const BRAND: Record<Lang, Brand> = { en: BRAND_EN, kn: BRAND_KN };
