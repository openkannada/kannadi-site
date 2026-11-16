// Copy for every page. Strings are trusted HTML written here; FAQ answers are
// also published as plain text in the FAQPage JSON-LD.

import type { TypingMode } from "../editor/text.ts";

export interface Faq {
  q: string;
  a: string;
}

export interface Page {
  /** URL path without slashes; "" is the home page. */
  slug: string;
  /** Short name for navigation and breadcrumbs. */
  name: string;
  title: string;
  description: string;
  h1: string;
  /** The answer-first definition under the heading. */
  intro: string;
  /** The line inside the empty editor; trusted HTML. */
  welcome: string;
  mode: TypingMode;
  howTitle: string;
  steps: string[];
  chart?: "letters" | "words";
  faq: Faq[];
  /** The Open Graph card: legacy or Latin text on the left, Kannada on the right. */
  og: { from: string; to: string };
  /** Search terms this page answers, with monthly searches in India (DataForSEO, November 2026). */
  keywords: string;
}

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
  a: 'Prasad Subrahmanya, on <a href="https://github.com/prasadus92/kannadi">kannadi</a>, his open-source Rust library for Kannada text, released under the MIT license. The fonts are Noto Sans Kannada and Noto Serif Kannada, under the SIL Open Font License.',
};

const CONVERT_STEPS = [
  "Choose <b>Open</b> and pick the Word, text or web page file, or paste the text. Word and web files keep their fonts, so only the text set in a legacy font is converted.",
  "Look over the marks. Rose is a glyph with no Kannada letter; amber is a sign that cannot form a syllable. Select one, or press <kbd>F8</kbd>, and pick a fix.",
  "Choose <b>Save</b> for a Word file, plain text or a web page.",
];

export const PAGES: Page[] = [
  {
    slug: "",
    name: "Editor",
    title: "Kannada editor and converter: Nudi to Unicode, typing and more",
    description:
      "A free Kannada editor in your browser. Convert Nudi, Baraha and Akruti text to Unicode and back, fix what did not convert, and type Kannada in English letters.",
    h1: "Kannada editor and converter",
    intro:
      "kannadi is a free Kannada editor that converts text typed in the old Nudi, Baraha and Akruti fonts to Unicode and back, types Kannada from English letters, and saves Word, web and text files, all in your browser.",
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
        a: 'Yes. Open the saved page, or copy its text and paste it here. The editor reads the font names in the page and converts only the Kannada parts. Try the 2002 sample in the <a href="/">editor</a> to see it work.',
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
        a: "Yes, in Chrome and Edge. Select the microphone in the toolbar and speak in Kannada; the words appear where the cursor is. Voice typing uses the browser's own speech service, which hears the audio. Everything else on this page stays on your device.",
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
        a: 'From the 30,000 commonest words in <a href="https://kn.wikipedia.org">Kannada Wikipedia</a>, counted from its article text under the CC BY-SA 4.0 license. The editor matches what you type by sound, offers the commonest words first, and remembers the words you pick, on your device.',
      },
      {
        q: "How do I type a conjunct such as ಜ್ಞ or ಕ್ಷ?",
        a: "Type the consonants in order and the editor joins them: <kbd>j~ja</kbd> gives <span lang=\"kn\">ಜ್ಞ</span> and <kbd>kSha</kbd> gives <span lang=\"kn\">ಕ್ಷ</span>. The word list on this page shows more.",
      },
      {
        q: "Can I turn Kannada back into English letters?",
        a: 'The <a href="https://github.com/prasadus92/kannadi">kannadi</a> library can, in Baraha, ISO 15919 and IAST spellings.',
      },
      PRIVATE,
    ],
    og: { from: "namaskAra", to: "ನಮಸ್ಕಾರ" },
    keywords: "english to kannada typing 49,500; kannada transliteration 135,000",
  },
];

export const HOME = PAGES[0]!;

/** Kannada words shown with their Baraha and ISO 15919 spellings. */
export const EXAMPLE_WORDS = ["ಕನ್ನಡ", "ನಮಸ್ಕಾರ", "ಕರ್ನಾಟಕ", "ಬೆಂಗಳೂರು", "ಮೈಸೂರು", "ಜ್ಞಾನ", "ಶ್ರೀ", "ಹೃದಯ", "ಅಮ್ಮ", "ಊರು"];

/** Letters in the typing chart, in the order of the Kannada alphabet. */
export const CHART: Record<string, string[]> = {
  Vowels: ["ಅ", "ಆ", "ಇ", "ಈ", "ಉ", "ಊ", "ಋ", "ಎ", "ಏ", "ಐ", "ಒ", "ಓ", "ಔ", "ಅಂ", "ಅಃ"],
  Consonants: [
    "ಕ", "ಖ", "ಗ", "ಘ", "ಙ", "ಚ", "ಛ", "ಜ", "ಝ", "ಞ", "ಟ", "ಠ", "ಡ", "ಢ", "ಣ", "ತ", "ಥ", "ದ", "ಧ", "ನ",
    "ಪ", "ಫ", "ಬ", "ಭ", "ಮ", "ಯ", "ರ", "ಲ", "ವ", "ಶ", "ಷ", "ಸ", "ಹ", "ಳ",
  ],
  "Vowel signs on ಕ": ["ಕ", "ಕಾ", "ಕಿ", "ಕೀ", "ಕು", "ಕೂ", "ಕೃ", "ಕೆ", "ಕೇ", "ಕೈ", "ಕೊ", "ಕೋ", "ಕೌ", "ಕಂ", "ಕಃ", "ಕ್"],
};
