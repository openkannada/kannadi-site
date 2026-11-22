// On phones the editor fills the screen: the sheet runs edge to edge and from the top of the screen down to the toolbar,
// the toolbar is always in reach, and the keyboard never covers the caret line or the suggestions. @layout
import { expect, type Page, type TestInfo, test } from "@playwright/test";

import { caretAt, expectClearLayout, focusDoc, isPhone, layout, openEditor, openKeyboard, settle, visibleArea } from "./editor.ts";

/** About as tall as the iOS and Gboard keyboards with their word bars. */
const KEYBOARD = 300;

/** Checks that the toolbar, the suggestions and the caret line are all in the part of the screen a person can see. */
async function expectInSight(page: Page, info: TestInfo, label: string): Promise<void> {
  await expectClearLayout(page, info, label);
  const l = await layout(page);
  const seen = await visibleArea(page);
  const problems: string[] = [];
  if (l.toolbar.top < seen.top || l.toolbar.bottom > seen.bottom + 0.5) problems.push("the toolbar is out of reach");
  if (l.strip && (l.strip.top < seen.top || l.strip.bottom > l.toolbar.top)) problems.push("the suggestions are not between the text and the toolbar");
  if (l.caret && (l.caret.top < seen.top || l.caret.bottom > Math.min(seen.bottom, l.toolbar.top, l.strip?.top ?? Infinity)))
    problems.push(`the caret line at ${Math.round(l.caret.top)} is out of sight`);
  if (problems.length) {
    await info.attach(`${label}.png`, { body: await page.screenshot(), contentType: "image/png" });
    expect(problems, `${label}: ${JSON.stringify({ seen, ...l, lines: undefined })}`).toEqual([]);
  }
}

/** Checks that the sheet, and the writing area in it, run edge to edge and fill the screen down to the toolbar. */
async function expectFilled(page: Page, label: string): Promise<void> {
  const seen = await visibleArea(page);
  const { width } = page.viewportSize()!;
  const sheet = (await page.locator("#sheet").boundingBox())!;
  const doc = (await page.locator("#doc").boundingBox())!;
  const toolbar = (await page.locator(".toolbar").boundingBox())!;
  const at = JSON.stringify({ seen, sheet, doc, toolbar });
  expect(sheet.x, `${label}: the sheet's left edge ${at}`).toBeLessThanOrEqual(0.5);
  expect(sheet.x + sheet.width, `${label}: the sheet's right edge ${at}`).toBeGreaterThanOrEqual(width - 0.5);
  expect(sheet.y, `${label}: the sheet's top ${at}`).toBeLessThanOrEqual(seen.top + 1);
  // A tap anywhere above the toolbar lands in the text.
  expect(doc.y + doc.height, `${label}: the writing area's foot ${at}`).toBeGreaterThanOrEqual(toolbar.y);
  expect(doc.width, `${label}: the writing area's width ${at}`).toBeGreaterThanOrEqual(width - 48);
  const counts = (await page.locator(".sheet-foot").boundingBox())!;
  expect(Math.abs(counts.x - doc.x), `${label}: the counts line up with the text ${at}`).toBeLessThanOrEqual(1);
}

