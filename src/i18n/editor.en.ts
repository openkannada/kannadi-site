import type { Layout } from "../editor/text.ts";

// Every word the editor shows or announces. {name} slots are filled in by the code; {n} is a count.
// Slots in Editor.astro and the fix card may become elements, such as a key or a Kannada sample.

export const EDITOR_EN = {
  editor: {
    label: "Kannada editor",
    document: "Document",
    status: "Document status",
    suggestions: "Kannada words for what you typed",
    dropHint: "Drop to open",
    sample: "Try a page from 2002",
    loadFailed: "This browser could not load the editor. A recent Chrome, Edge, Firefox or Safari will work.",
    welcomeBack: "Welcome back. Some of this still looks like Nudi, Baraha or Akruti: select it and choose Convert.",
  },
  toolbar: {
    label: "Editor tools",
    typeWith: "Type with",
    typeWithMode: "Type with {name}",
    modeHelp:
      "With English, type Kannada words the way they sound and pick from the suggestions. Baraha and ISO follow their spelling rules exactly. Alt+1 to Alt+4 switch.",
    open: "Open",
    openTitle: "Open a TXT, Word or HTML file (Ctrl+O)",
    convert: "Convert",
    convertTitle: "Convert the selection, or the whole document, from Nudi, Baraha or Akruti",
    voice: "Type by voice in Kannada, through your browser's speech service",
    more: "More tools",
    save: "Save",
    saveTitle: "Save a copy (Ctrl+S)",
  },
  modes: {
    /** `label` is on the button, `name` completes "Type with {name}" and "Typing with {name}." */
    kannada: { label: "ಕ", name: "a Kannada keyboard", spoken: "Kannada keyboard" },
    english: { label: "English", name: "English letters, with word suggestions" },
    baraha: { label: "Baraha", name: "Baraha letters" },
    iso15919: { label: "ISO", name: "ISO 15919 letters" },
    typingWith: "Typing with {name}.",
  },
  menu: {
    openFile: "Open a file",
    convertFrom: "Convert from Nudi, Baraha or Akruti",
    typeIso: "Type with ISO 15919 letters",
    normalize: "Normalize",
    normalizeNote: "joins split vowel signs",
    modernize: "Modernize",
    modernizeNote: "ೞ ಱ to ಳ ರ",
    newDocument: "New document",
    recent: "Recent documents",
    untitled: "Untitled",
    typeface: "Typeface",
    sans: "Sans",
    serif: "Serif",
    whenConverting: "When converting",
    autoConvert: "Convert pasted legacy text",
    zero: "Read 0 inside a word as anusvara: {from} to {to}",
    zeroFrom: "ಪ್ರಾರ0ಭ",
    zeroTo: "ಪ್ರಾರಂಭ",
    digits: "Use Kannada digits (Nudi fonts whose names end in k)",
    shortcuts: "Keyboard shortcuts",
  },
  save: {
    label: "Save",
    docx: "Word document",
    txt: "Plain text",
    html: "Web page",
    nudi: "Nudi text",
    copy: "Copy all",
    copyNudi: "Copy as Nudi",
  },
  counts: {
    aksharas: { one: "{n} akshara", other: "{n} aksharas" },
    words: { one: "{n} word", other: "{n} words" },
    characters: { one: "{n} character", other: "{n} characters" },
  },
  problems: {
    /** Follows the count on the chip, in a separate element: "3 to check". */
    chip: "to check",
    chipLabel: { one: "{n} problem to check", other: "{n} problems to check" },
    heading: "Marked in the text",
    nextKey: "{key} jumps to the next one.",
    more: "Showing the first {shown} of {total}.",
    names: { unknown: "Unknown glyph", malformed: "Malformed syllable", typo: "Likely typo" },
    line: "Line {line}",
    itemLabel: "Line {line}: {problem} {codes}",
    here: "{problem} here. Press F8 for its fixes.",
    noneMarked: "Nothing is marked.",
  },
  fix: {
    dialog: "Fix this problem",
    /** {sample} is the marked text in Kannada; {codes} its code points, such as U+0CCD. */
    title: "{problem} {sample} {codes}",
    why: {
      unknown: "The converter has no Kannada letter for this glyph. It was kept so nothing is lost.",
      malformed: "These marks cannot form a Kannada syllable here.",
      typo: "This spelling is usually a typing mistake.",
    },
    typoWhy: {
      "ra-vocalic-r": "Kannada writes this sound with the letter ಋ, as in ನೈಋತ್ಯ.",
      "ra-virama-vocalic-r": "Kannada writes this sound as the single letter ಋ, as in ನೈಋತ್ಯ.",
    } as Record<string, string>,
    actions: {
      normalize: "Use the standard spelling",
      join: "Join to the letter before",
      remove: "Remove the stray sign",
      "keep-first": "Keep the first vowel sign",
      "keep-last": "Keep the second vowel sign",
    } as Record<string, string>,
    fallback: "Fix",
    use: "Use {letter}",
    keep: "Keep it",
    deleteGlyph: "Delete the glyph",
    replaceWith: "Replace with",
    placeholder: "jna or ಜ್ಞ",
    replace: "Replace",
    close: "Close",
  },
  convert: {
    layouts: { nudi: "Nudi or Baraha", akruti: "Akruti", "kan-eng": "Kan-Eng", "shree-lipi": "Shree-Lipi", "nudi-b": "Nudi B-Akshara" } satisfies Record<Layout, string>,
    /** Joins layout names after "converted from": "Nudi or Baraha, and from Akruti". */
    andFrom: "{first}, and from {second}",
    legacyFont: "a legacy font",
    /** {what} is 1 of the 4 phrases below it, or "Opened {name}". */
    report: { one: "{what}: {n} character converted from {from}.", other: "{what}: {n} characters converted from {from}." },
    glyphs: { one: "{n} glyph to check.", other: "{n} glyphs to check." },
    document: "Converted the document",
    selection: "Converted the selection",
    /** Convert on text that is Unicode Kannada already. */
    unicodeDocument: "The document is already Unicode: nothing to convert.",
    unicodeSelection: "The selection is already Unicode: nothing to convert.",
    nothing: "Nothing to convert.",
    pasted: "Pasted",
    opened: "Opened {name}",
    sample: "Converted part of a 2002 Karnataka government page, typed in BRH Kannada.",
  },
  edit: {
    /** After a change to the whole document, to the selection, or when nothing changed. */
    normalize: {
      whole: "Normalized. Undo with Ctrl+Z.",
      selection: "Normalized in the selection. Undo with Ctrl+Z.",
      nothing: "Normalized: nothing to change.",
    },
    modernize: {
      whole: "Modernized Old Kannada letters. Undo with Ctrl+Z.",
      selection: "Modernized Old Kannada letters in the selection. Undo with Ctrl+Z.",
      nothing: "Modernized Old Kannada letters: nothing to change.",
    },
    newDocument: "New document. Undo with Ctrl+Z to get the last one back.",
    newDocumentKept: "New document. The last one is in Recent documents, under More tools.",
  },
  paste: {
    asIs: "Paste as is",
    changed: "The pasted text has changed since, so it was left as it is.",
    pastedAsIs: "Pasted as is, without converting.",
    noConverter: "Pasted as is: the converter did not load. Reload the page to convert pasted text.",
  },
  copy: {
    done: "Copied the whole document.",
    failed: "Could not copy. Select the text and copy it by hand.",
    nudi: "Copied as Nudi. Paste it into Word and set a Nudi or BRH font. {notes}",
    nudiFailed: "Could not copy. Save as Nudi text instead.",
  },
  nudi: {
    unencodable: { one: "{n} character has no Nudi glyph and stayed as typed.", other: "{n} characters have no Nudi glyph and stayed as typed." },
    questionMarks: {
      one: "{n} character has no byte in a Nudi text file and became ?.",
      other: "{n} characters have no byte in a Nudi text file and became ?.",
    },
    malformed: { one: "{n} syllable is malformed and may not read back the same.", other: "{n} syllables are malformed and may not read back the same." },
  },
  files: {
    /** File names for downloads, before the extension. */
    defaultName: "kannada",
    sampleName: "sample",
    nothingToConvert: "Opened {name}. Nothing in it needed converting.",
    openFailed: "Could not open {name}. {error}",
    /** Files that are not text, and what to do instead. */
    notText: {
      doc: "Could not open {name}: Word 97-2003 .doc files cannot be opened here. Open it in Word and save it as .docx, then open that.",
      pdf: "Could not open {name}: PDFs cannot be opened here. Copy the text from the PDF and paste it in.",
      other: "Could not open {name}: it is not a text, HTML or Word .docx file.",
    },
    saved: "Saved {name} to your downloads.",
    savedNudi: "Saved {name}. Set it in a Nudi or BRH font to read it. {notes}",
    saveFailed: "Could not save {name}. Reload the page and try again.",
    savedHere: "Saved on this device",
    tooLarge: "Too large to keep on this device",
    /** Why a Word file could not be read; shown after "Could not open {name}." */
    errors: {
      notZip: "not a ZIP file",
      zip64: "This file uses ZIP64, which is not supported.",
      damagedDirectory: "damaged ZIP directory",
      damagedEntry: "damaged ZIP entry",
      tooLarge: "{name} is too large to read.",
      compression: "unsupported ZIP compression {method}",
      noDocument: "This file has no Word document inside.",
    },
  },
  voice: {
    listening: "Listening",
    started: "Listening through your browser's speech service. Speak in Kannada; select the microphone again to stop.",
    stopped: "Stopped listening.",
    errors: {
      "not-allowed": "Allow the microphone for this page to type by voice.",
      "service-not-allowed": "This browser does not allow voice typing here.",
      "audio-capture": "No microphone was found.",
      network: "Voice typing needs a connection to the browser's speech service.",
      "language-not-supported": "This browser cannot recognize Kannada speech.",
    } as Record<string, string>,
    failed: "Voice typing stopped.",
    couldNotStart: "Voice typing could not start.",
  },
  suggest: {
    choices: { one: "{n} word to choose from", other: "{n} words to choose from" },
    /** Read out while Tab moves through the suggestions: "ನಮಸ್ಕಾರ, 2 of 5". */
    choice: "{word}, {i} of {n}",
  },
  shortcuts: {
    heading: "Keyboard shortcuts",
    close: "Close",
    open: "Open a file",
    save: "Save in the last format used",
    undo: "Undo, including conversions and fixes",
    next: "Next marked problem and its fixes",
    previous: "Previous marked problem",
    /** The keys for switching modes; each slot is a key. */
    modesKeys: "{alt} {first} to {last}",
    modes: "Type with Kannada keys, English letters, Baraha or ISO",
    nextWord: "Next suggested word while typing in English letters",
    keepWord: "Keep the word you are typing in English letters",
    list: "This list",
    /** Each slot is a key. */
    mac: "On a Mac, use {cmd} for {ctrl} and {option} for {alt}.",
  },
};

export type EditorStrings = typeof EDITOR_EN;
