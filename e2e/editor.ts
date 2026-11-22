// Shared steps for the editor's browser tests: opening the editor, choosing a mode, reading the text, and
// measuring where the caret, the toolbar and the suggestions sit on screen.
import { expect, type Page, type TestInfo } from "@playwright/test";

export type Mode = "kannada" | "english" | "baraha" | "iso15919";
export const MODES: Mode[] = ["kannada", "english", "baraha", "iso15919"];
export const KANNADA_WORD = /^[ಀ-೿‌]+$/u;

/** Whether this project is a phone: a touch screen under 48rem, where the toolbar docks at the bottom. */
export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;

/** EDITOR_NEXT=1 runs every test on the ProseMirror editor, which ?editor=next opens. */
export const NEXT = process.env.EDITOR_NEXT === "1";

/** A page's address, on the ProseMirror editor when EDITOR_NEXT=1. */
export const editorPath = (path: string) => (NEXT ? `${path}${path.includes("?") ? "&" : "?"}editor=next` : path);

/** Opens the editor and waits until it takes input; with a mode, chooses it and waits for its word list. */
export async function openEditor(page: Page, options: { path?: string; mode?: Mode } = {}): Promise<void> {
  await page.goto(editorPath(options.path ?? "/editor/"));
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
export async function openMenu(page: Page, id: "save-menu" | "tools-menu" | "format-menu"): Promise<void> {
  await page.locator(`[popovertarget="${id}"]`).click();
  await expect(page.locator(`#${id}`)).toBeVisible();
  // An animation cut short rejects its promise; it is over all the same.
  await page.evaluate((id) => Promise.all(document.getElementById(id)!.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))), id);
}

/** Waits for the English-letters word list to load and index. */
export async function wordsReady(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".editor")?.dataset.words === "ready", null, { timeout: 15_000 });
}

/**
 * Opens an emulated on-screen keyboard `height` px tall, since emulators have none: the visual viewport shrinks as a real
 * one makes it. iOS can also pan the visual viewport `pan` px down the page while the keyboard is open.
 */
export const openKeyboard = (page: Page, height: number, pan = 0) =>
  page.evaluate(
    ([height, pan]) => {
      const vv = visualViewport!;
      const visible = innerHeight - height;
      Object.defineProperty(vv, "height", { configurable: true, get: () => visible });
      Object.defineProperty(vv, "offsetTop", { configurable: true, get: () => pan });
      vv.dispatchEvent(new Event("resize"));
    },
    [height, pan],
  );

/** The part of the window a person can see: above the keyboard, and below where iOS has panned to. */
export const visibleArea = (page: Page) => page.evaluate(() => ({ top: visualViewport!.offsetTop, bottom: visualViewport!.offsetTop + visualViewport!.height }));

/** Clicks into the document at its end, as a person starting to type would. */
export async function focusDoc(page: Page): Promise<void> {
  // Near the top left, where typing starts; the sample button can sit at the middle of an empty document.
  const doc = page.locator("#doc");
  const position = { x: 12, y: 12 };
  await (isPhone(page) ? doc.tap({ position }) : doc.click({ position }));
  await caretAt(page, (await docText(page)).length);
}

