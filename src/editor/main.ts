// Wires the editor page: the document, the toolbar and its menus, files,
// shortcuts and autosave. File readers and writers load on first use.
import wordsUrl from "../../data/words.tsv?url";
import { Composer } from "./compose.ts";
import { DocEditor } from "./editor.ts";
import type { ExportFormat } from "./files.ts";
import { doneWith, sessionStore, takeText } from "../lib/handoff.ts";
import { registerWhenIdle, resolveModelContext } from "../lib/model-context.ts";
import { Issues } from "./issues.ts";
import * as kannadi from "./kannadi.ts";
import { EnglishTyping } from "./english.ts";
import { SuggestStrip } from "./strip.ts";
import { View } from "./view.ts";
import type { Plural } from "../i18n/core.ts";
import { count, type EditorStrings, fmt, nodes, num, pick, S } from "./strings.ts";
import { convertPlan, countWords, type Layout, looksLegacy, nudiNotes, type TypingMode } from "./text.ts";
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
let fileName = S.files.defaultName;
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
  const names = layouts.map((l) => S.convert.layouts[l] ?? l);
  return names.length ? names.reduce((first, second) => fmt(S.convert.andFrom, { first, second })) : S.convert.legacyFont;
}

function report(result: Result, what: string): void {
  const issues = result.unknown.length;
  const done = count(result.converted ?? 0, S.convert.report, { what, from: layoutNames(result.layouts) });
  say(issues ? `${done} ${count(issues, S.convert.glyphs)}` : done);
}

// The document stays read-only until the converter has loaded.
try {
  await kannadi.init();
} catch (e) {
  say(S.editor.loadFailed);
  throw e;
}

const editor = new DocEditor(ui.doc, (edit, after, inputType) => {
  if (inputType !== "compose") english.edited();
  issues.edited(edit, after);
  composer.handle(edit, after, inputType);
  update(after);
  view.keepCaret();
});

const view = new View(editor, {
  dock: document.querySelector<HTMLElement>(".dock")!,
  toolbar: document.querySelector<HTMLElement>(".toolbar")!,
  sheet: byId("sheet"),
  strip: byId("suggest"),
});

