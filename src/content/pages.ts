// Copy for every page. Strings are trusted HTML written here; FAQ answers are
// also published as plain text in the FAQPage JSON-LD.

import type { TypingMode } from "../editor/text.ts";
import type { Lang } from "../i18n/core.ts";
import type { IllustrationName } from "../lib/illustrations.ts";
import { TAGLINE } from "./story.ts";
import { CONSONANTS, SIGNS, VOWELS, YOGAVAHAS } from "./letters.ts";

export interface Faq {
  q: string;
  a: string;
}

interface PageBase {
  /** URL path without slashes; "" is the home page. */
  slug: string;
  /** The language the page is written in; English when unset. */
  lang?: "en" | "kn";
  /** The slug of the same page in the other language, once it exists. Both pages must name each other. */
  twin?: string;
  /** Copy that waits for a native reader; the page is left out of the build until the mark is removed. */
  needsReview?: true;
  /** Short name for navigation and breadcrumbs. */
  name: string;
  title: string;
  description: string;
  h1: string;
  /** The answer-first definition under the heading. */
  intro: string;
  faq: Faq[];
  /** The Open Graph card: legacy or Latin text on the left, Kannada on the right. */
  og: { from: string; to: string };
  /** Search terms this page answers, with monthly searches in India (DataForSEO, November 2026). */
  keywords: string;
}

/** A page built around the editor. */
export interface ToolPage extends PageBase {
  kind: "tool";
  /** The line inside the empty editor; trusted HTML. */
  welcome: string;
  mode: TypingMode;
  howTitle: string;
  steps: string[];
  chart?: "letters" | "words";
}

/** A page to read and look things up in, with no editor. */
export interface ReferencePage extends PageBase {
  kind: "reference";
  table: "alphabet" | "kagunita";
}

/** A page about Open Kannada itself, with no editor or chart. */
export interface InfoPage extends PageBase {
  kind: "info";
  body: "about" | "press" | "brand" | "contribute";
}

/** The Open Kannada home page: the tagline, the story in short, the paste box and every tool. */
export interface HomePage extends PageBase {
  kind: "home";
}

/** A measured figure shown large, with what it measures. */
export interface Stat {
  value: string;
  label: string;
}

/** A ratio with its 95% interval, for each thing measured. */
export interface RatioTable {
  rows: { name: string; ratio: number; low: number; high: number }[];
}

/** 1 part of a project page; its heading comes from the site strings, so every project page reads alike. */
export interface ProjectSection {
  id: "what" | "result" | "method" | "limits" | "downloads" | "license";
  paragraphs?: string[];
  items?: string[];
  stats?: Stat[];
  table?: RatioTable;
}

/** A project of Open Kannada beyond the editor: what it does, what it measured, where to get it, its license. */
export interface ProjectPage extends PageBase {
  kind: "project";
  art: IllustrationName;
  /** The schema.org type of what the page is about. */
  schema: "Dataset" | "CreativeWork";
  /** License URLs for the structured data. */
  licenses: string[];
  sections: ProjectSection[];
}

export type Page = ToolPage | ReferencePage | InfoPage | HomePage | ProjectPage;

const PRIVATE: Faq = {
  q: "Is my text uploaded anywhere?",
  a: "No. The converter is compiled to WebAssembly and runs on your device, so your files stay with you. There are no cookies and no analytics. Your last document is kept in this browser so it is still here when you come back.",
};
const CHECKED: Faq = {
  q: "How do I know the conversion is right?",
  a: "Every glyph the converter has no Kannada letter for is marked in the text, and so is every sign that cannot form a Kannada syllable. Select a mark to see what it is and pick a fix. Text with no marks converted cleanly.",
};
const BACK_TO_NUDI: Faq = {
  q: "Can it convert Unicode back to Nudi?",
  a: 'Yes. Choose <b>Save</b>, then <b>Nudi text</b> for a file or <b>Copy as Nudi</b> for Word, and set the result in a Nudi or BRH font. See the <a href="/unicode-to-nudi/">Unicode to Nudi converter</a>.',
};
const OPEN_SOURCE: Faq = {
  q: "Who made this?",
  a: 'Prasad Subrahmanya, on <a href="https://github.com/openkannada/kannadi">kannadi</a>, his open-source Rust library for Kannada text, released under MIT OR Apache-2.0. The fonts are Noto Sans, Noto Sans Kannada and Noto Serif Kannada, under the SIL Open Font License.',
};

const CONVERT_STEPS = [
  "Choose <b>Open</b> and pick the Word, text or web page file, or paste the text. Word and web files keep their fonts, so only the text set in a legacy font is converted.",
  "Look over the marks. Rose is a glyph with no Kannada letter, amber is a sign that cannot form a syllable, and a dashed line is a likely typo, such as <span lang=\"kn\">ರೃ</span> for <span lang=\"kn\">ಋ</span>. Select one, or press <kbd>F8</kbd>, and pick a fix.",
  "Choose <b>Save</b> for a Word file, plain text or a web page.",
];

const TYPING_LINK = '<a href="/english-to-kannada-typing/">English to Kannada typing</a>';

const SOON = "Coming soon.";
const SOON_KN = "ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ.";
const MIT = "https://opensource.org/license/mit";
const APACHE = "https://www.apache.org/licenses/LICENSE-2.0";
const ODBL = "https://opendatacommons.org/licenses/odbl/1-0/";
const CC_BY = "https://creativecommons.org/licenses/by/4.0/";
const OFL = "https://openfontlicense.org/open-font-license-official-text/";

