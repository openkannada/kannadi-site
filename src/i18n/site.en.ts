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
  },
  breadcrumb: "Breadcrumb",
  faq: "Questions",
  footer: {
    madeBy: 'Made by {author} with the open-source {library} library.',
    founded: "Founded by {founders}. Supported by {supporter}.",
    and: " and ",
    credit: "If kannadi helps your project, a mention or a link to {site} is appreciated.",
    words: "Word suggestions use a list of words counted in the articles that {wikipedia} contributors write, shared under {license}.",
    wikipedia: "Kannada Wikipedia",
  },
  about: {
    founders: "Founders",
    dedication: "Dedication",
    supported: "Supported by",
    help: "How you can help",
    contact: "Contact",
  },
  press: {
    story: "Tagline and story",
    logos: "Logos",
    logosIntro: "Open ka is the mark of Open Kannada. The mirror is the mark of kannadi, its editor and library. Each comes as SVG and as a 1024 px PNG, for light and dark backgrounds.",
    logoLight: "{name} logo on a light background",
    logoDark: "{name} logo on a dark background",
    logosNote: "The letters are Noto Sans Kannada, under the SIL Open Font License. Please keep the marks as they are: no new colors, outlines or effects.",
    colors: "Colors",
    descriptions: "Descriptions",
    inWords: "In {n} words",
    founders: "Founders",
    photo: "PRASAD: photo of {name}, from Prasad.",
    screenshots: "Screenshots",
    download: "Download",
    facts: "Facts",
    contact: "Contact",
  },
};

export type SiteStrings = typeof SITE_EN;