const issues = new Issues(editor, kannadi, {
  list: byId("problem-list"),
  more: byId("problem-more"),
  popover: ui.popover,
  scheme: () => (composer.mode === "iso15919" ? "iso15919" : "baraha"),
  onChange(i) {
    ui.chip.hidden = i.total === 0;
    ui.chip.dataset.kind = i.unknown.length ? "unknown" : "malformed";
    ui.problemCount.textContent = num(i.total);
    ui.chip.setAttribute("aria-label", count(i.total, S.problems.chipLabel));
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
  strip: new SuggestStrip(byId("suggest"), { rect: (start, end) => editor.rect(start, end), avoid: () => view.avoid() }, (i) => english.pick(i)),
  text: () => editor.text,
  replace: (start, end, text) => editor.replace(start, end, text),
  caret: () => {
    const sel = editor.selection();
    return sel && sel.start === sel.end ? sel.start : null;
  },
  select: (at) => editor.select(at),
  announce: (message) => (ui.announce.textContent = message),
  onReady: () => (ui.section.dataset.words = "ready"),
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

/** Shows a count in its sentence, "1 word" or "2 words", keeping the number's own element. */
function showCount(el: HTMLElement, n: number, forms: Plural): void {
  el.textContent = num(n);
  el.parentElement?.replaceChildren(...nodes(pick(n, forms), { n: el }));
}

function update(text: string): void {
  ui.welcome.hidden = text.length > 0;
  showCount(ui.chars, text.length, S.counts.characters);
  clearTimeout(countTimer);
  countTimer = setTimeout(() => {
    const current = editor.text;
    showCount(ui.words, countWords(current), S.counts.words);
    showCount(ui.aksharas, kannadi.countAksharas(current), S.counts.aksharas);
  }, Math.min(600, 80 + text.length / 10000));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 500);
}

function save(): void {
  const unknown = issues.unknown.map((u) => u.offset);
  const kept = issues.kept.map((k) => k.offset);
  const ok = store.write({ text: editor.text, unknown, kept, settings, fileName });
  if (!editor.text) ui.saved.textContent = "";
  else ui.saved.textContent = ok ? S.files.savedHere : S.files.tooLarge;
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
    fileName = file.name.replace(/\.[^.]*$/, "") || S.files.defaultName;
    if (result.converted) report(result, fmt(S.convert.opened, { name: file.name }));
    else say(fmt(S.files.nothingToConvert, { name: file.name }));
  } catch (e) {
    const kind = (e as { kind?: unknown }).kind;
    if (kind === "doc" || kind === "pdf" || kind === "other") say(fmt(S.files.notText[kind], { name: file.name }));
    else say(fmt(S.files.openFailed, { name: file.name, error: e instanceof Error ? e.message : "" }).trim());
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
    say(fmt(S.files.savedNudi, { name, notes }).trim());
    return;
  }
  const name = `${fileName}.${format}`;
  try {
    download(await (await files()).exportBlob(editor.text, format, fileName), name);
  } catch {
    say(fmt(S.files.saveFailed, { name }));
    return;
  }
  settings.lastFormat = format;
  saveSettings();
  say(fmt(S.files.saved, { name }));
}

/** The selected range, or the whole document when nothing is selected. */
function selectionOrAll(): { start: number; end: number; whole: boolean } {
  const sel = editor.selection();
  if (!sel || sel.start === sel.end) return { start: 0, end: editor.text.length, whole: true };
  return { ...sel, whole: false };
}

/** Applies a text transform to the selection, or to the whole document. */
function transform(fn: (text: string) => string, done: EditorStrings["edit"]["normalize"]): void {
  const { start, end, whole } = selectionOrAll();
  const before = editor.text.slice(start, end);
  const after = fn(before);
  if (after === before) {
    say(done.nothing);
    return;
  }
  editor.replace(start, end, after);
  say(whole ? done.whole : done.selection);
}

function convertSelection(): void {
  const { start, end, whole } = selectionOrAll();
  const text = editor.text.slice(start, end);
  const layout = kannadi.bestLayout(text);
  const plan = convertPlan(text, (line) => kannadi.isUnicode(line, layout));
  if (plan === "empty") {
    say(S.convert.nothing);
    return;
  }
  if (plan === "unicode") {
    say(whole ? S.convert.unicodeDocument : S.convert.unicodeSelection);
    return;
  }
  const result = convert(text);
  editor.replace(start, end, result.text);
  issues.addUnknown(result.unknown.map((o) => start + o));
  report({ ...result, converted: end - start, layouts: [result.layout] }, whole ? S.convert.document : S.convert.selection);
}

function setMode(mode: TypingMode, remember = true): void {
  composer.setMode(mode);
  if (mode !== "english") english.hide();
  // Choosing English letters loads the word list; a page that opens in them only fetches it, to stay responsive.
  else if (remember) void english.prepare();
  else english.prefetch();
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
  const item = sel ? issues.next(sel.start, sel.end, dir) : issues.next(-1, -1, dir);
  if (item) issues.show(item, true);
  else say(S.problems.noneMarked);
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
  normalize: () => transform(kannadi.normalize, S.edit.normalize),
  modernize: () => transform(kannadi.modernize, S.edit.modernize),
  new: () => {
    issues.clear();
    editor.setText("");
    fileName = S.files.defaultName;
    editor.el.focus();
    say(S.edit.newDocument);
  },
  shortcuts: () => ui.shortcuts.showModal(),
  copy: () => {
    issues.flush();
    void copy(editor.text, S.copy.done, S.copy.failed);
  },
  "copy-nudi": () => {
    issues.flush();
    const encoded = kannadi.toNudi(editor.text);
    const notes = nudiNotes(encoded.unencodable.length, encoded.malformed.length / 2);
    void copy(encoded.text, fmt(S.copy.nudi, { notes }).trim(), S.copy.nudiFailed);
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
      heard.textContent = interim || S.voice.listening;
    },
    onState(listening, error) {
      mic.setAttribute("aria-pressed", String(listening));
      heard.hidden = !listening;
      heard.textContent = S.voice.listening;
      if (listening) ui.announce.textContent = S.voice.started;
      else say(error ?? S.voice.stopped);
    },
  });
  // Keep the caret in the document, where the words go.
  mic.addEventListener("pointerdown", (e) => e.preventDefault());
  mic.addEventListener("click", () => {
    editor.el.focus();
    voice.toggle();
  });
}

/** Inserts pasted text at the selection, converting legacy font text, with a way to keep it as it was. */
function paste(html: string, plain: string): Promise<void> {
  if (!settings.autoConvert) {
    insert({ text: plain, unknown: [] });
    return Promise.resolve();
  }
  return files().then(({ pasted }) => {
    const result = pasted(html, plain, io);
    const start = insert(result, S.convert.pasted);
    if (!result.converted) return;
    say(ui.toastText.textContent ?? "", {
      label: S.paste.asIs,
      run: () => {
        if (editor.text.slice(start, start + result.text.length) !== result.text) {
          say(S.paste.changed);
          return;
        }
        editor.replace(start, start + result.text.length, plain);
        say(S.paste.pastedAsIs);
      },
    });
  }, () => {
    insert({ text: plain, unknown: [] });
    say(S.paste.noConverter);
  });
}

/** Text brought from the home page goes in as a paste, after anything already in the document. */
function receive(): void {
  const store = sessionStore();
  const handed = takeText(store);
  if (!handed) return;
  const end = editor.text.length;
  if (end) editor.replace(end, end, "\n\n", "insertText");
  editor.select(editor.text.length);
  // The document is saved before the handed text is removed, so a reload in between loses nothing.
  void paste(handed.html, handed.text)
    .catch(() => insert({ text: handed.text, unknown: [] }))
    .finally(() => {
      save();
      doneWith(store);
    });
}