/** Every page, drafts included. */
export const ALL_PAGES: Page[] = [
  {
    slug: "",
    twin: "kn/home",
    kind: "home",
    name: "Home",
    title: "Open Kannada: free, open-source tools for Kannada on computers",
    description:
      "Free, open-source tools so that Kannada works properly on computers: an editor that converts Nudi and Baraha text, fonts, spell check, a dictionary and OCR.",
    h1: TAGLINE.en,
    intro:
      "Open Kannada makes free, open-source tools so that Kannada works properly on computers. The editor and its converters work in your browser today, and the fonts, spell checker, dictionary and OCR are on the way.",
    faq: [],
    og: { from: "Kannada", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "editor",
    twin: "kn",
    kind: "tool",
    name: "Editor",
    title: "Kannada editor and converter: Nudi to Unicode, typing and more",
    description:
      "A free Kannada editor in your browser. Convert Nudi, Baraha and Akruti text to Unicode, fix what did not convert, and type Kannada in English letters.",
    h1: "Kannada editor and converter",
    intro:
      "kannadi is a free Kannada editor that converts text typed in the old Nudi, Baraha and Akruti fonts to Unicode, types Kannada from English letters, and saves Word, web, text and Nudi files, all in your browser.",
    welcome: "Type here, or paste or drop old Nudi, Baraha and Akruti text to get Unicode.",
    mode: "kannada",
    howTitle: "How to use the Kannada editor",
    steps: [
      "Paste text, open a TXT, Word or HTML file, or start typing. Text in old Kannada fonts turns into Unicode by itself.",
      "Fix anything marked: select a mark, or press <kbd>F8</kbd>, and pick a fix.",
      "Choose <b>Save</b> for Word, plain text, a web page, or Nudi text for offices that still use Nudi fonts.",
    ],
    faq: [
      {
        q: "Which fonts does it convert?",
        a: "Nudi 1 to 5, Baraha ANSI fonts such as BRH Kannada, and Akruti Kannada fonts such as AkrutiKndPadma. Text that already shows as Kannada letters is Unicode and needs no conversion.",
      },
      {
        q: "How do I type Kannada with an English keyboard?",
        a: 'Choose <b>English</b> in the toolbar and type words the way they sound: <kbd>namaskara</kbd> gives <span lang="kn">ನಮಸ್ಕಾರ</span>. Other words that sound alike appear above the word; press <kbd>Tab</kbd> or tap one to pick it. For exact spelling, choose <b>Baraha</b>: <kbd>kannaDa</kbd> gives <span lang="kn">ಕನ್ನಡ</span>. Press <kbd>Esc</kbd> to keep a word in English letters.',
      },
      {
        q: "What do Normalize and Modernize do?",
        a: 'Normalize joins vowel signs typed in 2 parts and removes doubled marks, so text that looks the same also searches the same. Modernize changes the Old Kannada letters <span lang="kn">ೞ ಱ ೝ</span> to <span lang="kn">ಳ ರ ನ್</span>.',
      },
      BACK_TO_NUDI,
      PRIVATE,
      CHECKED,
      OPEN_SOURCE,
    ],
    og: { from: "PÀ£ÀßqÀ", to: "ಕನ್ನಡ" },
    keywords: "kannada converter 40,500; kannada unicode 5,400; kannada unicode converter 720",
  },
  {
    slug: "nudi-to-unicode",
    kind: "tool",
    name: "Nudi to Unicode",
    title: "Nudi to Unicode converter: Nudi Kannada text and Word files",
    description:
      "Convert Nudi Kannada text and Word files to Unicode in your browser. Anything that did not convert is marked with a fix, and your files stay on your device.",
    h1: "Nudi to Unicode converter",
    intro:
      'A Nudi to Unicode converter turns Kannada typed in the Nudi fonts, which store Latin symbols such as <code>PÀ£ÀßqÀ</code>, into Unicode Kannada such as <span lang="kn">ಕನ್ನಡ</span> that every phone, website and search engine can read.',
    welcome: "Paste Nudi text or drop a Word file here to get Unicode.",
    mode: "kannada",
    howTitle: "How to convert a Nudi file to Unicode",
    steps: CONVERT_STEPS,
    faq: [
      {
        q: "How do I convert a Nudi Word file to Unicode?",
        a: "Choose <b>Open</b> and pick the file. The editor reads the font of every run of text and converts the parts set in Nudi, Baraha or Akruti fonts. Check the marks, then choose <b>Save</b> and <b>Word document</b>.",
      },
      {
        q: "How can I tell if my text is Nudi or Unicode?",
        a: "Paste a few words into a phone message or a web form. Unicode shows as Kannada letters everywhere. Nudi shows as Latin letters and symbols such as <code>PÀ£ÀßqÀ</code> unless a Nudi font is installed.",
      },
      {
        q: "Can it translate Nudi Kannada to English?",
        a: "It changes how the Kannada is stored, and the words stay Kannada. Once the text is Unicode, translation tools and search engines can read it.",
      },
      BACK_TO_NUDI,
      CHECKED,
      PRIVATE,
    ],
    og: { from: "PÀ£ÀßqÀ", to: "ಕನ್ನಡ" },
    keywords: "nudi to unicode 27,100; nudi to unicode converter 12,100; nudi converter 3,600",
  },
  {
    slug: "unicode-to-nudi",
    kind: "tool",
    name: "Unicode to Nudi",
    title: "Unicode to Nudi converter: Kannada Unicode to Nudi and Baraha",
    description:
      "Convert Unicode Kannada to Nudi and Baraha ANSI font codes in your browser, for the forms, templates and offices that still need Nudi.",
    h1: "Unicode to Nudi converter",
    intro:
      'A Unicode to Nudi converter turns Unicode Kannada such as <span lang="kn">ಕನ್ನಡ</span> into the glyph codes the Nudi and Baraha ANSI fonts use, such as <code>PÀ£ÀßqÀ</code>, for forms, printer templates and office systems that still expect Nudi.',
    welcome: "Paste or type Unicode Kannada here, then choose Save and Copy as Nudi.",
    mode: "kannada",
    howTitle: "How to convert Unicode to Nudi",
    steps: [
      "Paste Unicode Kannada here, open a file, or type it in <b>English</b> letters.",
      "Choose <b>Save</b>, then <b>Copy as Nudi</b> to paste into Word, or <b>Nudi text</b> for a file.",
      "In Word, select the pasted text and choose a Nudi font, such as Nudi 01 e, or a Baraha font, such as BRH Kannada.",
    ],
    faq: [
      {
        q: "Which fonts can show the result?",
        a: "Nudi fonts up to version 5, and Baraha ANSI fonts such as BRH Kannada. They share 1 glyph layout. In any other font the text shows as Latin letters and symbols.",
      },
      {
        q: "What happens to characters Nudi cannot show?",
        a: "Characters with no glyph in the layout, such as English letters and some Old Kannada signs, stay as they were, and the editor says how many. A Nudi font draws English letters as Kannada shapes, so set English text in another font.",
      },
      {
        q: "Will the Nudi text convert back the same?",
        a: "Yes. Well-formed Kannada converts to Nudi and back to the same letters, and the encoder stores text the way typists did: of 9,047 words from 35 Karnataka government pages from 2002, 9,029 encode to the exact bytes that were typed.",
      },
      {
        q: "How do I get Kannada digits?",
        a: "Digits are written as 0 to 9. The Nudi fonts whose names end in k draw them as Kannada digits.",
      },
      PRIVATE,
    ],
    og: { from: "ಕನ್ನಡ", to: "PÀ£ÀßqÀ" },
    keywords: "unicode to nudi 14,800; unicode to nudi converter 8,100",
  },
  {
    slug: "baraha-to-unicode",
    kind: "tool",
    name: "Baraha to Unicode",
    title: "Baraha to Unicode converter: BRH Kannada to Unicode",
    description:
      "Convert Kannada typed in Baraha ANSI fonts such as BRH Kannada to Unicode in your browser. Old government pages and Word files convert whole.",
    h1: "Baraha to Unicode converter",
    intro:
      "A Baraha to Unicode converter turns Kannada typed in Baraha's older ANSI fonts, such as BRH Kannada, into Unicode Kannada that any phone or website can show. Baraha ANSI fonts share the Nudi glyph layout, so 1 converter handles both.",
    welcome: "Paste Baraha text or drop a saved page here to get Unicode.",
    mode: "kannada",
    howTitle: "How to convert Baraha text to Unicode",
    steps: [
      "Save the old page or document, or copy its text. Karnataka government pages from the early 2000s are often set in BRH Kannada.",
      "Choose <b>Open</b> and pick the file, or paste the text. Only the text set in a Baraha or Nudi font is converted.",
      "Fix anything marked, then choose <b>Save</b>.",
    ],
    faq: [
      {
        q: "Which Baraha fonts does it convert?",
        a: "The ANSI fonts whose names start with BRH, such as BRH Kannada. Text typed in a Baraha Unicode font is already Unicode.",
      },
      {
        q: "Old Karnataka government pages look like PÀ£ÀßqÀ. Can I convert them?",
        a: 'Yes. Open the saved page, or copy its text and paste it here. The editor reads the font names in the page and converts only the Kannada parts. Try the 2002 sample in the <a href="/editor/">editor</a> to see it work.',
      },
      {
        q: "Is this the same as Baraha phonetic typing?",
        a: 'This page converts text that was stored in Baraha fonts. To type new Kannada with English letters the Baraha way, see <a href="/english-to-kannada-typing/">English to Kannada typing</a>.',
      },
      BACK_TO_NUDI,
      PRIVATE,
    ],
    og: { from: "¸ÀPÁðj", to: "ಸರ್ಕಾರಿ" },
    keywords: "baraha to unicode 170; baraha 2,900",
  },
  {
    slug: "akruti-to-unicode",
    kind: "tool",
    name: "Akruti to Unicode",
    title: "Akruti to Unicode converter: Akruti Kannada to Unicode",
    description:
      "Convert Kannada typed in Akruti fonts such as AkrutiKndPadma to Unicode in your browser. Word files, web pages and pasted text all work.",
    h1: "Akruti to Unicode converter",
    intro:
      "An Akruti to Unicode converter turns Kannada typed in the Akruti fonts, such as AkrutiKndPadma, into Unicode Kannada. Akruti stores each glyph as a Latin symbol in its own layout, different from Nudi's, and the editor tells the 2 apart by itself.",
    welcome: "Paste Akruti text or drop a Word file here to get Unicode.",
    mode: "kannada",
    howTitle: "How to convert Akruti text to Unicode",
    steps: CONVERT_STEPS,
    faq: [
      {
        q: "Which Akruti fonts does it convert?",
        a: "Akruti's Kannada fonts, such as AkrutiKndPadma and the other AkrutiKnd faces. Akruti fonts for other scripts, such as Devanagari, use different layouts.",
      },
      {
        q: "How does it know whether text is Akruti or Nudi?",
        a: "Word and web files name their fonts, so the editor reads the layout from the font. For pasted text with no font, it converts the text both ways and keeps the reading with fewer problems.",
      },
      {
        q: "My file mixes Akruti, Nudi and English. Will it work?",
        a: "Yes. Each run of text is converted by its own font, and English text in other fonts is left as it is.",
      },
      CHECKED,
      PRIVATE,
    ],
    og: { from: "ÉâdÖËpâ", to: "ಸರ್ಕಾರದ" },
    keywords: "akruti to unicode 2,400; akruti to unicode converter 880; akruti font converter 390",
  },
  {
    slug: "kannada-typing",
    kind: "tool",
    name: "Kannada typing",
    title: "Kannada typing online: type Kannada with an English keyboard",
    description:
      "Type Kannada online with an English or Kannada keyboard. Words turn into Kannada as you type, with a full letter chart. Free, on your phone or computer.",
    h1: "Kannada typing online",
    intro:
      "Kannada typing means writing Kannada script on a computer or phone, either with a Kannada keyboard or by typing words in English letters that turn into Kannada as you go. You can do both here.",
    welcome: 'Type <kbd>kannada</kbd> and it becomes <span lang="kn">ಕನ್ನಡ</span> as you go.',
    mode: "english",
    howTitle: "How to type in Kannada",
    steps: [
      "With a Kannada keyboard on your phone or computer, choose <b>ಕ</b> in the toolbar and type as usual.",
      "Without one, keep <b>English</b> chosen and type each word the way it sounds, then pick the right word from the suggestions. For exact spelling, <b>Baraha</b> follows the chart below.",
      "Check the akshara and word counts under the page, then choose <b>Save</b> or <b>Copy all</b>.",
    ],
    chart: "letters",
    faq: [
      {
        q: "Do I need to install a Kannada keyboard?",
        a: "No. With <b>English</b> chosen, a normal English keyboard is enough. If your phone or computer already has a Kannada keyboard, choose <b>ಕ</b> and type as usual.",
      },
      {
        q: "Can I type Kannada by voice?",
        a: "Yes, in browsers with speech recognition for Kannada, such as Chrome and Edge. The microphone appears in the toolbar where it works: select it and speak in Kannada, and the words appear where the cursor is. Voice typing uses the browser's own speech service, which hears the audio. Everything else on this page stays on your device.",
      },
      {
        q: "How do I type long vowels and hard consonants?",
        a: 'With <b>English</b>, type them the way they sound and pick from the suggestions. With <b>Baraha</b>, use capital letters: <kbd>A</kbd> gives <span lang="kn">ಆ</span>, <kbd>I</kbd> gives <span lang="kn">ಈ</span>, <kbd>T</kbd> gives <span lang="kn">ಟ</span> and <kbd>D</kbd> gives <span lang="kn">ಡ</span>. The chart on this page lists every letter.',
      },
      {
        q: "Can I type Kannada on my phone here?",
        a: "Yes. Phone keyboards that suggest words commit each word with its space, and the word turns into Kannada at that moment.",
      },
      {
        q: "What is ISO 15919?",
        a: "A standard way to write Indian scripts in Latin letters with marks, such as <kbd>kannaḍa</kbd>. Choose <b>ISO</b> if you already type those letters.",
      },
      PRIVATE,
    ],
    og: { from: "kannaDa", to: "ಕನ್ನಡ" },
    keywords: "kannada typing 40,500; type in kannada 40,500; kannada typing online 9,900",
  },
  {
    slug: "english-to-kannada-typing",
    kind: "tool",
    name: "English to Kannada typing",
    title: "English to Kannada typing: type Kannada in English letters",
    description:
      "Type Kannada words in English letters and get Kannada script: namaskara gives ನಮಸ್ಕಾರ, with word suggestions. Free English to Kannada typing in your browser.",
    h1: "English to Kannada typing",
    intro:
      'English to Kannada typing lets you write Kannada words with English letters: type <kbd>namaskara</kbd> and get <span lang="kn">ನಮಸ್ಕಾರ</span>. It spells Kannada words in Kannada script, which is called transliteration.',
    welcome: 'Type a Kannada word the way it sounds: <kbd>namaskara</kbd> becomes <span lang="kn">ನಮಸ್ಕಾರ</span>.',
    mode: "english",
    howTitle: "How to type Kannada in English letters",
    steps: [
      "Keep <b>English</b> chosen in the toolbar. It is already on for this page.",
      'Type a word the way it sounds: <kbd>kannada</kbd> gives <span lang="kn">ಕನ್ನಡ</span>. The word turns into Kannada as you type, and words that sound alike appear above it.',
      "Press space to keep the word, <kbd>Tab</kbd> or a tap to pick another, or <kbd>Esc</kbd> to keep it in English letters.",
      "Choose <b>Save</b> for a Word file, or <b>Copy all</b> to paste the text anywhere.",
    ],
    chart: "words",
    faq: [
      {
        q: "Does it translate English words into Kannada?",
        a: "It writes the sound of a Kannada word in Kannada script. English words stay as they are, so type the Kannada word you mean.",
      },
      {
        q: "Which spelling rules does it use?",
        a: 'With <b>English</b>, none to learn: type the way the word sounds and pick from the suggestions. With <b>Baraha</b>, the Baraha phonetic scheme that many Kannada typists know, where capitals change the letter: <kbd>A</kbd> gives <span lang="kn">ಆ</span>, <kbd>T</kbd> gives <span lang="kn">ಟ</span>, and <kbd>K</kbd> gives <span lang="kn">ಖ</span>. ISO 15919 is there too, for typists who use Latin letters with marks.',
      },
      {
        q: "Where do the word suggestions come from?",
        a: 'From the 30,000 commonest words in <a href="https://kn.wikipedia.org">Kannada Wikipedia</a>, counted from the article text its contributors write. The word list is shared under the CC BY-SA 4.0 license, as the articles are. The editor matches what you type by sound, offers the commonest words first, and remembers the words you pick, on your device.',
      },
      {
        q: "How do I type a conjunct such as ಜ್ಞ or ಕ್ಷ?",
        a: "Type the consonants in order and the editor joins them: <kbd>j~ja</kbd> gives <span lang=\"kn\">ಜ್ಞ</span> and <kbd>kSha</kbd> gives <span lang=\"kn\">ಕ್ಷ</span>. The word list on this page shows more.",
      },
      {
        q: "Can I turn Kannada back into English letters?",
        a: 'The <a href="https://github.com/openkannada/kannadi">kannadi</a> library can, in Baraha, ISO 15919 and IAST spellings.',
      },
      PRIVATE,
    ],
    og: { from: "namaskAra", to: "ನಮಸ್ಕಾರ" },
    keywords: "english to kannada typing 49,500; kannada transliteration 135,000",
  },
  {
    slug: "kannada-alphabet",
    kind: "reference",
    name: "Kannada alphabet",
    title: "Kannada alphabet: vowels, consonants and how to type each letter",
    description:
      "The Kannada alphabet in 1 page: 13 vowels, 2 yogavahas and 34 consonants, each with its Baraha and ISO 15919 spelling, plus Kannada digits.",
    h1: "Kannada alphabet",
    intro:
      'The Kannada alphabet, <span lang="kn">ವರ್ಣಮಾಲೆ</span>, has 49 letters in common use: 13 vowels, 2 yogavahas written <span lang="kn">ಅಂ</span> and <span lang="kn">ಅಃ</span>, and 34 consonants. Each letter below shows how to type it in Baraha letters and how it is written in ISO 15919.',
    table: "alphabet",
    faq: [
      {
        q: "How many letters are in the Kannada alphabet?",
        a: "49 in common use: 13 vowels (<span lang=\"kn\">ಸ್ವರಗಳು</span>), 2 yogavahas (<span lang=\"kn\">ಯೋಗವಾಹಗಳು</span>) and 34 consonants (<span lang=\"kn\">ವ್ಯಂಜನಗಳು</span>). Older lists add letters that are rare today, such as <span lang=\"kn\">ೠ</span>, <span lang=\"kn\">ಌ</span>, <span lang=\"kn\">ೞ</span> and <span lang=\"kn\">ಱ</span>.",
      },
      {
        q: "What are structured and unstructured consonants?",
        a: 'The 25 structured consonants (<span lang="kn">ವರ್ಗೀಯ ವ್ಯಂಜನಗಳು</span>) form 5 groups of 5, by where in the mouth they are said, from <span lang="kn">ಕ</span> at the throat to <span lang="kn">ಪ</span> at the lips. The other 9, from <span lang="kn">ಯ</span> to <span lang="kn">ಳ</span>, are the unstructured consonants (<span lang="kn">ಅವರ್ಗೀಯ ವ್ಯಂಜನಗಳು</span>).',
      },
      {
        q: "What are ಅಂ and ಅಃ?",
        a: 'The anusvara <span lang="kn">ಂ</span> and the visarga <span lang="kn">ಃ</span>, shown on <span lang="kn">ಅ</span>. They follow a vowel sound, as in <span lang="kn">ಕಂ</span> and <span lang="kn">ಕಃ</span>, and are called yogavahas.',
      },
      {
        q: "How do I type these letters?",
        a: 'In the editor, choose <b>Baraha</b> and type the spelling under each letter, such as <kbd>A</kbd> for <span lang="kn">ಆ</span>. To type whole words the way they sound, see '+TYPING_LINK+'.',
      },
      {
        q: "How are consonants and vowels combined?",
        a: 'Each consonant takes a vowel sign: <span lang="kn">ಕ</span> becomes <span lang="kn">ಕಾ</span>, <span lang="kn">ಕಿ</span>, <span lang="kn">ಕೀ</span> and so on. The full table of these is the <a href="/kagunita/">kagunita</a>.',
      },
    ],
    og: { from: "a ā i ka", to: "ಅ ಆ ಇ ಕ" },
    keywords: "kannada alphabet 60,500; kannada letters 60,500",
  },
  {
    slug: "kagunita",
    kind: "reference",
    name: "Kagunita",
    title: "Kannada kagunita chart: every consonant with every vowel sign",
    description:
      "The full Kannada kagunita chart: all 34 consonants with every vowel sign, ಂ, ಃ and the virama, each with its Baraha spelling for typing.",
    h1: "Kannada kagunita",
    intro:
      'The Kannada kagunita, <span lang="kn">ಕಾಗುಣಿತ</span>, is the table of every consonant joined with every vowel sign and the yogavahas: <span lang="kn">ಕ</span>, <span lang="kn">ಕಾ</span>, <span lang="kn">ಕಿ</span>, <span lang="kn">ಕೀ</span> and on to <span lang="kn">ಕಃ</span> and <span lang="kn">ಕ್</span>. The chart below has all 34 consonants, each letter with its Baraha spelling for typing.',
    table: "kagunita",
    faq: [
      {
        q: "What is kagunita?",
        a: 'The table of consonants written with each vowel sign, beginning <span lang="kn">ಕ ಕಾ ಕಿ ಕೀ</span>. Each consonant with a vowel sign is a <span lang="kn">ಗುಣಿತಾಕ್ಷರ</span>; the last column is the consonant alone, <span lang="kn">ಕ್</span>.',
      },
      {
        q: "How many letters are in each row?",
        a: 'This chart has 16: the consonant, the 12 vowel signs, <span lang="kn">ಂ</span>, <span lang="kn">ಃ</span>, and the consonant alone with the virama <span lang="kn">್</span>, as in <span lang="kn">ಕ್</span>.',
      },
      {
        q: "How do I type a kagunita letter?",
        a: 'Choose <b>Baraha</b> in the editor and type the spelling under the letter: <kbd>kA</kbd> gives <span lang="kn">ಕಾ</span> and <kbd>kai</kbd> gives <span lang="kn">ಕೈ</span>. To type whole words the way they sound, see '+TYPING_LINK+'.',
      },
      {
        q: "Where are the vowels on their own?",
        a: 'The vowels, yogavahas and consonants are in the <a href="/kannada-alphabet/">Kannada alphabet</a>.',
      },
    ],
    og: { from: "ka kā ki kī", to: "ಕ ಕಾ ಕಿ ಕೀ" },
    keywords: "kannada kagunita 27,100; kagunita 8,100",
  },
  {
    slug: "fonts",
    twin: "kn/fonts",
    kind: "project",
    name: "Fonts",
    title: "Kannada fonts: Neha Sans, Neha Serif and Gari",
    description:
      "3 open Kannada fonts under the SIL Open Font License: Neha Sans and Neha Serif, built from Noto, and Gari, a handwriting-style font based on Navilu.",
    h1: "Kannada fonts",
    intro:
      "Neha Sans and Neha Serif are Kannada fonts built from Noto Sans Kannada and Noto Serif Kannada by Google, with letters fixed and added. Gari is a handwriting-style font based on Navilu by Aravinda VK.",
    art: "font",
    schema: "CreativeWork",
    licenses: [OFL],
    sections: [
      {
        id: "what",
        items: [
          '<b>Neha Sans</b> and <b>Neha Serif</b> fix <span lang="kn">ರೃ</span>, ra with the vocalic R sign, which Noto drew as <span lang="kn">ಋ</span> with a reph. They also add a first draft of U+0CDC, the Kannada archaic shrii.',
          "They are named for Neha Prasad, a founding member of Open Kannada. Each credits its source, such as “Based on Noto Sans Kannada by Google.”",
          "<b>Gari</b> is a handwriting-style font based on Navilu by Aravinda VK. It adds new-order Kannada shaping and the newer letters U+0CDC, U+0CDD and U+0CF3.",
        ],
      },
      { id: "downloads", paragraphs: [SOON] },
      { id: "license", paragraphs: ["All 3 fonts are under the SIL Open Font License 1.1."] },
    ],
    faq: [],
    og: { from: "Neha Sans", to: "ರೃ" },
    keywords: "",
  },
  {
    slug: "spell-check",
    twin: "kn/spell-check",
    kind: "project",
    name: "Spell check",
    title: "Kannada spell check: a Hunspell dictionary for LibreOffice and Firefox",
    description:
      "A Kannada Hunspell dictionary that accepts 88.9% of held-out Wikipedia words, against 65.7% for hunspell-kn 1.0.3, the dictionary Fedora ships, from 2009.",
    h1: "Kannada spell check",
    intro:
      "A Kannada Hunspell dictionary for LibreOffice and Firefox, with an analyzer, a stemmer and sound-alike keys generated from the same paradigm rules.",
    art: "spell",
    schema: "CreativeWork",
    licenses: [MIT, APACHE, ODBL, CC_BY],
    sections: [
      {
        id: "what",
        paragraphs: [
          "The dictionary checks Kannada spelling in LibreOffice and Firefox. The analyzer, the stemmer and the sound-alike keys are generated from the same paradigm rules as the dictionary.",
        ],
      },
      {
        id: "result",
        paragraphs: ["It accepts 88.9% of held-out words. hunspell-kn 1.0.3, the dictionary Fedora ships, from 2009, accepts 65.7%."],
        stats: [
          { value: "88.9%", label: "Open Kannada kn_IN" },
          { value: "65.7%", label: "hunspell-kn 1.0.3, from 2009" },
        ],
      },
      {
        id: "method",
        paragraphs: [
          "Every 10th article of the Kannada Wikipedia dump of 1 November 2026 is held out, 2.2 million words, and the dictionaries are built from the other articles.",
        ],
      },
      { id: "downloads", paragraphs: [SOON] },
      {
        id: "license",
        items: [
          "Code: MIT OR Apache-2.0.",
          "The dictionary, <code>kn_IN</code>: ODbL-1.0, derived from Alar by V. Krishna.",
          "The Wikipedia word list: CC BY 4.0.",
        ],
      },
    ],
    faq: [],
    og: { from: "ಬಾಷೆ", to: "ಭಾಷೆ" },
    keywords: "",
  },
  {
    slug: "dictionary",
    twin: "kn/dictionary",
    kind: "project",
    name: "Dictionary",
    title: "English to Kannada dictionary: Kannada words, spellings and meanings",
    description:
      "An English to Kannada dictionary with 1 page per English word: Kannada words with ISO 15919 and Baraha spellings, part of speech and meanings from Alar.",
    h1: "English to Kannada dictionary",
    intro:
      "An English to Kannada dictionary, with 1 page per English word. Each page gives the Kannada words with their ISO 15919 and Baraha spellings, the part of speech, and meanings drawn from the Alar dictionary.",
    art: "dictionary",
    schema: "CreativeWork",
    licenses: [ODBL, MIT],
    sections: [
      {
        id: "what",
        paragraphs: [
          'Look up an English word, such as <i>water</i>, and its page lists the Kannada words for it, such as <span lang="kn">ನೀರು</span>, each with its ISO 15919 spelling, <kbd>nīru</kbd>, and the Baraha spelling to type it, <kbd>nIru</kbd>. The meanings come from the Alar dictionary by V. Krishna.',
        ],
      },
      { id: "downloads", paragraphs: [SOON] },
      { id: "license", items: ["Data: ODbL-1.0.", "Code: MIT."] },
    ],
    faq: [],
    og: { from: "water", to: "ನೀರು" },
    keywords: "",
  },
  {
    slug: "ocr",
    twin: "kn/ocr",
    kind: "project",
    name: "OCR",
    title: "Kannada OCR: a Tesseract model for old Kannada print",
    description:
      "A Tesseract model for Kannada print. On old printed books it reads 6.0% of characters wrong, against 8.7% for stock Tesseract.",
    h1: "Kannada OCR",
    intro:
      "A fine-tuned Tesseract model for Kannada print, especially old print, with a benchmark of 4 sets to measure how well it reads.",
    art: "scan",
    schema: "CreativeWork",
    licenses: [MIT, APACHE],
    sections: [
      {
        id: "what",
        paragraphs: [
          "OCR turns a scanned page into text you can search, copy and edit. This model is Tesseract, trained further on Kannada print, especially old print.",
        ],
      },
      {
        id: "result",
        paragraphs: ["The share of characters read wrong, lower is better, for version 0.2 of the model against stock Tesseract for Kannada:"],
        items: [
          "Old printed books, 60 Wikisource pages: 6.0%, against 8.7%.",
          "Degraded words, 400: 17.0%, against 24.4%.",
          "MILE pages from IISc, 30: 5.4%, against 7.3%.",
          "MILE lines from IISc, 600: 2.8%, against 3.8%.",
        ],
      },
      {
        id: "method",
        items: ["Tesseract fine-tuned on Wikisource lines and on synthetic lines in openly licensed fonts, with the character error rate measured on held-out samples on 18 November 2026."],
      },
      { id: "downloads", paragraphs: [SOON] },
      { id: "license", items: ["Code: MIT OR Apache-2.0.", "The model: Apache-2.0."] },
    ],
    faq: [],
    og: { from: "Print", to: "ಕನ್ನಡ ಪುಸ್ತಕ" },
    keywords: "",
  },
  {
    slug: "ai-benchmark",
    twin: "kn/ai-benchmark",
    kind: "project",
    name: "AI benchmark",
    title: "The Kannada token tax: what Kannada costs in AI tokenizers",
    description:
      "The same text costs between 1.1 and 8.3 times as many tokens in Kannada as in English, measured on 960 professionally translated segments.",
    h1: "The Kannada token tax",
    intro:
      "The token tax is how many tokens Kannada text costs compared with the same text in English. In public tokenizers, Kannada costs between 1.1 and 8.3 times as many.",
    art: "benchmark",
    schema: "Dataset",
    licenses: [CC_BY],
    sections: [
      {
        id: "what",
        paragraphs: [
          "AI models read and write text as tokens. This benchmark counts the tokens that public tokenizers spend on Kannada text and on the same text in English. The result is a ratio, Kannada tokens per English token: at 2, the Kannada text takes twice as many tokens.",
        ],
      },
      {
        id: "result",
        paragraphs: [
          "Kannada costs between 1.1 and 8.3 times as many tokens as English, depending on the tokenizer. The benchmark covers 12 distinct tokenizers; the table shows 7 of them, with the 95% interval of each ratio.",
        ],
        table: {
          rows: [
            { name: "cl100k", ratio: 8.27, low: 8.06, high: 8.48 },
            { name: "Qwen 2.5", ratio: 6.52, low: 6.37, high: 6.68 },
            { name: "Kimi", ratio: 3.42, low: 3.35, high: 3.5 },
            { name: "o200k", ratio: 1.83, low: 1.8, high: 1.87 },
            { name: "Gemma 4", ratio: 1.7, low: 1.65, high: 1.74 },
            { name: "Sarvam", ratio: 1.35, low: 1.32, high: 1.38 },
            { name: "Sarvam-1", ratio: 1.14, low: 1.12, high: 1.17 },
          ],
        },
      },
      {
        id: "method",
        items: [
          "960 English segments from WMT24++, with professional Kannada translations, from 170 documents.",
          "23,778 Kannada words and 32,262 English words.",
          "Tokens are counted without special tokens.",
          "The 95% intervals come from resampling whole documents.",
          "Measured on 16 November 2026.",
        ],
      },
      {
        id: "limits",
        items: [
          "All the text comes from 1 source.",
          "Tokens are not price.",
          "Claude and Gemini are not measured, because their tokenizers are not public.",
          "Llama 3.1, Llama 4, Gemma 3 and Tiny Aya are not measured, because their tokenizers are gated.",
        ],
      },
      { id: "downloads", paragraphs: ["The test suite is coming soon."] },
      { id: "license", paragraphs: ["The results: CC BY 4.0."] },
    ],
    faq: [],
    og: { from: "English", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "about",
    twin: "kn/about",
    kind: "info",
    name: "About",
    title: "About Open Kannada: free, open-source tools for Kannada",
    description:
      "Open Kannada makes free, open-source tools so that Kannada works properly on computers: conversion of old documents, typing, fonts, spelling and OCR.",
    h1: "About Open Kannada",
    intro:
      "Open Kannada makes free, open-source tools so that Kannada works properly on computers. That covers converting old documents to Unicode, typing in Kannada, fonts that draw every letter correctly, spelling, and reading old printed books with OCR. Everything is free to use, and the code is open for anyone to read, check and improve.",
    body: "about",
    faq: [],
    og: { from: "Kannada", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "contribute",
    twin: "kn/contribute",
    kind: "info",
    name: "Contribute",
    title: "Contribute to Open Kannada: conversions, reading, type and code",
    description:
      "How to help Open Kannada: report a bad conversion, check Kannada text, draw letters for open fonts, or send code to kannadi on GitHub.",
    h1: "Contribute",
    intro:
      "Open Kannada needs people who read, write, type and build in Kannada. Here is how to help, from a fix of 1 word to a new font.",
    body: "contribute",
    faq: [],
    og: { from: "Help", to: "ನೆರವು" },
    keywords: "",
  },
  {
    slug: "press",
    twin: "kn/press",
    kind: "info",
    name: "Press kit",
    title: "Open Kannada press kit: logos, descriptions and facts",
    description:
      "Logos, colors, short descriptions, bios of the founding members, screenshots and sourced facts about Open Kannada and kannadi, for articles and talks.",
    h1: "Press kit",
    intro:
      "Logos, descriptions, bios, screenshots and facts about Open Kannada and its first project, the kannadi editor. Use them as they are, with no need to ask.",
    body: "press",
    faq: [],
    og: { from: "Open Kannada", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "brand",
    twin: "kn/brand",
    kind: "info",
    name: "Brand",
    title: "Open Kannada names and logos: how to refer to the project",
    description:
      "Anyone may say their work is built with kannadi. Here is how to use the Open Kannada and kannadi names and logos, and which license covers each part.",
    h1: "Names and logos",
    intro:
      "Anyone may use our code and data, and the fonts we ship, under their licenses, and say that their work is built with kannadi. The names and logos say who made something, so they stay with this project.",
    body: "brand",
    faq: [],
    og: { from: "kannadi", to: "ಕನ್ನಡಿ" },
    keywords: "",
  },
  // Kannada pages, each the twin of an English page.
  {
    slug: "kn",
    lang: "kn",
    twin: "editor",
    kind: "tool",
    name: "ಸಂಪಾದಕ",
    title: "ಕನ್ನಡ ಸಂಪಾದಕ ಮತ್ತು ಪರಿವರ್ತಕ: ನುಡಿಯಿಂದ ಯೂನಿಕೋಡ್, ಟೈಪಿಂಗ್ ಮತ್ತು ಇನ್ನಷ್ಟು",
    description:
      "ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಉಚಿತ ಕನ್ನಡ ಸಂಪಾದಕ. ನುಡಿ, ಬರಹ, ಆಕೃತಿ ಪಠ್ಯವನ್ನು ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಿಸಿ, ಉಳಿದ ದೋಷಗಳನ್ನು ಸರಿಪಡಿಸಿ, ಇಂಗ್ಲಿಷ್ ಅಕ್ಷರಗಳಲ್ಲಿ ಕನ್ನಡ ಟೈಪ್ ಮಾಡಿ.",
    h1: "ಕನ್ನಡ ಸಂಪಾದಕ ಮತ್ತು ಪರಿವರ್ತಕ",
    intro:
      "ಕನ್ನಡಿ ಉಚಿತ ಕನ್ನಡ ಸಂಪಾದಕ: ಹಳೆಯ ನುಡಿ, ಬರಹ ಮತ್ತು ಆಕೃತಿ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ಟೈಪ್ ಮಾಡಿದ ಪಠ್ಯವನ್ನು ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಿಸುತ್ತದೆ, ಇಂಗ್ಲಿಷ್ ಅಕ್ಷರಗಳಿಂದ ಕನ್ನಡ ಟೈಪ್ ಮಾಡಿಸುತ್ತದೆ, ಮತ್ತು Word, ವೆಬ್, ಪಠ್ಯ ಹಾಗೂ ನುಡಿ ಫೈಲ್‌ಗಳಾಗಿ ಉಳಿಸುತ್ತದೆ, ಎಲ್ಲವೂ ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲೇ.",
    welcome: "ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ, ಅಥವಾ ಹಳೆಯ ನುಡಿ, ಬರಹ, ಆಕೃತಿ ಪಠ್ಯವನ್ನು ಅಂಟಿಸಿ ಇಲ್ಲವೇ ಇಲ್ಲಿಗೆ ಎಳೆದು ಬಿಡಿ. ಯೂನಿಕೋಡ್ ಸಿಗುತ್ತದೆ.",
    mode: "kannada",
    howTitle: "ಕನ್ನಡ ಸಂಪಾದಕವನ್ನು ಬಳಸುವ ವಿಧಾನ",
    steps: [
      "ಪಠ್ಯವನ್ನು ಅಂಟಿಸಿ, TXT, Word ಅಥವಾ HTML ಫೈಲ್ ತೆರೆಯಿರಿ, ಇಲ್ಲವೇ ಟೈಪ್ ಮಾಡಲು ಶುರು ಮಾಡಿ. ಹಳೆಯ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳ ಪಠ್ಯ ತಾನಾಗಿಯೇ ಯೂನಿಕೋಡ್ ಆಗುತ್ತದೆ.",
      "ಗುರುತಿಸಿದ್ದನ್ನು ಸರಿಪಡಿಸಿ: ಗುರುತನ್ನು ಆರಿಸಿ, ಅಥವಾ <kbd>F8</kbd> ಒತ್ತಿ, ಸರಿಪಡಿಕೆಯನ್ನು ಆರಿಸಿ.",
      "Word, ಸಾದಾ ಪಠ್ಯ, ವೆಬ್ ಪುಟ, ಅಥವಾ ಇನ್ನೂ ನುಡಿ ಫಾಂಟ್ ಬಳಸುವ ಕಚೇರಿಗಳಿಗಾಗಿ ನುಡಿ ಪಠ್ಯವಾಗಿ ಉಳಿಸಲು <b>ಉಳಿಸು</b> ಆರಿಸಿ.",
    ],
    faq: [
      {
        q: "ಇದು ಯಾವ ಫಾಂಟ್‌ಗಳನ್ನು ಪರಿವರ್ತಿಸುತ್ತದೆ?",
        a: "ನುಡಿ 1 ರಿಂದ 5, BRH Kannada ಮುಂತಾದ ಬರಹ ANSI ಫಾಂಟ್‌ಗಳು, ಮತ್ತು AkrutiKndPadma ಮುಂತಾದ ಆಕೃತಿ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳು. ಈಗಾಗಲೇ ಕನ್ನಡ ಅಕ್ಷರಗಳಾಗಿ ಕಾಣುವ ಪಠ್ಯ ಯೂನಿಕೋಡ್‌ನಲ್ಲೇ ಇದೆ, ಅದಕ್ಕೆ ಪರಿವರ್ತನೆ ಬೇಕಿಲ್ಲ.",
      },
      {
        q: "ಇಂಗ್ಲಿಷ್ ಕೀಬೋರ್ಡ್‌ನಲ್ಲಿ ಕನ್ನಡ ಟೈಪ್ ಮಾಡುವುದು ಹೇಗೆ?",
        a: 'ಟೂಲ್‌ಬಾರ್‌ನಲ್ಲಿ <b>ಇಂಗ್ಲಿಷ್</b> ಆರಿಸಿ, ಪದಗಳು ಕೇಳಿಸುವಂತೆಯೇ ಟೈಪ್ ಮಾಡಿ: <kbd>namaskara</kbd> ಎಂದರೆ ನಮಸ್ಕಾರ. ಅದೇ ರೀತಿ ಕೇಳಿಸುವ ಬೇರೆ ಪದಗಳು ಪದದ ಮೇಲೆ ಕಾಣುತ್ತವೆ; ಬೇಕಾದದ್ದನ್ನು ಆರಿಸಲು <kbd>Tab</kbd> ಒತ್ತಿ ಅಥವಾ ಅದನ್ನು ತಟ್ಟಿ. ನಿಖರವಾದ ಕಾಗುಣಿತಕ್ಕೆ <b>ಬರಹ</b> ಆರಿಸಿ: <kbd>kannaDa</kbd> ಎಂದರೆ ಕನ್ನಡ. ಪದವನ್ನು ಇಂಗ್ಲಿಷ್ ಅಕ್ಷರಗಳಲ್ಲೇ ಉಳಿಸಲು <kbd>Esc</kbd> ಒತ್ತಿ.',
      },
      {
        q: "ಏಕರೂಪಗೊಳಿಸು ಮತ್ತು ಆಧುನಿಕಗೊಳಿಸು ಏನು ಮಾಡುತ್ತವೆ?",
        a: "ಏಕರೂಪಗೊಳಿಸು, 2 ಭಾಗಗಳಾಗಿ ಟೈಪ್ ಮಾಡಿದ ಸ್ವರಚಿಹ್ನೆಗಳನ್ನು ಜೋಡಿಸುತ್ತದೆ ಮತ್ತು 2 ಸಲ ಬಂದ ಗುರುತುಗಳನ್ನು ತೆಗೆಯುತ್ತದೆ. ಹೀಗಾಗಿ ನೋಡಲು ಒಂದೇ ರೀತಿ ಇರುವ ಪಠ್ಯ ಹುಡುಕಾಟದಲ್ಲೂ ಒಂದೇ ಆಗುತ್ತದೆ. ಆಧುನಿಕಗೊಳಿಸು, ಹಳಗನ್ನಡದ ೞ ಱ ೝ ಅಕ್ಷರಗಳನ್ನು ಳ ರ ನ್ ಆಗಿ ಬದಲಿಸುತ್ತದೆ.",
      },
      {
        q: "ಯೂನಿಕೋಡ್ ಪಠ್ಯವನ್ನು ಮತ್ತೆ ನುಡಿಗೆ ಬದಲಿಸಬಹುದೇ?",
        a: 'ಹೌದು. <b>ಉಳಿಸು</b> ಆರಿಸಿ, ಫೈಲ್‌ಗಾಗಿ <b>ನುಡಿ ಪಠ್ಯ</b>, ಅಥವಾ Word ಗಾಗಿ <b>ನುಡಿಯಾಗಿ ನಕಲಿಸು</b> ಆರಿಸಿ. ನಂತರ ಅದನ್ನು ನುಡಿ ಅಥವಾ BRH ಫಾಂಟ್‌ನಲ್ಲಿ ಹಾಕಿ. <a href="/unicode-to-nudi/" lang="en">Unicode to Nudi</a> ಪರಿವರ್ತಕವನ್ನೂ ನೋಡಿ.',
      },
      {
        q: "ನನ್ನ ಪಠ್ಯ ಎಲ್ಲಿಗಾದರೂ ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತದೆಯೇ?",
        a: "ಇಲ್ಲ. ಪರಿವರ್ತಕ WebAssembly ಆಗಿ ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ನಡೆಯುತ್ತದೆ, ಹೀಗಾಗಿ ನಿಮ್ಮ ಫೈಲ್‌ಗಳು ನಿಮ್ಮ ಬಳಿಯೇ ಉಳಿಯುತ್ತವೆ. ಕುಕೀಗಳಿಲ್ಲ, ಅನಾಲಿಟಿಕ್ಸ್ ಇಲ್ಲ. ನಿಮ್ಮ ಕೊನೆಯ ದಾಖಲೆ ಈ ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಉಳಿಯುತ್ತದೆ, ಹೀಗಾಗಿ ಮತ್ತೆ ಬಂದಾಗಲೂ ಅದು ಇಲ್ಲೇ ಇರುತ್ತದೆ.",
      },
      {
        q: "ಪರಿವರ್ತನೆ ಸರಿಯಾಗಿದೆ ಎಂದು ತಿಳಿಯುವುದು ಹೇಗೆ?",
        a: "ಪರಿವರ್ತಕಕ್ಕೆ ಕನ್ನಡ ಅಕ್ಷರ ಸಿಗದ ಪ್ರತಿ ಗ್ಲಿಫ್ ಅನ್ನೂ, ಕನ್ನಡ ಅಕ್ಷರವಾಗಲಾರದ ಪ್ರತಿ ಚಿಹ್ನೆಯನ್ನೂ ಪಠ್ಯದಲ್ಲಿ ಗುರುತಿಸಲಾಗುತ್ತದೆ. ಗುರುತನ್ನು ಆರಿಸಿದರೆ ಅದು ಏನು ಎಂದು ಕಾಣುತ್ತದೆ, ಸರಿಪಡಿಕೆಯನ್ನು ಆರಿಸಬಹುದು. ಗುರುತುಗಳಿಲ್ಲದ ಪಠ್ಯ ಸರಿಯಾಗಿ ಪರಿವರ್ತನೆಯಾಗಿದೆ.",
      },
      {
        q: "ಇದನ್ನು ಮಾಡಿದವರು ಯಾರು?",
        a: 'ಪ್ರಸಾದ್ ಸುಬ್ರಹ್ಮಣ್ಯ, ಕನ್ನಡ ಪಠ್ಯಕ್ಕಾಗಿ ಅವರು ಬರೆದ ಮುಕ್ತ ಮೂಲದ Rust ಲೈಬ್ರರಿ <a href="https://github.com/openkannada/kannadi">ಕನ್ನಡಿ</a> ಯನ್ನು ಬಳಸಿ. ಅದು MIT ಅಥವಾ Apache-2.0 ಲೈಸೆನ್ಸ್ ಅಡಿಯಲ್ಲಿದೆ. ಫಾಂಟ್‌ಗಳು Noto Sans, Noto Sans Kannada ಮತ್ತು Noto Serif Kannada, SIL Open Font License ಅಡಿಯಲ್ಲಿ.',
      },
    ],
    og: { from: "PÀ£ÀßqÀ", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "kn/about",
    lang: "kn",
    twin: "about",
    kind: "info",
    name: "ನಮ್ಮ ಬಗ್ಗೆ",
    title: "ಓಪನ್ ಕನ್ನಡದ ಬಗ್ಗೆ: ಕನ್ನಡಕ್ಕಾಗಿ ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ಸಾಧನಗಳು",
    description:
      "ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಕನ್ನಡ ಸರಿಯಾಗಿ ಕೆಲಸ ಮಾಡಲೆಂದು ಓಪನ್ ಕನ್ನಡ ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ಸಾಧನಗಳನ್ನು ಮಾಡುತ್ತದೆ: ಹಳೆಯ ದಾಖಲೆಗಳ ಪರಿವರ್ತನೆ, ಟೈಪಿಂಗ್, ಫಾಂಟ್‌ಗಳು, ಕಾಗುಣಿತ, OCR.",
    h1: "ಓಪನ್ ಕನ್ನಡದ ಬಗ್ಗೆ",
    intro:
      "ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಕನ್ನಡ ಸರಿಯಾಗಿ ಕೆಲಸ ಮಾಡಲೆಂದು ಓಪನ್ ಕನ್ನಡ ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ಸಾಧನಗಳನ್ನು ಮಾಡುತ್ತದೆ. ಹಳೆಯ ದಾಖಲೆಗಳನ್ನು ಯೂನಿಕೋಡ್‌ಗೆ ಬದಲಿಸುವುದು, ಕನ್ನಡದಲ್ಲಿ ಟೈಪ್ ಮಾಡುವುದು, ಪ್ರತಿ ಅಕ್ಷರವನ್ನೂ ಸರಿಯಾಗಿ ತೋರಿಸುವ ಫಾಂಟ್‌ಗಳು, ಕಾಗುಣಿತ, ಮತ್ತು ಹಳೆಯ ಮುದ್ರಿತ ಪುಸ್ತಕಗಳನ್ನು OCR ಮೂಲಕ ಓದುವುದು ಇದರಲ್ಲಿ ಸೇರಿವೆ. ಎಲ್ಲವನ್ನೂ ಉಚಿತವಾಗಿ ಬಳಸಬಹುದು, ಮತ್ತು ಕೋಡ್ ಯಾರು ಬೇಕಾದರೂ ಓದಲು, ಪರಿಶೀಲಿಸಲು ಮತ್ತು ಸುಧಾರಿಸಲು ತೆರೆದಿದೆ.",
    body: "about",
    faq: [],
    og: { from: "Kannada", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "kn/press",
    lang: "kn",
    twin: "press",
    kind: "info",
    name: "ಪತ್ರಿಕಾ ಕಿಟ್",
    title: "ಓಪನ್ ಕನ್ನಡ ಪತ್ರಿಕಾ ಕಿಟ್: ಲೋಗೊಗಳು, ಪರಿಚಯಗಳು ಮತ್ತು ಮಾಹಿತಿ",
    description:
      "ಲೇಖನಗಳು ಮತ್ತು ಭಾಷಣಗಳಿಗಾಗಿ ಓಪನ್ ಕನ್ನಡ ಮತ್ತು ಕನ್ನಡಿಯ ಲೋಗೊಗಳು, ಬಣ್ಣಗಳು, ಸಣ್ಣ ಪರಿಚಯಗಳು, ಸ್ಥಾಪಕ ಸದಸ್ಯರ ಪರಿಚಯ, ಸ್ಕ್ರೀನ್‌ಶಾಟ್‌ಗಳು ಮತ್ತು ಆಧಾರ ಸಹಿತ ಮಾಹಿತಿ.",
    h1: "ಪತ್ರಿಕಾ ಕಿಟ್",
    intro:
      "ಓಪನ್ ಕನ್ನಡ ಮತ್ತು ಅದರ ಮೊದಲ ಯೋಜನೆಯಾದ ಕನ್ನಡಿ ಸಂಪಾದಕದ ಲೋಗೊಗಳು, ಪರಿಚಯಗಳು, ಸ್ಥಾಪಕ ಸದಸ್ಯರ ಪರಿಚಯ, ಸ್ಕ್ರೀನ್‌ಶಾಟ್‌ಗಳು ಮತ್ತು ಮಾಹಿತಿ. ಇವನ್ನು ಇದ್ದಂತೆಯೇ, ಕೇಳದೆಯೇ ಬಳಸಿ.",
    body: "press",
    faq: [],
    og: { from: "Open Kannada", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "kn/brand",
    lang: "kn",
    twin: "brand",
    kind: "info",
    name: "ಹೆಸರುಗಳು ಮತ್ತು ಲೋಗೊಗಳು",
    title: "ಓಪನ್ ಕನ್ನಡದ ಹೆಸರುಗಳು ಮತ್ತು ಲೋಗೊಗಳು: ಯೋಜನೆಯನ್ನು ಉಲ್ಲೇಖಿಸುವ ವಿಧಾನ",
    description:
      "ತಮ್ಮ ಕೆಲಸ ಕನ್ನಡಿಯಿಂದ ಮಾಡಿದ್ದು ಎಂದು ಯಾರು ಬೇಕಾದರೂ ಹೇಳಬಹುದು. ಓಪನ್ ಕನ್ನಡ ಮತ್ತು ಕನ್ನಡಿಯ ಹೆಸರು, ಲೋಗೊಗಳನ್ನು ಬಳಸುವ ರೀತಿ ಮತ್ತು ಯಾವ ಭಾಗಕ್ಕೆ ಯಾವ ಲೈಸೆನ್ಸ್ ಎಂಬುದು ಇಲ್ಲಿದೆ.",
    h1: "ಹೆಸರುಗಳು ಮತ್ತು ಲೋಗೊಗಳು",
    intro:
      "ನಮ್ಮ ಕೋಡ್, ಡೇಟಾ ಮತ್ತು ನಾವು ಬಳಸುವ ಫಾಂಟ್‌ಗಳನ್ನು ಅವುಗಳ ಲೈಸೆನ್ಸ್‌ಗಳ ಅಡಿಯಲ್ಲಿ ಯಾರು ಬೇಕಾದರೂ ಬಳಸಬಹುದು, ಮತ್ತು ತಮ್ಮ ಕೆಲಸ ಕನ್ನಡಿಯಿಂದ ಮಾಡಿದ್ದು ಎಂದು ಹೇಳಬಹುದು. ಹೆಸರುಗಳು ಮತ್ತು ಲೋಗೊಗಳು ಯಾರು ಮಾಡಿದ್ದು ಎಂದು ಹೇಳುತ್ತವೆ, ಹೀಗಾಗಿ ಅವು ಈ ಯೋಜನೆಯಲ್ಲೇ ಉಳಿಯುತ್ತವೆ.",
    body: "brand",
    faq: [],
    og: { from: "kannadi", to: "ಕನ್ನಡಿ" },
    keywords: "",
  },
  // Drafts that wait for a native reader. Once read, the Kannada home takes /kn/ and the Kannada editor moves to /kn/editor/.
  {
    slug: "kn/home",
    lang: "kn",
    twin: "",
    needsReview: true,
    kind: "home",
    name: "ಮುಖಪುಟ",
    title: "ಓಪನ್ ಕನ್ನಡ: ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಕನ್ನಡಕ್ಕಾಗಿ ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ಸಾಧನಗಳು",
    description:
      "ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಕನ್ನಡ ಸರಿಯಾಗಿ ಕೆಲಸ ಮಾಡಲು ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ಸಾಧನಗಳು: ನುಡಿ ಮತ್ತು ಬರಹ ಪಠ್ಯವನ್ನು ಪರಿವರ್ತಿಸುವ ಸಂಪಾದಕ, ಫಾಂಟ್‌ಗಳು, ಕಾಗುಣಿತ ಪರೀಕ್ಷೆ, ನಿಘಂಟು ಮತ್ತು OCR.",
    h1: TAGLINE.kn,
    intro:
      "ಕಂಪ್ಯೂಟರ್‌ನಲ್ಲಿ ಕನ್ನಡ ಸರಿಯಾಗಿ ಕೆಲಸ ಮಾಡಲೆಂದು ಓಪನ್ ಕನ್ನಡ ಉಚಿತ, ಮುಕ್ತ ಮೂಲದ ಸಾಧನಗಳನ್ನು ಮಾಡುತ್ತದೆ. ಸಂಪಾದಕ ಮತ್ತು ಅದರ ಪರಿವರ್ತಕಗಳು ಇಂದೇ ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತವೆ. ಫಾಂಟ್‌ಗಳು, ಕಾಗುಣಿತ ಪರೀಕ್ಷಕ, ನಿಘಂಟು ಮತ್ತು OCR ಸಿದ್ಧವಾಗುತ್ತಿವೆ.",
    faq: [],
    og: { from: "Kannada", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "kn/fonts",
    lang: "kn",
    twin: "fonts",
    needsReview: true,
    kind: "project",
    name: "ಫಾಂಟ್‌ಗಳು",
    title: "ಕನ್ನಡ ಫಾಂಟ್‌ಗಳು: Neha Sans, Neha Serif ಮತ್ತು Gari",
    description:
      "SIL Open Font License ಅಡಿಯಲ್ಲಿ 3 ಮುಕ್ತ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳು: Noto ಆಧರಿಸಿದ Neha Sans ಮತ್ತು Neha Serif, ಹಾಗೂ Navilu ಆಧರಿಸಿದ ಕೈಬರಹ ಶೈಲಿಯ Gari.",
    h1: "ಕನ್ನಡ ಫಾಂಟ್‌ಗಳು",
    intro:
      "Neha Sans ಮತ್ತು Neha Serif, Google ನ Noto Sans Kannada ಮತ್ತು Noto Serif Kannada ಆಧರಿಸಿ ಮಾಡಿದ ಕನ್ನಡ ಫಾಂಟ್‌ಗಳು. ಇವುಗಳಲ್ಲಿ ಕೆಲವು ಅಕ್ಷರಗಳನ್ನು ಸರಿಪಡಿಸಲಾಗಿದೆ, ಕೆಲವನ್ನು ಸೇರಿಸಲಾಗಿದೆ. Gari, Aravinda VK ಅವರ Navilu ಆಧರಿಸಿದ ಕೈಬರಹ ಶೈಲಿಯ ಫಾಂಟ್.",
    art: "font",
    schema: "CreativeWork",
    licenses: [OFL],
    sections: [
      {
        id: "what",
        items: [
          "<b>Neha Sans</b> ಮತ್ತು <b>Neha Serif</b>, ರ ಜೊತೆ ಋ ಸ್ವರಚಿಹ್ನೆ ಸೇರಿದ ರೃ ಅನ್ನು ಸರಿಪಡಿಸುತ್ತವೆ. Noto ಅದನ್ನು ರೇಫ ಸಹಿತ ಋ ಆಗಿ ಬರೆದಿತ್ತು. ಕನ್ನಡದ ಪ್ರಾಚೀನ ಶ್ರೀ ಚಿಹ್ನೆ U+0CDC ಯ ಕರಡು ರೂಪವನ್ನೂ ಇವು ನೀಡುತ್ತವೆ.",
          "ಓಪನ್ ಕನ್ನಡದ ಸ್ಥಾಪಕ ಸದಸ್ಯೆ ನೇಹಾ ಪ್ರಸಾದ್ ಅವರ ಹೆಸರನ್ನು ಇವುಗಳಿಗೆ ಇಡಲಾಗಿದೆ. ಪ್ರತಿಯೊಂದೂ ತನ್ನ ಮೂಲವನ್ನು ಉಲ್ಲೇಖಿಸುತ್ತದೆ, ಉದಾಹರಣೆಗೆ “Based on Noto Sans Kannada by Google.”",
          "<b>Gari</b>, Aravinda VK ಅವರ Navilu ಆಧರಿಸಿದ ಕೈಬರಹ ಶೈಲಿಯ ಫಾಂಟ್. ಅದು ಹೊಸ ಕ್ರಮದ ಕನ್ನಡ ಶೇಪಿಂಗ್ ಅನ್ನು, ಮತ್ತು ಹೊಸ ಅಕ್ಷರಗಳಾದ U+0CDC, U+0CDD ಮತ್ತು U+0CF3 ಅನ್ನು ಸೇರಿಸುತ್ತದೆ.",
        ],
      },
      { id: "downloads", paragraphs: [SOON_KN] },
      { id: "license", paragraphs: ["3 ಫಾಂಟ್‌ಗಳೂ SIL Open Font License 1.1 ಅಡಿಯಲ್ಲಿವೆ."] },
    ],
    faq: [],
    og: { from: "Neha Sans", to: "ರೃ" },
    keywords: "",
  },
  {
    slug: "kn/spell-check",
    lang: "kn",
    twin: "spell-check",
    needsReview: true,
    kind: "project",
    name: "ಕಾಗುಣಿತ ಪರೀಕ್ಷೆ",
    title: "ಕನ್ನಡ ಕಾಗುಣಿತ ಪರೀಕ್ಷೆ: LibreOffice ಮತ್ತು Firefox ಗಾಗಿ Hunspell ನಿಘಂಟು",
    description:
      "ಹೊರಗಿಟ್ಟ ವಿಕಿಪೀಡಿಯ ಪದಗಳಲ್ಲಿ 88.9% ಅನ್ನು ಒಪ್ಪುವ ಕನ್ನಡ Hunspell ನಿಘಂಟು. ಹೆಚ್ಚಿನ ವ್ಯವಸ್ಥೆಗಳಲ್ಲಿರುವ 2009ರ ನಿಘಂಟು 65.7% ಒಪ್ಪುತ್ತದೆ.",
    h1: "ಕನ್ನಡ ಕಾಗುಣಿತ ಪರೀಕ್ಷೆ",
    intro:
      "LibreOffice ಮತ್ತು Firefox ಗಾಗಿ ಕನ್ನಡ Hunspell ನಿಘಂಟು. ಅದರ ಜೊತೆಗೆ ಒಂದು ಪದ ವಿಶ್ಲೇಷಕ, ಒಂದು ಪದಮೂಲ ಶೋಧಕ ಮತ್ತು ಉಚ್ಚಾರ ಹೋಲಿಕೆಯ ಕೀಲಿಗಳು ಇವೆ, ಎಲ್ಲವೂ ಒಂದೇ ರೂಪನಿಯಮಗಳಿಂದ ರಚಿತವಾದವು.",
    art: "spell",
    schema: "CreativeWork",
    licenses: [MIT, APACHE, ODBL, CC_BY],
    sections: [
      {
        id: "what",
        paragraphs: [
          "ಈ ನಿಘಂಟು LibreOffice ಮತ್ತು Firefox ನಲ್ಲಿ ಕನ್ನಡ ಕಾಗುಣಿತವನ್ನು ಪರೀಕ್ಷಿಸುತ್ತದೆ. ಪದ ವಿಶ್ಲೇಷಕ, ಪದಮೂಲ ಶೋಧಕ ಮತ್ತು ಉಚ್ಚಾರ ಹೋಲಿಕೆಯ ಕೀಲಿಗಳು ನಿಘಂಟಿನ ರೂಪನಿಯಮಗಳಿಂದಲೇ ರಚಿತವಾಗಿವೆ.",
        ],
      },
      {
        id: "result",
        paragraphs: ["ಇದು ಹೊರಗಿಟ್ಟ ಪದಗಳಲ್ಲಿ 88.9% ಅನ್ನು ಒಪ್ಪುತ್ತದೆ. ಹೆಚ್ಚಿನ ವ್ಯವಸ್ಥೆಗಳು ಬಳಸುವ 2009ರ ನಿಘಂಟು hunspell-kn 1.0.3, 65.7% ಒಪ್ಪುತ್ತದೆ."],
        stats: [
          { value: "88.9%", label: "ಓಪನ್ ಕನ್ನಡ kn_IN" },
          { value: "65.7%", label: "hunspell-kn 1.0.3, 2009ರದ್ದು" },
        ],
      },
      {
        id: "method",
        paragraphs: [
          "1 ನವೆಂಬರ್ 2026ರ ಕನ್ನಡ ವಿಕಿಪೀಡಿಯ ಡಂಪ್‌ನ ಪ್ರತಿ 10ನೇ ಲೇಖನವನ್ನು ಪರೀಕ್ಷೆಗಾಗಿ ಹೊರಗಿಡಲಾಗಿದೆ, ಒಟ್ಟು 22 ಲಕ್ಷ ಪದಗಳು. ನಿಘಂಟುಗಳನ್ನು ಉಳಿದ ಲೇಖನಗಳಿಂದ ಕಟ್ಟಲಾಗಿದೆ.",
        ],
      },
      { id: "downloads", paragraphs: [SOON_KN] },
      {
        id: "license",
        items: [
          "ಕೋಡ್: MIT OR Apache-2.0.",
          "ನಿಘಂಟು <code>kn_IN</code>: ODbL-1.0, ವಿ. ಕೃಷ್ಣ ಅವರ ಅಲರ್ ನಿಘಂಟಿನಿಂದ ಪಡೆದದ್ದು.",
          "ವಿಕಿಪೀಡಿಯ ಪದಪಟ್ಟಿ: CC BY 4.0.",
        ],
      },
    ],
    faq: [],
    og: { from: "ಬಾಷೆ", to: "ಭಾಷೆ" },
    keywords: "",
  },
  {
    slug: "kn/dictionary",
    lang: "kn",
    twin: "dictionary",
    needsReview: true,
    kind: "project",
    name: "ನಿಘಂಟು",
    title: "ಇಂಗ್ಲಿಷ್-ಕನ್ನಡ ನಿಘಂಟು: ಕನ್ನಡ ಪದಗಳು, ಲಿಪ್ಯಂತರ ಮತ್ತು ಅರ್ಥಗಳು",
    description:
      "ಪ್ರತಿ ಇಂಗ್ಲಿಷ್ ಪದಕ್ಕೆ 1 ಪುಟವಿರುವ ಇಂಗ್ಲಿಷ್-ಕನ್ನಡ ನಿಘಂಟು: ISO 15919 ಮತ್ತು ಬರಹ ಲಿಪ್ಯಂತರದೊಂದಿಗೆ ಕನ್ನಡ ಪದಗಳು, ಪದವರ್ಗ, ಅಲರ್‌ನಿಂದ ಅರ್ಥಗಳು.",
    h1: "ಇಂಗ್ಲಿಷ್-ಕನ್ನಡ ನಿಘಂಟು",
    intro:
      "ಪ್ರತಿ ಇಂಗ್ಲಿಷ್ ಪದಕ್ಕೆ 1 ಪುಟವಿರುವ ಇಂಗ್ಲಿಷ್-ಕನ್ನಡ ನಿಘಂಟು. ಪ್ರತಿ ಪುಟದಲ್ಲಿ ಕನ್ನಡ ಪದಗಳು, ಅವುಗಳ ISO 15919 ಮತ್ತು ಬರಹ ಲಿಪ್ಯಂತರ, ಪದವರ್ಗ, ಮತ್ತು ಅಲರ್ ನಿಘಂಟಿನಿಂದ ತೆಗೆದ ಅರ್ಥಗಳು ಇರುತ್ತವೆ.",
    art: "dictionary",
    schema: "CreativeWork",
    licenses: [ODBL, MIT],
    sections: [
      {
        id: "what",
        paragraphs: [
          '<i lang="en">water</i> ನಂತಹ ಇಂಗ್ಲಿಷ್ ಪದವನ್ನು ಹುಡುಕಿದರೆ, ಅದರ ಪುಟದಲ್ಲಿ ನೀರು ನಂತಹ ಕನ್ನಡ ಪದಗಳು ಕಾಣುತ್ತವೆ. ಪ್ರತಿ ಪದದ ಜೊತೆ ಅದರ ISO 15919 ರೂಪ <kbd>nīru</kbd>, ಮತ್ತು ಅದನ್ನು ಟೈಪ್ ಮಾಡಲು ಬರಹ ರೂಪ <kbd>nIru</kbd> ಇರುತ್ತದೆ. ಅರ್ಥಗಳು ವಿ. ಕೃಷ್ಣ ಅವರ ಅಲರ್ ನಿಘಂಟಿನಿಂದ ಬಂದಿವೆ.',
        ],
      },
      { id: "downloads", paragraphs: [SOON_KN] },
      { id: "license", items: ["ಡೇಟಾ: ODbL-1.0.", "ಕೋಡ್: MIT."] },
    ],
    faq: [],
    og: { from: "water", to: "ನೀರು" },
    keywords: "",
  },
  {
    slug: "kn/ocr",
    lang: "kn",
    twin: "ocr",
    needsReview: true,
    kind: "project",
    name: "OCR",
    title: "ಕನ್ನಡ OCR: ಹಳೆಯ ಕನ್ನಡ ಮುದ್ರಣಕ್ಕಾಗಿ Tesseract ಮಾದರಿ",
    description:
      "ಕನ್ನಡ ಮುದ್ರಣವನ್ನು, ಅದರಲ್ಲೂ ಹಳೆಯ ಮುದ್ರಣವನ್ನು, ಪಠ್ಯವಾಗಿ ಓದುವ Tesseract ಮಾದರಿ, 4 ಸೆಟ್‌ಗಳ ಮಾನದಂಡದೊಂದಿಗೆ. ಹಳೆಯ ಮುದ್ರಿತ ಪುಸ್ತಕಗಳಲ್ಲಿ ಅದು 6.0% ಅಕ್ಷರಗಳನ್ನು ತಪ್ಪಾಗಿ ಓದುತ್ತದೆ, ಸಾಮಾನ್ಯ Tesseract ನಲ್ಲಿ 8.7%.",
    h1: "ಕನ್ನಡ OCR",
    intro:
      "ಕನ್ನಡ ಮುದ್ರಣಕ್ಕಾಗಿ, ಅದರಲ್ಲೂ ಹಳೆಯ ಮುದ್ರಣಕ್ಕಾಗಿ, ಹೆಚ್ಚಿನ ತರಬೇತಿ ನೀಡಿದ Tesseract ಮಾದರಿ. ಅದು ಎಷ್ಟು ಚೆನ್ನಾಗಿ ಓದುತ್ತದೆ ಎಂದು ಅಳೆಯಲು 4 ಸೆಟ್‌ಗಳ ಮಾನದಂಡವೂ ಇದೆ.",
    art: "scan",
    schema: "CreativeWork",
    licenses: [MIT, APACHE],
    sections: [
      {
        id: "what",
        paragraphs: [
          "OCR ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಪುಟವನ್ನು ಹುಡುಕಬಹುದಾದ, ನಕಲಿಸಬಹುದಾದ ಮತ್ತು ತಿದ್ದಬಹುದಾದ ಪಠ್ಯವಾಗಿ ಬದಲಿಸುತ್ತದೆ. ಈ ಮಾದರಿ, ಕನ್ನಡ ಮುದ್ರಣದ ಮೇಲೆ, ಅದರಲ್ಲೂ ಹಳೆಯ ಮುದ್ರಣದ ಮೇಲೆ, ಹೆಚ್ಚಿನ ತರಬೇತಿ ಪಡೆದ Tesseract.",
        ],
      },
      {
        id: "result",
        paragraphs: ["ತಪ್ಪಾಗಿ ಓದಿದ ಅಕ್ಷರಗಳ ಪ್ರಮಾಣ, ಕಡಿಮೆ ಇದ್ದಷ್ಟೂ ಒಳ್ಳೆಯದು, ಮಾದರಿಯ 0.2 ಆವೃತ್ತಿಗೆ, ಕನ್ನಡಕ್ಕಾಗಿ ಸಾಮಾನ್ಯ Tesseract ಗೆ ಹೋಲಿಸಿದರೆ:"],
        items: [
          "ಹಳೆಯ ಮುದ್ರಿತ ಪುಸ್ತಕಗಳು, ವಿಕಿಸೋರ್ಸ್‌ನ 60 ಪುಟಗಳು: 6.0%, ಸಾಮಾನ್ಯದಲ್ಲಿ 8.7%.",
          "ಮಸುಕಾದ ಪದಗಳು, 400: 17.0%, ಸಾಮಾನ್ಯದಲ್ಲಿ 24.4%.",
          "IISc ಯ MILE ಪುಟಗಳು, 30: 5.4%, ಸಾಮಾನ್ಯದಲ್ಲಿ 7.3%.",
          "IISc ಯ MILE ಸಾಲುಗಳು, 600: 2.8%, ಸಾಮಾನ್ಯದಲ್ಲಿ 3.8%.",
        ],
      },
      {
        id: "method",
        items: ["ವಿಕಿಸೋರ್ಸ್ ಸಾಲುಗಳ ಮೇಲೆ ಮತ್ತು ಮುಕ್ತ ಲೈಸೆನ್ಸ್‌ನ ಫಾಂಟ್‌ಗಳಲ್ಲಿ ರಚಿಸಿದ ಸಾಲುಗಳ ಮೇಲೆ Tesseract ಅನ್ನು ಮತ್ತಷ್ಟು ತರಬೇತಿಗೊಳಿಸಲಾಗಿದೆ; ತಪ್ಪು ಅಕ್ಷರಗಳ ಪ್ರಮಾಣವನ್ನು ತರಬೇತಿಗೆ ಬಳಸದ ಮಾದರಿಗಳ ಮೇಲೆ 18 ನವೆಂಬರ್ 2026 ರಂದು ಅಳೆಯಲಾಗಿದೆ."],
      },
      { id: "downloads", paragraphs: [SOON_KN] },
      { id: "license", items: ["ಕೋಡ್: MIT OR Apache-2.0.", "ಮಾದರಿ: Apache-2.0."] },
    ],
    faq: [],
    og: { from: "Print", to: "ಕನ್ನಡ ಪುಸ್ತಕ" },
    keywords: "",
  },
  {
    slug: "kn/ai-benchmark",
    lang: "kn",
    twin: "ai-benchmark",
    needsReview: true,
    kind: "project",
    name: "AI ಮಾನದಂಡ",
    title: "ಕನ್ನಡದ ಟೋಕನ್ ತೆರಿಗೆ: AI ಟೋಕನೈಸರ್‌ಗಳಲ್ಲಿ ಕನ್ನಡಕ್ಕೆ ತಗಲುವ ವೆಚ್ಚ",
    description:
      "ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿರುವ ಪಠ್ಯಕ್ಕೆ ಹೋಲಿಸಿದರೆ ಅದೇ ಪಠ್ಯಕ್ಕೆ ಕನ್ನಡದಲ್ಲಿ 1.1 ರಿಂದ 8.3 ಪಟ್ಟು ಟೋಕನ್‌ಗಳು ಬೇಕು. ವೃತ್ತಿಪರವಾಗಿ ಅನುವಾದಿಸಿದ 960 ಭಾಗಗಳ ಮೇಲೆ ಅಳೆದದ್ದು.",
    h1: "ಕನ್ನಡದ ಟೋಕನ್ ತೆರಿಗೆ",
    intro:
      "ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿರುವ ಅದೇ ಪಠ್ಯಕ್ಕೆ ಹೋಲಿಸಿದರೆ ಕನ್ನಡ ಪಠ್ಯಕ್ಕೆ ಎಷ್ಟು ಟೋಕನ್‌ಗಳು ಬೇಕು ಎಂಬುದೇ ಟೋಕನ್ ತೆರಿಗೆ. ಸಾರ್ವಜನಿಕ ಟೋಕನೈಸರ್‌ಗಳಲ್ಲಿ ಕನ್ನಡಕ್ಕೆ 1.1 ರಿಂದ 8.3 ಪಟ್ಟು ಟೋಕನ್‌ಗಳು ಬೇಕು.",
    art: "benchmark",
    schema: "Dataset",
    licenses: [CC_BY],
    sections: [
      {
        id: "what",
        paragraphs: [
          "AI ಮಾದರಿಗಳು ಪಠ್ಯವನ್ನು ಟೋಕನ್‌ಗಳಾಗಿ ಓದುತ್ತವೆ ಮತ್ತು ಬರೆಯುತ್ತವೆ. ಸಾರ್ವಜನಿಕ ಟೋಕನೈಸರ್‌ಗಳು ಕನ್ನಡ ಪಠ್ಯಕ್ಕೂ, ಅದೇ ಪಠ್ಯದ ಇಂಗ್ಲಿಷ್ ರೂಪಕ್ಕೂ ಎಷ್ಟು ಟೋಕನ್‌ಗಳನ್ನು ಬಳಸುತ್ತವೆ ಎಂದು ಈ ಮಾನದಂಡ ಎಣಿಸುತ್ತದೆ. ಫಲಿತಾಂಶ ಒಂದು ಅನುಪಾತ: ಪ್ರತಿ ಇಂಗ್ಲಿಷ್ ಟೋಕನ್‌ಗೆ ಎಷ್ಟು ಕನ್ನಡ ಟೋಕನ್‌ಗಳು. ಅನುಪಾತ 2 ಆದರೆ, ಕನ್ನಡ ಪಠ್ಯಕ್ಕೆ 2 ಪಟ್ಟು ಟೋಕನ್‌ಗಳು ಬೇಕು.",
        ],
      },
      {
        id: "result",
        paragraphs: [
          "ಟೋಕನೈಸರ್‌ಗೆ ಅನುಗುಣವಾಗಿ, ಕನ್ನಡಕ್ಕೆ ಇಂಗ್ಲಿಷ್‌ಗಿಂತ 1.1 ರಿಂದ 8.3 ಪಟ್ಟು ಟೋಕನ್‌ಗಳು ಬೇಕು. ಮಾನದಂಡದಲ್ಲಿ 12 ಬೇರೆ ಬೇರೆ ಟೋಕನೈಸರ್‌ಗಳಿವೆ; ಕೋಷ್ಟಕದಲ್ಲಿ ಅವುಗಳಲ್ಲಿ 7 ಇವೆ, ಪ್ರತಿ ಅನುಪಾತದ 95% ವಿಶ್ವಾಸಾಂತರದೊಂದಿಗೆ.",
        ],
        table: {
          rows: [
            { name: "cl100k", ratio: 8.27, low: 8.06, high: 8.48 },
            { name: "Qwen 2.5", ratio: 6.52, low: 6.37, high: 6.68 },
            { name: "Kimi", ratio: 3.42, low: 3.35, high: 3.5 },
            { name: "o200k", ratio: 1.83, low: 1.8, high: 1.87 },
            { name: "Gemma 4", ratio: 1.7, low: 1.65, high: 1.74 },
            { name: "Sarvam", ratio: 1.35, low: 1.32, high: 1.38 },
            { name: "Sarvam-1", ratio: 1.14, low: 1.12, high: 1.17 },
          ],
        },
      },
      {
        id: "method",
        items: [
          "WMT24++ ನಿಂದ 170 ದಾಖಲೆಗಳ 960 ಇಂಗ್ಲಿಷ್ ಭಾಗಗಳು, ಅವುಗಳ ವೃತ್ತಿಪರ ಕನ್ನಡ ಅನುವಾದಗಳೊಂದಿಗೆ.",
          "23,778 ಕನ್ನಡ ಪದಗಳು ಮತ್ತು 32,262 ಇಂಗ್ಲಿಷ್ ಪದಗಳು.",
          "ವಿಶೇಷ ಟೋಕನ್‌ಗಳನ್ನು ಬಿಟ್ಟು ಟೋಕನ್‌ಗಳನ್ನು ಎಣಿಸಲಾಗಿದೆ.",
          "95% ವಿಶ್ವಾಸಾಂತರಗಳು ಇಡೀ ದಾಖಲೆಗಳನ್ನು ಮರುಮಾದರಿ ಮಾಡುವುದರಿಂದ ಬಂದಿವೆ.",
          "16 ನವೆಂಬರ್ 2026 ರಂದು ಅಳೆಯಲಾಗಿದೆ.",
        ],
      },
      {
        id: "limits",
        items: [
          "ಎಲ್ಲ ಪಠ್ಯವೂ 1 ಮೂಲದಿಂದ ಬಂದಿದೆ.",
          "ಟೋಕನ್‌ಗಳ ಸಂಖ್ಯೆ ಬೆಲೆಯಲ್ಲ.",
          "Claude ಮತ್ತು Gemini ಅನ್ನು ಅಳೆದಿಲ್ಲ, ಏಕೆಂದರೆ ಅವುಗಳ ಟೋಕನೈಸರ್‌ಗಳು ಸಾರ್ವಜನಿಕವಾಗಿಲ್ಲ.",
          "Llama 3.1, Llama 4, Gemma 3 ಮತ್ತು Tiny Aya ಅನ್ನು ಅಳೆದಿಲ್ಲ, ಏಕೆಂದರೆ ಅವುಗಳ ಟೋಕನೈಸರ್‌ಗಳು ಅನುಮತಿ ಪಡೆದವರಿಗೆ ಮಾತ್ರ ಸಿಗುತ್ತವೆ.",
        ],
      },
      { id: "downloads", paragraphs: ["ಪರೀಕ್ಷಾ ಸಂಗ್ರಹ ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ."] },
      { id: "license", paragraphs: ["ಫಲಿತಾಂಶಗಳು: CC BY 4.0."] },
    ],
    faq: [],
    og: { from: "English", to: "ಕನ್ನಡ" },
    keywords: "",
  },
  {
    slug: "kn/contribute",
    lang: "kn",
    twin: "contribute",
    needsReview: true,
    kind: "info",
    name: "ಕೊಡುಗೆ ನೀಡಿ",
    title: "ಓಪನ್ ಕನ್ನಡಕ್ಕೆ ಕೊಡುಗೆ ನೀಡಿ: ಪರಿವರ್ತನೆ, ಓದು, ಅಕ್ಷರವಿನ್ಯಾಸ ಮತ್ತು ಕೋಡ್",
    description:
      "ಓಪನ್ ಕನ್ನಡಕ್ಕೆ ನೆರವಾಗುವ ವಿಧಾನ: ತಪ್ಪು ಪರಿವರ್ತನೆಯನ್ನು ತಿಳಿಸಿ, ಕನ್ನಡ ಪಠ್ಯ ಪರಿಶೀಲಿಸಿ, ಮುಕ್ತ ಫಾಂಟ್‌ಗಳಿಗೆ ಅಕ್ಷರ ಬರೆಯಿರಿ, ಅಥವಾ GitHub ನಲ್ಲಿ ಕನ್ನಡಿಗೆ ಕೋಡ್ ಕಳುಹಿಸಿ.",
    h1: "ಕೊಡುಗೆ ನೀಡಿ",
    intro:
      "ಕನ್ನಡದಲ್ಲಿ ಓದುವ, ಬರೆಯುವ, ಟೈಪ್ ಮಾಡುವ ಮತ್ತು ತಂತ್ರಾಂಶ ಕಟ್ಟುವ ಜನರು ಓಪನ್ ಕನ್ನಡಕ್ಕೆ ಬೇಕು. 1 ಪದದ ತಿದ್ದುಪಡಿಯಿಂದ ಹೊಸ ಫಾಂಟ್‌ವರೆಗೆ, ನೆರವಾಗುವ ವಿಧಾನ ಇಲ್ಲಿದೆ.",
    body: "contribute",
    faq: [],
    og: { from: "Help", to: "ನೆರವು" },
    keywords: "",
  },
];

/**
 * The pages to build: drafts that wait for a native reader are left out, and so are links to them from their twins.
 * KANNADA_DRAFTS=1 keeps them, to read them in a local build.
 */
export function published(pages: Page[], drafts: boolean): Page[] {
  if (drafts) return pages;
  const kept = pages.filter((p) => !p.needsReview);
  const slugs = new Set(kept.map((p) => p.slug));
  return kept.map((p) => {
    if (p.twin === undefined || slugs.has(p.twin)) return p;
    const { twin: _, ...rest } = p;
    return rest as Page;
  });
}

export const PAGES: Page[] = published(ALL_PAGES, typeof process !== "undefined" && process.env?.KANNADA_DRAFTS === "1");

export const HOME = PAGES.find((p): p is HomePage => p.kind === "home" && p.slug === "")!;

/** The editor, where the home page sends pasted text. */
export const EDITOR = PAGES.find((p): p is ToolPage => p.kind === "tool" && p.slug === "editor")!;

/** The home page in each language, built or not. The Kannada editor stays the Kannada home until the Kannada home page is read. */
export const HOMES: Record<Lang, Page> = {
  en: HOME,
  kn: ALL_PAGES.find((p) => p.slug === "kn")!,
};

/** Whether the page is the home page of its language, which has no breadcrumb trail and no Ask AI menu. */
export function isHome(page: Page): boolean {
  return page.kind === "home" || page.slug === "kn";
}

/** The editor in either language, named as the app in the structured data. */
export function isEditor(page: Page): boolean {
  return page.slug === "editor" || page.slug === "kn";
}

/** The English pages in each menu, in order. The header shows the first 3; the footer and the phone menu show all. */
export const NAV = {
  tools: ["editor", "fonts", "spell-check", "dictionary", "ocr", "ai-benchmark"],
  converters: ["nudi-to-unicode", "unicode-to-nudi", "baraha-to-unicode", "akruti-to-unicode"],
  typing: ["kannada-typing", "english-to-kannada-typing", "kannada-alphabet", "kagunita"],
  org: ["about", "contribute", "press", "brand"],
} as const satisfies Record<string, readonly string[]>;

/** The page for an English slug in the reader's language: its Kannada twin once built, or else the English page. */
export function inLanguage(slug: string, lang: Lang, pages: Page[] = PAGES): Page | undefined {
  const page = pages.find((p) => p.slug === slug);
  if (!page || lang === "en" || page.twin === undefined) return page;
  return pages.find((p) => p.slug === page.twin) ?? page;
}

/** Kannada words shown with their Baraha and ISO 15919 spellings. */
export const EXAMPLE_WORDS = ["ಕನ್ನಡ", "ನಮಸ್ಕಾರ", "ಕರ್ನಾಟಕ", "ಬೆಂಗಳೂರು", "ಮೈಸೂರು", "ಜ್ಞಾನ", "ಶ್ರೀ", "ಹೃದಯ", "ಅಮ್ಮ", "ಊರು"];

/** Letters in the typing chart, in the order of the Kannada alphabet. */
export const CHART: Record<string, string[]> = {
  Vowels: [...VOWELS, ...YOGAVAHAS],
  Consonants: CONSONANTS,
  "Vowel signs on ಕ": SIGNS.map((sign) => `ಕ${sign}`),
};