/** The collapsed caret as a text offset, counting 1 for each line, in either editor; -1 when it is not in the text. */
export const caretOffset = (page: Page) =>
  page.evaluate(() => {
    const doc = document.getElementById("doc")!;
    const sel = getSelection()!;
    if (!sel.rangeCount || !doc.contains(sel.focusNode)) return -1;
    const range = document.createRange();
    range.setStart(doc, 0);
    range.setEnd(sel.focusNode!, sel.focusOffset);
    const paragraphs = [...doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6")];
    if (!paragraphs.length) return range.toString().length;
    const at = paragraphs.findIndex((p) => p.contains(sel.focusNode));
    return range.toString().length + Math.max(0, at);
  });

/**
 * The document's text. ProseMirror holds 1 paragraph per line. The other editor holds 1 text node, plus a final line
 * break after a line break of the text's own, to give an empty last line its place; a single final break is left
 * in, so a stray one shows.
 */
export const docText = (page: Page) =>
  page.evaluate(() => {
    const doc = document.getElementById("doc")!;
    const paragraphs = doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6");
    if (paragraphs.length) return [...paragraphs].map((p) => p.textContent ?? "").join("\n");
    const text = doc.textContent ?? "";
    return text.endsWith("\n\n") ? text.slice(0, -1) : text;
  });

/**
 * The text as saved on this device, half a second after the last edit; exact, unlike the element's text. Today's
 * editor keeps it in localStorage, the ProseMirror editor in IndexedDB.
 */
export const savedText = (page: Page) =>
  page.evaluate(async (next) => {
    if (!next) return (JSON.parse(localStorage.getItem("kannadi.editor.v1") ?? "{}") as { text?: string }).text ?? null;
    const id = JSON.parse(localStorage.getItem("kannadi.current.v1") ?? "null") as string | null;
    if (!id) return null;
    // Reading must never make the database: an upgrade here would leave it without the editor's store.
    const db = await new Promise<IDBDatabase | null>((done) => {
      const open = indexedDB.open("kannadi");
      open.onupgradeneeded = () => open.transaction?.abort();
      open.onsuccess = () => done(open.result);
      open.onerror = () => done(null);
    });
    if (!db) return null;
    if (!db.objectStoreNames.contains("documents")) {
      db.close();
      return null;
    }
    const row = await new Promise<{ text?: string } | undefined>((done) => {
      const get = db.transaction("documents").objectStore("documents").get(id);
      get.onsuccess = () => done(get.result as { text?: string } | undefined);
      get.onerror = () => done(undefined);
    });
    db.close();
    return row?.text ?? null;
  }, NEXT);

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

/** Puts the caret at a text offset, counting 1 for each line, in either editor. */
export const caretAt = (page: Page, at: number) =>
  page.evaluate((at) => {
    const doc = document.getElementById("doc")!;
    const paragraphs = [...doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6")];
    if (!paragraphs.length) {
      const node = doc.firstChild ?? doc;
      getSelection()?.collapse(node, Math.min(at, node.textContent?.length ?? 0));
      return;
    }
    let left = at;
    for (const p of paragraphs) {
      const length = p.textContent?.length ?? 0;
      if (left <= length || p === paragraphs.at(-1)) {
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
          if (left <= node.length) return void getSelection()?.collapse(node, left);
          left -= node.length;
        }
        return void getSelection()?.collapse(p, 0);
      }
      left -= length + 1;
    }
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
    const prose = doc.classList.contains("ProseMirror");
    if (prose && sel?.rangeCount && doc.contains(sel.getRangeAt(0).endContainer)) {
      // ProseMirror redraws text changed under it, so its caret is measured without a marker.
      const range = sel.getRangeAt(0).cloneRange();
      range.collapse(false);
      const own = range.getBoundingClientRect();
      const block = (range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : (range.endContainer as Element))!.closest("p");
      caret = box(own.height ? own : block!.getBoundingClientRect());
    } else if (sel?.rangeCount && doc.contains(sel.getRangeAt(0).endContainer)) {
      const range = sel.getRangeAt(0);
      // The letter after the caret gives its line; a marker, measured at the start of a text in Firefox above the
      // line, is only for an empty line.
      const after = range.cloneRange();
      after.collapse(false);
      const node = after.endContainer;
      if (node.nodeType === Node.TEXT_NODE && after.endOffset < (node as Text).length && (node as Text).data[after.endOffset] !== "\n") {
        after.setEnd(node, after.endOffset + 1);
        const r = after.getClientRects()[0];
        if (r) caret = { top: r.top, bottom: r.bottom, left: r.left, right: r.left };
      }
    }
    if (!caret && !prose && sel?.rangeCount && doc.contains(sel.getRangeAt(0).endContainer)) {
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
    const all = document.createRange();
    all.selectNodeContents(doc);
    for (const r of all.getClientRects()) if (r.width > 1 && r.height < 80 && r.bottom > 0 && r.top < innerHeight) lines.push(box(r));
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

/**
 * Pastes clipboard data into the document. Firefox drops data put on a synthetic paste event, so there the text is
 * copied for real from a scratch element, through its own clipboard; elsewhere the paste event carries it.
 */
export async function paste(page: Page, data: { plain: string; html?: string }): Promise<void> {
  if (page.context().browser()?.browserType().name() === "firefox") {
    await page.evaluate(({ plain, html }) => {
      const sel = getSelection()!;
      // The caret, kept to put back after copying.
      (window as unknown as { pasteCaret?: Range | undefined }).pasteCaret = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : undefined;
      const source = document.createElement(html ? "div" : "textarea");
      source.id = "paste-source";
      if (source instanceof HTMLTextAreaElement) source.value = plain;
      else {
        source.contentEditable = "true";
        source.innerHTML = html!;
      }
      document.body.append(source);
      source.focus();
      if (source instanceof HTMLTextAreaElement) source.select();
      else sel.selectAllChildren(source);
    }, data);
    await page.keyboard.press("ControlOrMeta+c");
    await page.evaluate(() => {
      document.getElementById("paste-source")!.remove();
      document.getElementById("doc")!.focus();
      const caret = (window as unknown as { pasteCaret?: Range }).pasteCaret;
      if (caret) {
        getSelection()!.removeAllRanges();
        getSelection()!.addRange(caret);
      }
    });
    await page.keyboard.press("ControlOrMeta+v");
    return;
  }
  await page.evaluate(({ plain, html }) => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", plain);
    if (html) transfer.setData("text/html", html);
    const doc = document.getElementById("doc")!;
    doc.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, data);
}
