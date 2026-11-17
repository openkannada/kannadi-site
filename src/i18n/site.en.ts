// The site's own words around the pages: header, footer, breadcrumbs, and the About and press kit labels.
// Strings with HTML are trusted; {name} slots are filled in by the components.

export const SITE_EN = {
  skip: "Skip to content",
  nav: {
    pages: "Pages",
    converters: "Converters",
    typing: "Typing and letters",
    allPages: "All pages",
    otherLanguage: "Other pages, in English",
  },
  theme: {
    auto: "Theme: same as system",
    light: "Theme: light",
    dark: "Theme: dark",
    change: "{label}. Change theme",
  },
  language: {
    /** The link to the same page in the other language, written in that language. */
    switchTo: "ಕನ್ನಡ",
    switchLabel: "Read this page in Kannada",
    homeLabel: "The Kannada home page",
  },
  breadcrumb: "Breadcrumb",
  /** The Open Graph image of a tool page. */
  imageAlt: "{from} becomes {to}",
  appName: "kannadi Kannada editor and converter",
  features: [
    "Nudi, Baraha and Akruti to Unicode",
    "Unicode to Nudi and Baraha ANSI",
    "Opens TXT, DOCX and HTML files",
    "Marks unknown glyphs and malformed syllables with fixes",
    "Kannada typing in English letters with word suggestions, Baraha and ISO 15919",
    "Voice typing in Kannada where the browser supports it",
    "Akshara and word counts",
    "Saves DOCX, HTML, TXT and Nudi text",
    "Runs offline in the browser",
  ],
  faq: "Questions",
  footer: {
    madeBy: 'Made by {author} with the open-source {library} library.',
    started: "Started by {founders}. Supported by {supporter}.",
    and: " and ",
    credit: "If kannadi helps your project, a mention or a link to {site} is appreciated.",
    owns: "The licenses and names of {org} belong to the project. {supporter} supports it and holds none of them. Text and images: CC BY 4.0. Code: MIT or Apache-2.0. {names}.",
    names: "Names and logos",
    words: "Word suggestions use a list of words counted in the articles that {wikipedia} contributors write, shared under {license}.",
    wikipedia: "Kannada Wikipedia",
  },
  about: {
    people: "Founding members",
    dedication: "Dedication",
    supported: "Supported by",
    help: "How you can help",
    contact: "Contact",
  },
  brand: {
    owner: "Who holds them",
  },
  press: {
    story: "Tagline and story",
    logos: "Logos",
    logosIntro: "Open ka is the mark of Open Kannada. The mirror is the mark of kannadi, its editor and library. Each comes as SVG and as a 1024 px PNG, for light and dark backgrounds.",
    logoLight: "{name} logo on a light background",
    logoDark: "{name} logo on a dark background",
    logosNote: "The letters are Noto Sans Kannada, under the SIL Open Font License. Please keep the marks as they are: no new colors, outlines or effects. The {names} says how to use them, and the screenshots and text here are CC BY 4.0.",
    namesPage: "names and logos page",
    colors: "Colors",
    descriptions: "Descriptions",
    inWords: "In {n} words",
    people: "Founding members",
    photo: "PRASAD: photo of {name}, from Prasad.",
    screenshots: "Screenshots",
    download: "Download",
    facts: "Facts",
    contact: "Contact",
  },
};

export type SiteStrings = typeof SITE_EN;
