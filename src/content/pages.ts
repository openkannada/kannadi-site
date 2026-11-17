// Copy for every page. Strings are trusted HTML written here; FAQ answers are
// also published as plain text in the FAQPage JSON-LD.

import type { TypingMode } from "../editor/text.ts";
import { CONSONANTS, SIGNS, VOWELS, YOGAVAHAS } from "./letters.ts";

export interface Faq {
  q: string;
  a: string;
}

interface PageBase {
  /** URL path without slashes; "" is the home page. */
  slug: string;
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

export type Page = ToolPage | ReferencePage;

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
  "Look over the marks. Rose is a glyph with no Kannada letter, amber is a sign that cannot form a syllable, and a dashed line is a likely typo, such as <span lang=\"kn\">ರೃ</span> for <span lang=\"kn\">ಋ</span>. Select one, or press <kbd>F8</kbd>, and pick a fix.",
  "Choose <b>Save</b> for a Word file, plain text or a web page.",
];

const TYPING_LINK = '<a href="/english-to-kannada-typing/">English to Kannada typing</a>';

export const PAGES: Page[] = [
  {
    slug: "",
    kind: "tool",
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
        a: 'The <a href="https://github.com/prasadus92/kannadi">kannadi</a> library can, in Baraha, ISO 15919 and IAST spellings.',
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
];

export const HOME = PAGES.find((p): p is ToolPage => p.kind === "tool" && p.slug === "")!;

/** Kannada words shown with their Baraha and ISO 15919 spellings. */
export const EXAMPLE_WORDS = ["ಕನ್ನಡ", "ನಮಸ್ಕಾರ", "ಕರ್ನಾಟಕ", "ಬೆಂಗಳೂರು", "ಮೈಸೂರು", "ಜ್ಞಾನ", "ಶ್ರೀ", "ಹೃದಯ", "ಅಮ್ಮ", "ಊರು"];

/** Letters in the typing chart, in the order of the Kannada alphabet. */
export const CHART: Record<string, string[]> = {
  Vowels: [...VOWELS, ...YOGAVAHAS],
  Consonants: CONSONANTS,
  "Vowel signs on ಕ": SIGNS.map((sign) => `ಕ${sign}`),
};
