// The toolbar, the suggestions and the caret line never cover each other, at every width, light and dark. @layout
import { expect, test } from "@playwright/test";

import { docText, expectClearLayout, focusDoc, isPhone, layout, openEditor } from "./editor.ts";

test.describe("@layout", () => {
  test("after a word, the first line is clear of the toolbar and the suggestions", async ({ page }, info) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("til");
    await expectClearLayout(page, info, "first-word");
    await info.attach("first-word.png", { body: await page.screenshot(), contentType: "image/png" });
  });

  test("typing with the page scrolled so the sheet's top is under the toolbar keeps the caret line in view", async ({ page }, info) => {
    test.skip(isPhone(page), "On phones the toolbar is at the bottom.");
    await openEditor(page, { mode: "english" });
    // Scroll the sheet's top edge just above the window, as when someone scrolls down to see more of the page.
    await page.evaluate(() => scrollBy(0, document.getElementById("sheet")!.getBoundingClientRect().top + 40));
    await page.locator("#doc").click({ position: { x: 40, y: 10 } });
    await page.keyboard.type("til");
    await expectClearLayout(page, info, "scrolled-first-word");
  });

  test("a long document typed line by line keeps the caret line clear", async ({ page }, info) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    for (let i = 1; i <= 30; i++) {
      await page.keyboard.type("namaskara kannada");
      await page.keyboard.press("Enter");
      if (i % 6 === 0) await expectClearLayout(page, info, `line-${i}`);
    }
    await page.keyboard.type("til");
    await expectClearLayout(page, info, "line-31-word");
    await info.attach("long.png", { body: await page.screenshot(), contentType: "image/png" });
  });

  test("text scrolled under the toolbar is hidden, never seen behind it", async ({ page }, info) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 40 }, (_, i) => `ಸಾಲು ${i + 1} ಕನ್ನಡ ನಾಡು ನುಡಿ`).join("\n"));
    for (const at of [0.3, 0.5, 0.7]) {
      await page.evaluate((at) => {
        const doc = document.getElementById("doc")!.getBoundingClientRect();
        scrollBy(0, doc.top + doc.height * at - innerHeight / 2);
      }, at);
      // Click a line in the middle of the window, where someone reading would.
      const sheet = await page.locator("#doc").boundingBox();
      const viewport = page.viewportSize()!;
      // A second tap at the same spot within a moment is a double tap, which selects a word.
      if (isPhone(page)) await page.waitForTimeout(700).then(() => page.touchscreen.tap(sheet!.x + 30, viewport.height / 2));
      else await page.mouse.click(sheet!.x + 30, viewport.height / 2);
      await expectClearLayout(page, info, `scrolled-${at}`);
    }
    await info.attach("scrolled.png", { body: await page.screenshot(), contentType: "image/png" });
  });

  test("scrolling away from the caret to read is left alone", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 60 }, (_, i) => `ಸಾಲು ${i + 1}`).join("\n"));
    // Let the typing's own events settle, as they have long before anyone scrolls.
    await page.waitForTimeout(500);
    const end = await page.evaluate(() => scrollY);
    await page.evaluate(() => scrollBy(0, -600));
    await page.waitForTimeout(300);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await page.evaluate(() => scrollY)).toBeLessThan(end - 400);
  });

  test("on phones, the visual viewport moving while reading does not pull the page back to the caret", async ({ page }) => {
    test.skip(!isPhone(page), "Phones only.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 60 }, (_, i) => `ಸಾಲು ${i + 1}`).join("\n"));
    await page.waitForTimeout(500);
    const end = await page.evaluate(() => scrollY);
    // With the keyboard open, iOS pans the visual viewport as the page scrolls; emulators do not, so it is sent here.
    await page.evaluate(() => {
      scrollBy(0, -600);
      visualViewport?.dispatchEvent(new Event("scroll"));
      visualViewport?.dispatchEvent(new Event("resize"));
    });
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await page.evaluate(() => scrollY)).toBeLessThan(end - 400);
  });

  test("clicking a line half under the toolbar brings it into view", async ({ page }, info) => {
    test.skip(isPhone(page), "On phones the toolbar is at the bottom.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 40 }, (_, i) => `ಸಾಲು ${i + 1}`).join("\n"));
    await page.evaluate(() => {
      const doc = document.getElementById("doc")!.getBoundingClientRect();
      scrollBy(0, doc.top + doc.height / 2);
    });
    const toolbar = (await page.locator(".toolbar").boundingBox())!;
    const sheet = (await page.locator("#doc").boundingBox())!;
    // Just below the toolbar is where a reader clicks the topmost line they can see.
    await page.mouse.click(sheet.x + 20, toolbar.y + toolbar.height + 6);
    await expectClearLayout(page, info, "clicked-under-toolbar");
  });

  test("suggestions on the first line stay off the toolbar, and on a later line off the caret", async ({ page }, info) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("namaskara");
    let l = await layout(page);
    expect(l.strip).not.toBeNull();
    await expectClearLayout(page, info, "strip-first-line");
    for (let i = 0; i < 12; i++) await page.keyboard.press("Enter");
    await page.keyboard.type("namaskara");
    l = await layout(page);
    expect(l.strip).not.toBeNull();
    await expectClearLayout(page, info, "strip-later-line");
  });

  test("the editor fits the width with no sideways scrolling", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಕನ್ನಡ".repeat(200));
    const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    expect(scroll).toBeLessThanOrEqual(width);
    expect(await docText(page)).toHaveLength(1000);
  });
});

test.describe("@layout the Kannada editor", () => {
  test("/kn/ types and lays out like the English one", async ({ page }, info) => {
    await openEditor(page, { path: "/kn/", mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("namaskara");
    expect(await docText(page)).toBe("ನಮಸ್ಕಾರ");
    await expectClearLayout(page, info, "kn-editor");
    await expect(page.locator("#doc")).toHaveAttribute("aria-label", /.+/);
  });
});