function wire(): void {
  wireVoice();
  ui.doc.addEventListener("beforeinput", (e) => composer.beforeInput(e));
  ui.doc.addEventListener("paste", (e) => {
    e.preventDefault();
    void paste(e.clipboardData?.getData("text/html") ?? "", e.clipboardData?.getData("text/plain") ?? "");
  });
  ui.doc.addEventListener("click", () => {
    const sel = editor.selection();
    if (!sel || sel.start !== sel.end) return;
    issues.flush();
    const item = issues.at(sel.start);
    if (!item) return;
    issues.popover(item, false);
    ui.announce.textContent = fmt(S.problems.here, { problem: S.problems.names[item.kind] });
  });
  ui.doc.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && composer.mode === "english" && english.cycle(e.shiftKey)) e.preventDefault();
    if (e.key === "Escape") english.hide();
    if (e.key === "Escape" && composer.revert()) e.preventDefault();
    if (e.key === "Escape" && issues.open) issues.close(false);
  });
  // A click in the sheet's margin puts the caret at the nearest place in the text, without jumping to the top.
  byId("sheet").addEventListener("click", (e) => {
    if (e.target !== e.currentTarget) return;
    editor.el.focus({ preventScroll: true });
    const box = editor.el.getBoundingClientRect();
    if (e.clientY >= box.bottom || !editor.text) {
      editor.select(editor.text.length);
      return;
    }
    const x = Math.min(Math.max(e.clientX, box.left + 1), box.right - 1);
    const y = Math.max(e.clientY, box.top + 1);
    const at = document.caretPositionFromPoint?.(x, y) ?? null;
    const node = at?.offsetNode ?? document.caretRangeFromPoint?.(x, y)?.startContainer;
    const offset = at?.offset ?? document.caretRangeFromPoint?.(x, y)?.startOffset ?? 0;
    editor.select(node && editor.el.contains(node) ? Math.min(editor.offsetOf(node, offset), editor.text.length) : editor.text.length);
  });
  document.addEventListener("selectionchange", () => {
    composer.selectionChanged();
    const sel = editor.selection();
    english.caretMoved(sel && sel.start === sel.end ? sel.start : null);
    view.keepCaret();
  });
  // The word list loads when English letters are chosen, or the page opens in them, and not with any other page.
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
    fileName = S.files.sampleName;
    say(S.convert.sample);
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
    input.addEventListener("change", () => setMode(input.value as TypingMode));
    // A click on the chosen mode changes nothing, but the keys that follow still belong in the document.
    input.addEventListener("click", () => editor.el.focus({ preventScroll: true }));
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
      say(fmt(S.modes.typingWith, { name: S.modes[settings.mode].name }));
    } else if (e.key === "F8") {
      e.preventDefault();
      nextProblem(e.shiftKey ? -1 : 1);
    }
  });
  addEventListener("pagehide", save);

  // iOS keeps fixed elements behind the on-screen keyboard; --kb lifts them above it.
  const vv = window.visualViewport;
  if (vv) {
    // The tallest the visual viewport has been at this width: its height with no keyboard open.
    let full = vv.height;
    let width = vv.width;
    let last = vv.height;
    const inset = () => {
      // A pinch zoom also shrinks the visual viewport; only a keyboard should lift the dock.
      if (vv.scale !== 1) return;
      document.documentElement.style.setProperty("--kb", `${Math.max(0, innerHeight - vv.height - vv.offsetTop)}px`);
      if (vv.width !== width) [full, width] = [vv.height, vv.width];
      full = Math.max(full, vv.height);
      // A keyboard opening, even in small steps, covers the caret; scrolling or the address bar must not pull the page back to it.
      if (vv.height < full - 100 && vv.height < last) view.keepCaret();
      last = vv.height;
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
  // A mode picked while the converter loaded wins; otherwise typing pages open in English letters, keeping the saved choice.
  const picked = [...document.querySelectorAll<HTMLInputElement>('input[name="mode"]')].find((i) => i.checked && !i.defaultChecked);
  const pageMode = ui.section.dataset.defaultMode as TypingMode | undefined;
  if (picked) setMode(picked.value as TypingMode);
  else if (pageMode && pageMode !== "kannada") setMode(pageMode, false);
  else setMode(MODES.includes(settings.mode) ? settings.mode : "kannada", false);
  if (picked && document.activeElement === picked) editor.el.focus({ preventScroll: true });
  setFont(settings.font === "serif" ? "serif" : "sans", false);
  if (saved?.text) {
    ui.doc.textContent = saved.text;
    editor.sync("restore", false);
    const offsets = (list: unknown) => (Array.isArray(list) ? list.filter((o): o is number => Number.isInteger(o) && o < saved.text.length) : []);
    issues.addUnknown(offsets(saved.unknown));
    issues.keep(offsets(saved.kept));
    fileName = saved.fileName ?? S.files.defaultName;
    if (looksLegacy(saved.text)) say(S.editor.welcomeBack);
  } else {
    update("");
  }
  issues.check();
}

wire();
restore();
receive();
document.documentElement.classList.add("ready");
const modelContext = resolveModelContext(document, navigator);
if (modelContext) {
  void import("./tools.ts")
    .then(({ editorTools }) => registerWhenIdle(modelContext, editorTools(kannadi)))
    .catch((e) => console.warn("WebMCP: the tools did not load", e));
}
setTimeout(() => void files().catch(() => {}), 1500);
