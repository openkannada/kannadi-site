// Shared steps for the editor's browser tests: opening the editor, choosing a mode, reading the text, and
// measuring where the caret, the toolbar and the suggestions sit on screen.
import { expect, type Page, type TestInfo } from "@playwright/test";

export type Mode = "kannada" | "english" | "baraha" | "iso15919";
export const MODES: Mode[] = ["kannada", "english", "baraha", "iso15919"];
export const KANNADA_WORD = /^[ಀ-೿‌]+$/u;

/** Whether this project is a phone: a touch screen under 48rem, where the toolbar docks at the bottom. */
export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;

/** Opens the editor and waits until it takes input; with a mode, chooses it and waits for its word list. */
export async function openEditor(page: Page, options: { path?: string; mode?: Mode } = {}): Promise<void> {
  await page.goto(options.path ?? "/editor/");
  await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
  if (options.mode) await chooseMode(page, options.mode);
}

/** Chooses a typing mode the way a person does: its button, or the menu where the button is hidden on phones. */
export async function chooseMode(page: Page, mode: Mode): Promise<void> {
  const label = page.locator(`label[for="mode-${mode}"]`);
  if (await label.isVisible()) {
    await (isPhone(page) ? label.tap() : label.click());
  } else {
    await openMenu(page, "tools-menu");
    await page.locator('[data-run="iso"]').click();
  }
  await expect(page.locator(`#mode-${mode}`)).toBeChecked();
  if (mode === "english") await wordsReady(page);
}

/** Opens a toolbar menu and waits until it has risen into place; a click while it moves can land outside and close it. */
export async function openMenu(page: Page, id: "save-menu" | "tools-menu"): Promise<void> {
  await page.locator(`[popovertarget="${id}"]`).click();
  await expect(page.locator(`#${id}`)).toBeVisible();
  await page.evaluate((id) => Promise.all(document.getElementById(id)!.getAnimations({ subtree: true }).map((a) => a.finished)), id);
}

/** Waits for the English-letters word list to load and index. */
export async function wordsReady(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".editor")?.dataset.words === "ready", null, { timeout: 15_000 });
}

/** Clicks into the document at its end, as a person starting to type would. */
export async function focusDoc(page: Page): Promise<void> {
  // Near the top left, where typing starts; the sample button can sit at the middle of an empty document.
  const doc = page.locator("#doc");
  const position = { x: 12, y: 12 };
  await (isPhone(page) ? doc.tap({ position }) : doc.click({ position }));
  await page.evaluate(() => {
    const doc = document.getElementById("doc")!;
    const node = doc.firstChild;
    const end = (node?.textContent ?? "").replace(/\n$/, "").length;
    getSelection()?.collapse(node ?? doc, node ? end : 0);
  });
}

/**
 * The document's text, without the extra final line break that gives an empty last line its place. That break comes
 * only after a line break of the text's own, so a single final break is left in: a stray one shows.
 */
export const docText = (page: Page) =>
  page.evaluate(() => {
    const text = document.getElementById("doc")?.textContent ?? "";
    return text.endsWith("\n\n") ? text.slice(0, -1) : text;
  });

/** The text as saved on this device, half a second after the last edit; exact, unlike the element's text. */
export const savedText = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem("kannadi.editor.v1") ?? "{}") as { text?: string }).text ?? null);

/** Waits until the page has stopped scrolling, as it has long before anyone reads or scrolls on. */
export async function settle(page: Page): Promise<number> {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => new Promise<number>((done) => setTimeout(() => requestAnimationFrame(() => done(scrollY)), 150)));
    if (y === last) return y;
    last = y;
  }
  return last;
}

/** Puts the caret at a text offset. */
export const caretAt = (page: Page, at: number) =>
  page.evaluate((at) => {
    const doc = document.getElementById("doc")!;
    const node = doc.firstChild ?? doc;
    getSelection()?.collapse(node, Math.min(at, node.textContent?.length ?? 0));
  }, at);

/** The suggestions on the strip, or [] when it is hidden. */
export const suggestions = (page: Page) =>
  page.evaluate(() => {
    const strip = document.getElementById("suggest")!;
    return strip.hidden ? [] : [...strip.querySelectorAll("button")].map((b) => b.textContent ?? "");
  });

/** The highlighted suggestion, or null. */
export const currentSuggestion = (page: Page) =>
  page.evaluate(() => document.querySelector('#suggest:not([hidden]) button[aria-current="true"]')?.textContent ?? null);

