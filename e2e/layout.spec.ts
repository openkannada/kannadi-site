// The toolbar, the suggestions and the caret line never cover each other, at every width, light and dark. @layout
import { expect, test } from "@playwright/test";

import { caretAt, caretOffset, docText, expectClearLayout, focusDoc, isPhone, layout, NEXT, openEditor, settle } from "./editor.ts";

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
    const end = await settle(page);
    await page.evaluate(() => scrollBy(0, -600));
    await page.waitForTimeout(300);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await page.evaluate(() => scrollY)).toBeLessThan(end - 400);
  });

  test("on phones, a keyboard opening in small steps keeps the caret line clear, and reading with it open is left alone", async ({ page }, info) => {
    test.skip(!isPhone(page), "Phones only.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 60 }, (_, i) => `ಸಾಲು ${i + 1}`).join("\n"));
    await settle(page);
    // Emulators have no on-screen keyboard; the visual viewport shrinks here as a keyboard would make it, 60px at a time.
    const shrink = (by: number) =>
      page.evaluate((by) => {
        const vv = visualViewport!;
        const height = innerHeight - by;
        Object.defineProperty(vv, "height", { configurable: true, get: () => height });
        vv.dispatchEvent(new Event("resize"));
      }, by);
    for (const by of [60, 120, 180, 240, 300]) await shrink(by);
    await expectClearLayout(page, info, "keyboard-open");
    const end = await page.evaluate(() => scrollY);
    // With the keyboard open, iOS pans the visual viewport as the page scrolls.
    await page.evaluate(() => {
      scrollBy(0, -600);
      visualViewport!.dispatchEvent(new Event("scroll"));
    });
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await page.evaluate(() => scrollY)).toBeLessThan(end - 400);
  });

  test("a drag that starts near the bottom edge does not scroll the page until it ends", async ({ page }) => {
    test.skip(isPhone(page), "A mouse drag.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 60 }, (_, i) => `ಸಾಲು ${i + 1}`).join("\n"));
    await settle(page);
    // A line from the middle of the text, scrolled to straddle the window's bottom edge.
    const at = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.getElementById("doc")!, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
      // The middle line: of 1 text node with every line, or of 1 text node per line.
      const node = nodes[Math.floor(nodes.length / 2)]!;
      const middle = nodes.length > 1 ? 0 : Math.floor(node.length / 2);
      const range = document.createRange();
      range.setStart(node, middle);
      range.setEnd(node, middle + 1);
      const line = range.getBoundingClientRect();
      scrollBy({ top: line.top - (innerHeight - line.height / 2), behavior: "instant" });
      const moved = range.getBoundingClientRect();
      return { x: moved.left + 2, y: Math.min(innerHeight - 2, moved.top + 4) };
    });
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await page.mouse.up();
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(before);
  });

  test("clicking the sheet's margin below the text puts the caret at the end without jumping to the top", async ({ page }, info) => {
    test.skip(isPhone(page), "The phone sheet has the same handler; a tap there is covered by the dock.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 60 }, (_, i) => `ಸಾಲು ${i + 1}`).join("\n"));
    // The caret starts elsewhere, so only the click can bring it to the end.
    await caretAt(page, 0);
    await page.locator("#doc").evaluate((doc) => (doc as HTMLElement).blur());
    const sheet = (await page.locator("#sheet").boundingBox())!;
    await page.evaluate((bottom) => scrollTo(0, scrollY + bottom - innerHeight + 20), sheet.y + sheet.height);
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => scrollY);
    // Between the last line and the counts at the foot of the sheet.
    const gap = await page.evaluate(() => {
      const doc = document.getElementById("doc")!.getBoundingClientRect();
      const foot = document.querySelector(".sheet-foot")!.getBoundingClientRect();
      return { x: doc.left + 60, y: (doc.bottom + foot.top) / 2 };
    });
    await page.mouse.click(gap.x, gap.y);
    await expect(page.locator("#doc")).toBeFocused();
    expect(await caretOffset(page)).toBe((await docText(page)).length);
    expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(120);
    await expectClearLayout(page, info, "sheet-margin");
    // A click in the side margin puts the caret on the line beside it.
    const side = await page.evaluate(() => {
      const doc = document.getElementById("doc")!.getBoundingClientRect();
      return { x: doc.left - 12, y: (Math.max(doc.top, 120) + Math.min(doc.bottom, innerHeight)) / 2 };
    });
    await page.mouse.click(side.x, side.y);
    const at = await caretOffset(page);
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan((await docText(page)).length);
  });

  test("a drag from the text that ends in the sheet's margin keeps its selection", async ({ page }) => {
    test.skip(isPhone(page), "A mouse drag.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಒಂದು ಎರಡು ಮೂರು\nನಾಲ್ಕು");
    const doc = (await page.locator("#doc").boundingBox())!;
    const sheet = (await page.locator("#sheet").boundingBox())!;
    await page.mouse.move(doc.x + 4, doc.y + 12);
    await page.mouse.down();
    await page.mouse.move(sheet.x + sheet.width - 8, doc.y + 12, { steps: 6 });
    await page.mouse.up();
    expect(await page.evaluate(() => getSelection()!.toString().length)).toBeGreaterThan(4);
  });

  test("a press that never ends, as under a context menu, stops holding the page once keys are typed", async ({ page }, info) => {
    test.skip(isPhone(page), "A mouse button.");
    test.skip(NEXT, "ProseMirror holds the browser's selection while a mouse button is down, so typing then is not a case.");
    await openEditor(page);
    await focusDoc(page);
    const doc = (await page.locator("#doc").boundingBox())!;
    await page.mouse.move(doc.x + 4, doc.y + 12);
    await page.mouse.down();
    await page.keyboard.press("End");
    for (let i = 0; i < 30; i++) await page.keyboard.press("Enter");
    await expectClearLayout(page, info, "held-press-then-keys");
    await page.mouse.up();
  });

  test("a right button held down never holds the page", async ({ page }, info) => {
    test.skip(isPhone(page), "A mouse button.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText(Array.from({ length: 60 }, (_, i) => `ಸಾಲು ${i + 1}`).join("\n"));
    await settle(page);
    const doc = (await page.locator("#doc").boundingBox())!;
    await page.mouse.move(doc.x + 4, Math.max(doc.y, 0) + 200);
    await page.mouse.down({ button: "right" });
    // The caret moves to the top of the document, far out of view, with no key typed.
    await caretAt(page, 0);
    await expectClearLayout(page, info, "right-button-held");
    await page.mouse.up({ button: "right" });
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
