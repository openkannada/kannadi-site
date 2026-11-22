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
});