test.describe("@layout on phones", () => {
  test.skip(({ page }) => !isPhone(page), "Phones only.");

  test("the toolbar is in reach without scrolling, from the top of the page to its foot", async ({ page }, info) => {
    await openEditor(page);
    for (const to of [0, 0.5, 1]) {
      await page.evaluate((to) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * to), to);
      await settle(page);
      const toolbar = (await page.locator(".toolbar").boundingBox())!;
      expect(toolbar.y, `scrolled to ${to}`).toBeGreaterThanOrEqual(0);
      expect(toolbar.y + toolbar.height, `scrolled to ${to}`).toBeLessThanOrEqual(page.viewportSize()!.height);
    }
    await info.attach("load.png", { body: await page.screenshot(), contentType: "image/png" });
  });

  test("a tap on the sheet fills the screen with it, edge to edge and down to the toolbar, with the keyboard shut or open", async ({ page }, info) => {
    await openEditor(page);
    await focusDoc(page);
    await settle(page);
    await expectFilled(page, "tapped");
    await info.attach("tapped.png", { body: await page.screenshot(), contentType: "image/png" });
    await openKeyboard(page, KEYBOARD);
    await settle(page);
    await expectFilled(page, "keyboard");
    await expectInSight(page, info, "keyboard");
    await info.attach("keyboard.png", { body: await page.screenshot(), contentType: "image/png" });
  });

  for (const pan of [0, 120]) {
    test(`with the keyboard open${pan ? " and the view panned, as on iOS," : ""} typing line after line keeps the caret, the suggestions and the toolbar in sight`, async ({ page }, info) => {
      await openEditor(page, { mode: "english" });
      await focusDoc(page);
      await openKeyboard(page, KEYBOARD, pan);
      for (let i = 1; i <= 16; i++) {
        await page.keyboard.type("namaskara kannada");
        await page.keyboard.press("Enter");
        if (i % 4 === 0) await expectInSight(page, info, `line-${i}`);
      }
      await page.keyboard.type("til");
      expect((await layout(page)).strip).not.toBeNull();
      await expectInSight(page, info, "suggestions");
      await info.attach("typing.png", { body: await page.screenshot(), contentType: "image/png" });
      // Back on the first line, as after a tap on it, the next letter brings it into sight below any pan.
      await caretAt(page, 0);
      await page.keyboard.type("a");
      await expectInSight(page, info, "first-line");
    });
  }

  test("a tap just above the toolbar in a long document, then the keyboard opening, keeps the caret line in sight", async ({ page }, info) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 40 }, (_, i) => `ಸಾಲು ${i + 1} ಕನ್ನಡ ನಾಡು`).join("\n"));
    await page.evaluate(() => {
      const doc = document.getElementById("doc")!.getBoundingClientRect();
      scrollBy(0, doc.top + doc.height / 2 - innerHeight / 2);
    });
    await settle(page);
    const toolbar = (await page.locator(".toolbar").boundingBox())!;
    const doc = (await page.locator("#doc").boundingBox())!;
    // A second tap at the same spot within a moment is a double tap, which selects a word.
    await page.waitForTimeout(700);
    await page.touchscreen.tap(doc.x + 30, toolbar.y - 40);
    for (const by of [100, 200, KEYBOARD]) await openKeyboard(page, by);
    await settle(page);
    await expectInSight(page, info, "tapped-low");
  });

  test("a focus that does not come from a tap, as when coming back to the page, leaves the page where it is", async ({ page }) => {
    await openEditor(page);
    await settle(page);
    const before = await page.evaluate(() => scrollY);
    await page.locator("#doc").evaluate((doc) => (doc as HTMLElement).focus({ preventScroll: true }));
    await expect(page.locator("#doc")).toBeFocused();
    expect(await settle(page)).toBe(before);
  });

  test("on Android, where the keyboard makes the page itself shorter, a tap low in a long document keeps the caret line in sight", async ({ page, browserName }, info) => {
    test.skip(browserName !== "chromium", "Android's Chrome resizes the page for its keyboard.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 40 }, (_, i) => `ಸಾಲು ${i + 1} ಕನ್ನಡ ನಾಡು`).join("\n"));
    await page.evaluate(() => {
      const doc = document.getElementById("doc")!.getBoundingClientRect();
      scrollBy(0, doc.top + doc.height / 2 - innerHeight / 2);
    });
    await settle(page);
    const toolbar = (await page.locator(".toolbar").boundingBox())!;
    const doc = (await page.locator("#doc").boundingBox())!;
    await page.waitForTimeout(700);
    await page.touchscreen.tap(doc.x + 30, toolbar.y - 40);
    const { width, height } = page.viewportSize()!;
    for (const by of [100, 200, KEYBOARD]) await page.setViewportSize({ width, height: height - by });
    await settle(page);
    await expectInSight(page, info, "android-keyboard");
  });

  test("with the page pinch-zoomed and the keyboard open, typing never scrolls the page back and forth", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 30 }, (_, i) => `ಸಾಲು ${i + 1}`).join("\n"));
    await openKeyboard(page, KEYBOARD);
    await settle(page);
    // Zoomed in 2 times, and panned down the page, as a person can with 2 fingers.
    await page.evaluate(() => {
      const vv = visualViewport!;
      for (const [key, value] of [["scale", 2], ["offsetTop", 320], ["height", (innerHeight - 300) / 2]] as const) {
        Object.defineProperty(vv, key, { configurable: true, get: () => value });
      }
      (window as unknown as { moves: number[] }).moves = [];
      let last = scrollY;
      addEventListener("scroll", () => {
        (window as unknown as { moves: number[] }).moves.push(Math.sign(scrollY - last));
        last = scrollY;
      });
    });
    await page.keyboard.insertText("ಕ");
    await page.keyboard.insertText("ನ");
    await settle(page);
    const moves = await page.evaluate(() => (window as unknown as { moves: number[] }).moves.filter((m) => m !== 0));
    expect(new Set(moves).size, `scrolls: ${moves.join(" ")}`).toBeLessThanOrEqual(1);
  });

  test("a file dragged over the sheet shows the drop outline inside the screen, in the sheet's shape", async ({ page }) => {
    await openEditor(page);
    await page.evaluate(() => document.body.classList.add("dragging"));
    const { offset, hint, sheet } = await page.evaluate(() => {
      const sheet = getComputedStyle(document.getElementById("sheet")!);
      return { offset: parseFloat(sheet.outlineOffset), hint: getComputedStyle(document.querySelector(".drop-hint")!).borderTopLeftRadius, sheet: sheet.borderTopLeftRadius };
    });
    expect(offset).toBeLessThanOrEqual(0);
    expect(hint).toBe(sheet);
  });
});
