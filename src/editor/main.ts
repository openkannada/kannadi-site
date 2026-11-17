// Wires the editor page: the document, the toolbar and its menus, files,
// shortcuts and autosave. File readers and writers load on first use.
import wordsUrl from "../../data/words.tsv?url";
import { Composer } from "./compose.ts";
import { DocEditor } from "./editor.ts";
import type { ExportFormat } from "./files.ts";
import { registerWhenIdle, resolveModelContext } from "../lib/model-context.ts";
import { Issues, PROBLEM_NAMES } from "./issues.ts";
import * as kannadi from "./kannadi.ts";
import { EnglishTyping } from "./english.ts";
import { SuggestStrip } from "./strip.ts";
import { countWords, LAYOUT_NAMES, type Layout, looksLegacy, nudiNotes, plural, type TypingMode } from "./text.ts";
import { recognitionClass, Voice } from "./voice.ts";

// From a Karnataka RDPR scheme page, Dec 2002, set in BRH Kannada:
// https://web.archive.org/web/20021227171554/http://www.kar.nic.in:80/rdpr/kan-www/Schemes/Chapter-1/Matter/1_2(M).htm
const SAMPLE = [
  "2. ¸ÉÃªÉAiÀÄ°ègÀÄªÀ ²PÀëPÀjUÉ vÀgÀ¨ÉÃw PÁAiÀÄðPÀæªÀÄ",
  "",
  "2.1 PÁAiÀÄðPÀæªÀÄzÀ »£Àß¯É ºÁUÀÆ GzÉÝÃ±À",
  "¸ÀPÁðj ¥ÁæxÀ«ÄPÀ ±Á¯ÉUÀ¼À°è PÁAiÀÄð¤ªÀð»¸ÀÄwÛgÀÄªÀ ²PÀëPÀjUÉ ¥ÀÅ£Àgï ZÉÃvÀ£À",
  "vÀgÀ¨ÉÃw ¤ÃqÀÄªÀÅzÀÄ.",
].join("\n");

const STORE = "kannadi.editor.v1";
const PICKS = "kannadi.picks.v1";
const MODES: TypingMode[] = ["kannada", "english", "baraha", "iso15919"];

interface Settings {
  mode: TypingMode;
  font: "sans" | "serif";
  autoConvert: boolean;
  zero: boolean;
  digits: boolean;
  lastFormat?: ExportFormat;
}

interface Saved {
  text: string;
  unknown?: number[];
  kept?: number[];
  settings?: Partial<Settings>;
  fileName?: string;
}