export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Layout {
  viewport: { width: number; height: number };
  toolbar: Box;
  /** The area that hides text under a stuck toolbar, or null while the toolbar is not over text. */
  band: Box | null;
  strip: Box | null;
  toast: Box | null;
  caret: Box | null;
  /** Each visible line of text, as screen boxes. */
  lines: Box[];
}

/**
 * Where things are on screen. The caret is measured with a marker put at the caret and taken out again, since a
 * collapsed range at the start of an empty line has no box in some browsers.
 */
export const layout = async (page: Page): Promise<Layout> => {
  // What a person sees is the next frame, after the editor has kept the caret in view.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return page.evaluate(() => {
    const box = (r: DOMRect) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    const shown = (el: HTMLElement | null) => (el && !el.hidden && el.getClientRects().length ? box(el.getBoundingClientRect()) : null);
    const doc = document.getElementById("doc")!;
    const sel = getSelection();
    let caret: Box | null = null;
    if (sel?.rangeCount && doc.contains(sel.getRangeAt(0).endContainer)) {
      const range = sel.getRangeAt(0);
      const { endContainer, endOffset } = range;
      const marker = document.createElement("span");
      marker.textContent = "​";
      const at = range.cloneRange();
      at.collapse(false);
      at.insertNode(marker);
      caret = box(marker.getBoundingClientRect());
      marker.remove();
      doc.normalize();
      const node = doc.firstChild;
      if (node && endContainer.nodeType === Node.TEXT_NODE) sel.collapse(node, Math.min(endOffset, node.textContent!.length));
      else sel.collapse(doc, Math.min(endOffset, doc.childNodes.length));
    }
    const lines: Box[] = [];
    const node = doc.firstChild;
    if (node) {
      const all = document.createRange();
      all.selectNodeContents(node);
      for (const r of all.getClientRects()) if (r.width > 1 && r.bottom > 0 && r.top < innerHeight) lines.push(box(r));
    }
    // The band is the dock's ::before, inset from the dock's own box.
    const dock = document.querySelector<HTMLElement>(".dock")!;
    const d = dock.getBoundingClientRect();
    const inset = getComputedStyle(dock, "::before");
    const px = (v: string) => parseFloat(v) || 0;
    const band =
      dock.dataset.stuck !== undefined
        ? { top: d.top + px(inset.top), bottom: d.bottom - px(inset.bottom), left: d.left + px(inset.left), right: d.right - px(inset.right) }
        : null;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      toolbar: box(document.querySelector(".toolbar")!.getBoundingClientRect()),
      band,
      strip: shown(document.getElementById("suggest")),
      toast: shown(document.getElementById("toast")),
      caret,
      lines,
    };
  });
};

export const overlaps = (a: Box, b: Box, slack = 1) =>
  a.top < b.bottom - slack && b.top < a.bottom - slack && a.left < b.right - slack && b.left < a.right - slack;
const covers = (outer: Box, inner: Box) => outer.top <= inner.top + 1 && outer.bottom >= inner.bottom - 1 && outer.left <= inner.left + 1 && outer.right >= inner.right - 1;

/** Checks that the caret line is on screen and clear of the toolbar and the suggestions, and no text shows under the toolbar. */
export async function expectClearLayout(page: Page, info: TestInfo, label: string): Promise<void> {
  const l = await layout(page);
  const problems: string[] = [];
  if (!l.caret) problems.push("no caret in the document");
  else {
    if (l.caret.top < 0 || l.caret.bottom > l.viewport.height) problems.push(`the caret line is off screen at ${Math.round(l.caret.top)}`);
    if (overlaps(l.caret, l.toolbar, 0)) problems.push("the toolbar covers the caret line");
    if (l.band && overlaps(l.caret, l.band, 0)) problems.push("the band under the toolbar covers the caret line");
    if (l.strip && overlaps(l.caret, l.strip, 0)) problems.push("the suggestions cover the caret line");
  }
  if (l.strip && overlaps(l.strip, l.toolbar)) problems.push("the suggestions cover the toolbar");
  for (const line of l.lines) {
    // A line under the toolbar must be hidden whole by the band, never showing beside or through the glass.
    if (overlaps(line, l.toolbar) && !(l.band && covers(l.band, { ...line, top: Math.max(line.top, l.band.top), bottom: Math.min(line.bottom, l.band.bottom) }))) {
      problems.push(`text shows under the toolbar at ${Math.round(line.top)}`);
      break;
    }
  }
  if (problems.length) {
    await info.attach(`${label}.png`, { body: await page.screenshot(), contentType: "image/png" });
    expect(problems, `${label}: ${JSON.stringify(l)}`).toEqual([]);
  }
}