interface Result {
  text: string;
  unknown: number[];
  converted?: number;
  layouts?: Layout[];
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} is missing`);
  return el as T;
};

const store = {
  read(): Saved | null {
    try {
      return JSON.parse(localStorage.getItem(STORE) ?? "null") as Saved | null;
    } catch {
      return null;
    }
  },
  write(value: Saved): boolean {
    try {
      localStorage.setItem(STORE, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};

const ui = {
  section: document.querySelector<HTMLElement>(".editor")!,
  doc: byId("doc"),
  welcome: byId("welcome"),
  toast: byId("toast"),
  toastText: byId("toast-text"),
  toastAction: byId<HTMLButtonElement>("toast-action"),
  announce: byId("announce"),
  aksharas: byId("count-aksharas"),
  words: byId("count-words"),
  chars: byId("count-chars"),
  saved: byId("saved"),
  chip: byId<HTMLButtonElement>("problems"),
  problemCount: byId("problem-count"),
  file: byId<HTMLInputElement>("file"),
  autoConvert: byId<HTMLInputElement>("auto-convert"),
  zero: byId<HTMLInputElement>("zero"),
  digits: byId<HTMLInputElement>("digits"),
  shortcuts: byId<HTMLDialogElement>("shortcuts"),
  popover: byId("popover"),
};

let settings: Settings = { mode: "kannada", font: "sans", autoConvert: true, zero: true, digits: false };
let fileName = "kannada";
let countTimer: ReturnType<typeof setTimeout> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const files = () => import("./files.ts");

/** Shows a short message by the toolbar, with an optional action, and reads it to screen readers. */
function say(text: string, action?: { label: string; run: () => void }): void {
  ui.toastText.textContent = text;
  ui.announce.textContent = text;
  ui.toastAction.hidden = !action;
  ui.toastAction.onclick = null;
  if (action) {
    ui.toastAction.textContent = action.label;
    ui.toastAction.onclick = () => {
      hideToast();
      action.run();
    };
  }
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 10000 : 5000);
}

function hideToast(): void {
  if (ui.toast.contains(document.activeElement)) return;
  ui.toast.hidden = true;
}

ui.toast.addEventListener("focusout", () => {
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 3000);
});

const convert = (text: string, layout: Layout | "auto" = "auto") =>
  kannadi.convertLegacy(text, { zeroAsAnusvara: settings.zero, kannadaDigits: settings.digits, layout });

const io = { convert, bestLayout: kannadi.bestLayout, decodeWindows1252: kannadi.decodeWindows1252 };

function layoutNames(layouts: Layout[] = []): string {
  const names = layouts.map((l) => LAYOUT_NAMES[l] ?? l);
  return names.length ? names.join(", and from ") : "a legacy font";
}

function report(result: Result, what: string): void {
  const issues = result.unknown.length;
  say(
    `${what}: ${plural(result.converted ?? 0, "character", "characters")} converted from ${layoutNames(result.layouts)}.` +
      (issues ? ` ${plural(issues, "glyph", "glyphs")} to check.` : ""),
  );
}

// The document stays read-only until the converter has loaded.
try {
  await kannadi.init();
} catch (e) {
  say("This browser could not load the editor. A recent Chrome, Edge, Firefox or Safari will work.");
  throw e;
}

const editor = new DocEditor(ui.doc, (edit, after, inputType) => {
  if (inputType !== "compose") english.edited();
  issues.edited(edit, after);
  composer.handle(edit, after, inputType);
  update(after);
});

const issues = new Issues(editor, kannadi, {
  list: byId("problem-list"),
  more: byId("problem-more"),
  popover: ui.popover,
  scheme: () => (composer.mode === "iso15919" ? "iso15919" : "baraha"),
  onChange(i) {
    ui.chip.hidden = i.total === 0;
    ui.chip.dataset.kind = i.unknown.length ? "unknown" : "malformed";
    ui.problemCount.textContent = i.total.toLocaleString("en-IN");
    ui.chip.setAttribute("aria-label", `${plural(i.total, "problem", "problems")} to check`);
    if (i.total === 0) byId("problems-panel").hidePopover?.();
    // Keeping a spelling changes no text, so save here too.
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  },
});

const english = new EnglishTyping({
  kannadi: { phoneticKey: kannadi.phoneticKey, latinKey: kannadi.latinKey, transliterate: (latin) => kannadi.transliterate(latin, "baraha", "kannada") },
  async loadWords() {
    const res = await fetch(wordsUrl);
    if (!res.ok) throw new Error(`word list: HTTP ${res.status}`);
    return res.text();
  },
  picks: {
    read() {
      try {
        return JSON.parse(localStorage.getItem(PICKS) ?? "[]");
      } catch {
        return [];
      }
    },
    write(picks) {
      try {
        localStorage.setItem(PICKS, JSON.stringify(picks));
      } catch {
        // Remembered choices are a convenience; the editor works without them.
      }
    },
  },
  strip: new SuggestStrip(byId("suggest"), (start, end) => editor.rect(start, end), (i) => english.pick(i)),
  text: () => editor.text,
  replace: (start, end, text) => editor.replace(start, end, text),
  caret: () => {
    const sel = editor.selection();
    return sel && sel.start === sel.end ? sel.start : null;
  },
  select: (at) => editor.select(at),
  announce: (message) => (ui.announce.textContent = message),
});

const composer = new Composer(
  editor,
  (latin, mode) => (mode === "english" ? english.spell(latin) : kannadi.transliterate(latin, mode, "kannada")),
  {
    onComposing: (range) => editor.highlight("composing", range),
    onWord: (word) => {
      if (composer.mode === "english") english.typing(word);
    },
    onDone: (word, kept) => {
      if (composer.mode === "english") english.done(word, kept);
    },
  },
);
english.attach(composer);

/** Shows a count and its noun, singular for 1: "1 word", "2 words". */
function showCount(el: HTMLElement, n: number): void {
  el.textContent = n.toLocaleString("en-IN");
  const noun = el.nextElementSibling as HTMLElement | null;
  if (noun?.dataset.one) noun.textContent = n === 1 ? noun.dataset.one : `${noun.dataset.one}s`;
}

function update(text: string): void {
  ui.welcome.hidden = text.length > 0;
  showCount(ui.chars, text.length);
  clearTimeout(countTimer);
  countTimer = setTimeout(() => {
    const current = editor.text;
    showCount(ui.words, countWords(current));
    showCount(ui.aksharas, kannadi.countAksharas(current));
  }, Math.min(600, 80 + text.length / 10000));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 500);
}

function save(): void {
  const unknown = issues.unknown.map((u) => u.offset);
  const kept = issues.kept.map((k) => k.offset);
  const ok = store.write({ text: editor.text, unknown, kept, settings, fileName });
  if (!editor.text) ui.saved.textContent = "";
  else ui.saved.textContent = ok ? "Saved on this device" : "Too large to keep on this device";
}

function saveSettings(): void {
  clearTimeout(saveTimer);
  save();
}

/** Inserts text at the selection and returns where it starts. */
function insert(result: Result, what?: string): number {
  const sel = editor.selection() ?? { start: editor.text.length, end: editor.text.length };
  editor.replace(sel.start, sel.end, result.text);
  issues.addUnknown(result.unknown.map((o) => sel.start + o));
  if (result.converted && what) report(result, what);
  return sel.start;
}

async function open(file: File | undefined): Promise<void> {
  if (!file) return;
  try {
    const result = await (await files()).openFile(file, io);
    issues.clear();
    editor.setText(result.text);
    issues.addUnknown(result.unknown);
    editor.el.focus();
    editor.select(0);
    fileName = file.name.replace(/\.[^.]*$/, "") || "kannada";
    if (result.converted) report(result, `Opened ${file.name}`);
    else say(`Opened ${file.name}. Nothing in it needed converting.`);
  } catch (e) {
    say(`Could not open ${file.name}. ${e instanceof Error ? e.message : ""}`.trim());
  }
}

function download(blob: Blob, name: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function exportAs(format: ExportFormat | "nudi"): Promise<void> {
  issues.flush();
  byId("save-menu").hidePopover();
  if (format === "nudi") {
    const encoded = kannadi.toNudi(editor.text);
    const bytes = kannadi.encodeWindows1252(encoded.text);
    const chars = Array.from(encoded.text);
    const questionMarks = chars.filter((c, i) => bytes[i] === 0x3f && c !== "?").length;
    const name = `${fileName}-nudi.txt`;
    download(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "text/plain;charset=windows-1252" }), name);
    const notes = nudiNotes(encoded.unencodable.length, encoded.malformed.length / 2, questionMarks);
    say(`Saved ${name}. Set it in a Nudi or BRH font to read it. ${notes}`.trim());
    return;
  }
  const name = `${fileName}.${format}`;
  try {
    download(await (await files()).exportBlob(editor.text, format, fileName), name);
  } catch {
    say(`Could not save ${name}. Reload the page and try again.`);
    return;
  }
  settings.lastFormat = format;
  saveSettings();
  say(`Saved ${name} to your downloads.`);
}

/** The selected range, or the whole document when nothing is selected. */
function selectionOrAll(): { start: number; end: number; whole: boolean } {
  const sel = editor.selection();
  if (!sel || sel.start === sel.end) return { start: 0, end: editor.text.length, whole: true };
  return { ...sel, whole: false };
}

/** Applies a text transform to the selection, or to the whole document. */
function transform(fn: (text: string) => string, done: string): void {
  const { start, end, whole } = selectionOrAll();
  const before = editor.text.slice(start, end);
  const after = fn(before);
  if (after === before) {
    say(`${done}: nothing to change.`);
    return;
  }
  editor.replace(start, end, after);
  say(`${done}${whole ? "" : " in the selection"}. Undo with Ctrl+Z.`);
}

function convertSelection(): void {
  const { start, end, whole } = selectionOrAll();
  const result = convert(editor.text.slice(start, end));
  editor.replace(start, end, result.text);
  issues.addUnknown(result.unknown.map((o) => start + o));
  report({ ...result, converted: end - start, layouts: [result.layout] }, whole ? "Converted the document" : "Converted the selection");
}

function setMode(mode: TypingMode, remember = true): void {
  composer.setMode(mode);
  if (mode !== "english") english.hide();
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) input.checked = input.value === mode;
  settings.mode = remember ? mode : settings.mode;
  if (remember) saveSettings();
}

function setFont(font: Settings["font"], remember = true): void {
  settings.font = font;
  document.documentElement.dataset.font = font;
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="font"]')) input.checked = input.value === font;
  if (remember) saveSettings();
}

function nextProblem(dir: number): void {
  const first = ui.popover.querySelector<HTMLButtonElement>(".pop-actions button");
  if (issues.open && first && !ui.popover.contains(document.activeElement)) {
    first.focus();
    return;
  }
  const sel = editor.selection();
  const at = sel ? (dir > 0 ? sel.end : sel.start) : -1;
  const item = issues.next(at, dir);
  if (item) issues.show(item, true);
  else say("Nothing is marked.");
}

async function copy(text: string, done: string, failed: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    say(done);
  } catch {
    say(failed);
  }
}

const ACTIONS: Record<string, () => void> = {
  convert: convertSelection,
  open: () => ui.file.click(),
  iso: () => {
    setMode("iso15919");
    editor.el.focus();
  },
  normalize: () => transform(kannadi.normalize, "Normalized"),
  modernize: () => transform(kannadi.modernize, "Modernized Old Kannada letters"),
  new: () => {
    issues.clear();
    editor.setText("");
    fileName = "kannada";
    editor.el.focus();
    say("New document. Undo with Ctrl+Z to get the last one back.");
  },
  shortcuts: () => ui.shortcuts.showModal(),
  copy: () => {
    issues.flush();
    void copy(editor.text, "Copied the whole document.", "Could not copy. Select the text and copy it by hand.");
  },
  "copy-nudi": () => {
    issues.flush();
    const encoded = kannadi.toNudi(editor.text);
    const notes = nudiNotes(encoded.unencodable.length, encoded.malformed.length / 2);
    void copy(encoded.text, `Copied as Nudi. Paste it into Word and set a Nudi or BRH font. ${notes}`.trim(), "Could not copy. Save as Nudi text instead.");
  },
};

/** Voice typing, where the browser offers Kannada speech recognition. */
function wireVoice(): void {
  const Recognition = recognitionClass();
  const mic = byId<HTMLButtonElement>("voice");
  const heard = byId("heard");
  if (!Recognition) return;
  mic.hidden = false;
  const voice = new Voice(Recognition, {
    onText(final, interim) {
      if (final) {
        composer.commit();
        const sel = editor.selection() ?? { start: editor.text.length, end: editor.text.length };
        const before = editor.text.slice(0, sel.start);
        insert({ text: (before && !/\s$/.test(before) ? " " : "") + final.trim(), unknown: [] });
      }
      heard.textContent = interim || "Listening";
    },
    onState(listening, error) {
      mic.setAttribute("aria-pressed", String(listening));
      heard.hidden = !listening;
      heard.textContent = "Listening";
      if (listening) ui.announce.textContent = "Listening. Speak in Kannada; select the microphone again to stop.";
      else say(error ?? "Stopped listening.");
    },
  });
  // Keep the caret in the document, where the words go.
  mic.addEventListener("pointerdown", (e) => e.preventDefault());
  mic.addEventListener("click", () => {
    editor.el.focus();
    voice.toggle();
  });
}

function wire(): void {
  wireVoice();
  ui.doc.addEventListener("beforeinput", (e) => composer.beforeInput(e));
  ui.doc.addEventListener("paste", (e) => {
    e.preventDefault();
    const html = e.clipboardData?.getData("text/html") ?? "";
    const plain = e.clipboardData?.getData("text/plain") ?? "";
    if (!settings.autoConvert) {
      insert({ text: plain, unknown: [] });
      return;
    }
    void files().then(({ pasted }) => {
      const result = pasted(html, plain, io);
      const start = insert(result, "Pasted");
      if (!result.converted) return;
      say(ui.toastText.textContent ?? "", {
        label: "Paste as is",
        run: () => {
          if (editor.text.slice(start, start + result.text.length) !== result.text) {
            say("The pasted text has changed since, so it was left as it is.");
            return;
          }
          editor.replace(start, start + result.text.length, plain);
          say("Pasted as is, without converting.");
        },
      });
    }, () => {
      insert({ text: plain, unknown: [] });
      say("Pasted as is: the converter did not load. Reload the page to convert pasted text.");
    });
  });
  ui.doc.addEventListener("click", () => {
    const sel = editor.selection();
    if (!sel || sel.start !== sel.end) return;
    issues.flush();
    const item = issues.at(sel.start);
    if (!item) return;
    issues.popover(item, false);
    ui.announce.textContent = `${PROBLEM_NAMES[item.kind]} here. Press F8 for its fixes.`;
  });
  ui.doc.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && composer.mode === "english" && english.cycle(e.shiftKey)) e.preventDefault();
    if (e.key === "Escape") english.hide();
    if (e.key === "Escape" && composer.revert()) e.preventDefault();
    if (e.key === "Escape" && issues.open) issues.close(false);
  });
  byId("sheet").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) editor.el.focus();
  });
  document.addEventListener("selectionchange", () => {
    composer.selectionChanged();
    const sel = editor.selection();
    english.caretMoved(sel && sel.start === sel.end ? sel.start : null);
  });
  // The word list loads when someone starts typing in English letters, not with the page.
  ui.doc.addEventListener("focus", () => {
    if (composer.mode === "english") void english.prepare();
  });
  ui.doc.addEventListener("focusout", () => {
    composer.commit();
    english.hide();
  });
  document.addEventListener("pointerdown", (e) => {
    if (issues.open && !ui.popover.contains(e.target as Node) && e.target !== ui.doc) issues.close(false);
  });

  byId("open").addEventListener("click", () => ui.file.click());
  ui.file.addEventListener("change", () => {
    void open(ui.file.files?.[0]);
    ui.file.value = "";
  });
  document.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      document.body.classList.add("dragging");
    }
  });
  document.addEventListener("dragleave", (e) => {
    if (e.relatedTarget === null) document.body.classList.remove("dragging");
  });
  document.addEventListener("drop", (e) => {
    document.body.classList.remove("dragging");
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    e.preventDefault();
    void open(file);
  });

  document.getElementById("sample")?.addEventListener("click", () => {
    const result = { ...convert(SAMPLE, "nudi"), converted: SAMPLE.length };
    issues.clear();
    editor.setText(result.text);
    issues.addUnknown(result.unknown);
    fileName = "sample";
    say("Converted part of a 2002 Karnataka government page, typed in BRH Kannada.");
  });
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-run]")) {
    b.addEventListener("click", () => {
      b.closest<HTMLElement>("[popover]")?.hidePopover();
      ACTIONS[b.dataset.run!]?.();
    });
  }
  byId("convert").addEventListener("click", convertSelection);
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-export]")) {
    b.addEventListener("click", () => void exportAs(b.dataset.export as ExportFormat | "nudi"));
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
    input.addEventListener("change", () => {
      setMode(input.value as TypingMode);
      editor.el.focus();
    });
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="font"]')) {
    input.addEventListener("change", () => setFont(input.value as Settings["font"]));
  }
  ui.autoConvert.addEventListener("change", () => {
    settings.autoConvert = ui.autoConvert.checked;
    saveSettings();
  });
  ui.zero.addEventListener("change", () => {
    settings.zero = ui.zero.checked;
    saveSettings();
  });
  ui.digits.addEventListener("change", () => {
    settings.digits = ui.digits.checked;
    saveSettings();
  });

  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey && e.key.toLowerCase() === "o") {
      e.preventDefault();
      ui.file.click();
    } else if (mod && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void exportAs(settings.lastFormat ?? "docx");
    } else if (mod && e.key === "/") {
      e.preventDefault();
      ui.shortcuts.showModal();
    } else if (e.altKey && !mod && /^Digit[1-4]$/.test(e.code)) {
      e.preventDefault();
      setMode(MODES[Number(e.code.slice(5)) - 1]!);
      const label = document.querySelector<HTMLElement>(`label[for="mode-${settings.mode}"]`);
      say(`Typing with ${label?.dataset.name ?? settings.mode}.`);
    } else if (e.key === "F8") {
      e.preventDefault();
      nextProblem(e.shiftKey ? -1 : 1);
    }
  });
  addEventListener("pagehide", save);

  // iOS keeps fixed elements behind the on-screen keyboard; --kb lifts them above it.
  const vv = window.visualViewport;
  if (vv) {
    const inset = () => {
      // A pinch zoom also shrinks the visual viewport; only a keyboard should lift the dock.
      if (vv.scale !== 1) return;
      document.documentElement.style.setProperty("--kb", `${Math.max(0, innerHeight - vv.height - vv.offsetTop)}px`);
    };
    vv.addEventListener("resize", inset);
    vv.addEventListener("scroll", inset);
  }
  if (/Mac|iPhone|iPad/.test(navigator.platform)) {
    for (const el of document.querySelectorAll<HTMLElement>("[data-shortcut]")) el.textContent = el.textContent!.replace("Ctrl", "⌘");
  }
}

function restore(): void {
  const saved = store.read();
  if (saved?.settings) settings = { ...settings, ...saved.settings };
  ui.autoConvert.checked = settings.autoConvert;
  ui.zero.checked = settings.zero;
  ui.digits.checked = settings.digits;
  // Typing pages open ready to type in English letters, without changing the saved choice.
  const pageMode = ui.section.dataset.defaultMode as TypingMode | undefined;
  if (pageMode && pageMode !== "kannada") setMode(pageMode, false);
  else setMode(MODES.includes(settings.mode) ? settings.mode : "kannada", false);
  setFont(settings.font === "serif" ? "serif" : "sans", false);
  if (saved?.text) {
    ui.doc.textContent = saved.text;
    editor.sync("restore", false);
    issues.addUnknown((saved.unknown ?? []).filter((o) => Number.isInteger(o) && o < saved.text.length));
    issues.keep((saved.kept ?? []).filter(Number.isInteger));
    fileName = saved.fileName ?? "kannada";
    if (looksLegacy(saved.text)) say("Welcome back. Some of this still looks like Nudi, Baraha or Akruti: select it and choose Convert.");
  } else {
    update("");
  }
  issues.check();
}

wire();
restore();
document.documentElement.classList.add("ready");
const modelContext = resolveModelContext(document, navigator);
if (modelContext) {
  void import("./tools.ts")
    .then(({ editorTools }) => registerWhenIdle(modelContext, editorTools(kannadi)))
    .catch((e) => console.warn("WebMCP: the tools did not load", e));
}
setTimeout(() => void files().catch(() => {}), 1500);
