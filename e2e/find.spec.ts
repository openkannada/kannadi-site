// Find and replace on the ProseMirror editor: matches in every Unicode spelling, whole aksharas, replacing 1 or all
// as 1 undo step, and the bar's keys.
import { expect, type Page, test } from "@playwright/test";

import { caretOffset, docText, focusDoc, isPhone, NEXT, openEditor, openMenu } from "./editor.ts";

const openFind = async (page: Page) => {
  if (isPhone(page)) {
    await openMenu(page, "tools-menu");
    await page.locator('[data-run="find"]').click();
  } else {
    await page.keyboard.press("ControlOrMeta+f");
  }
  await expect(page.locator("#find-bar")).toBeVisible();
  await expect(page.locator("#find-text")).toBeFocused();
};

test.describe("on the ProseMirror editor", () => {
  test.skip(!NEXT, "Find and replace is on the ProseMirror editor, behind ?editor=next.");

  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
  });

  test("a word is found in every spelling Unicode treats as the same, and Enter moves through the matches", async ({ page }) => {
    // The second ಕೊಡು is spelled with ೆ and ೂ, as some keyboards and old converters write ೊ.
    await page.keyboard.insertText("ಕೊಡು ಬಾ\nಕೊಡು ಹೋಗು ಕೊಡು");
    await openFind(page);
    await page.locator("#find-text").fill("ಕೊಡು");
    await expect(page.locator("#find-count")).toHaveText("3 matches");
    await expect(page.locator(".ProseMirror-search-match, .ProseMirror-active-search-match")).toHaveCount(3);
    await page.keyboard.press("Enter");
    await expect(page.locator("#find-count")).toHaveText("1 of 3");
    await page.keyboard.press("Enter");
    await expect(page.locator("#find-count")).toHaveText("2 of 3");
    await page.keyboard.press("Shift+Enter");
    await expect(page.locator("#find-count")).toHaveText("1 of 3");
    await page.locator("#find-text").fill("ಇಲ್ಲ");
    await expect(page.locator("#find-count")).toHaveText("No matches");
  });

  test("whole aksharas leave out a letter with a sign after it or inside a conjunct", async ({ page }) => {
    await page.keyboard.insertText("ಕ ಕಾ ಕ್ಕ ಸ್ಕ");
    await openFind(page);
    await page.locator("#find-text").fill("ಕ");
    await expect(page.locator("#find-count")).toHaveText("5 matches");
    await page.locator("#find-aksharas").check();
    await expect(page.locator("#find-count")).toHaveText("1 match");
  });

  test("Replace changes the match and goes to the next; Replace all changes every one, and 1 undo brings them back", async ({ page }) => {
    await page.keyboard.insertText("ಹಳೆ ಮನೆ, ಹಳೆ ಊರು, ಹಳೆ ನೆನಪು, ಹಳೆ ಕತೆ");
    await openFind(page);
    await page.locator("#find-text").fill("ಹಳೆ");
    await page.locator("#find-replace").fill("ಹೊಸ");
    // Replace, with no match picked yet, replaces the next one and picks the one after it.
    await page.locator("#replace-one").click();
    expect(await docText(page)).toBe("ಹೊಸ ಮನೆ, ಹಳೆ ಊರು, ಹಳೆ ನೆನಪು, ಹಳೆ ಕತೆ");
    await expect(page.locator("#find-count")).toHaveText("1 of 3");
    // Enter in the replacement does the same.
    await page.locator("#find-replace").press("Enter");
    expect(await docText(page)).toBe("ಹೊಸ ಮನೆ, ಹೊಸ ಊರು, ಹಳೆ ನೆನಪು, ಹಳೆ ಕತೆ");
    await page.locator("#replace-all").click();
    expect(await docText(page)).toBe("ಹೊಸ ಮನೆ, ಹೊಸ ಊರು, ಹೊಸ ನೆನಪು, ಹೊಸ ಕತೆ");
    await expect(page.locator("#find-count")).toHaveText("No matches");
    await expect(page.locator("#announce")).toHaveText("Replaced 2 matches.");
    await page.keyboard.press("Escape");
    await expect(page.locator("#find-bar")).toBeHidden();
    await expect(page.locator("#doc")).toBeFocused();
    await page.keyboard.press("ControlOrMeta+z");
    expect(await docText(page)).toBe("ಹೊಸ ಮನೆ, ಹೊಸ ಊರು, ಹಳೆ ನೆನಪು, ಹಳೆ ಕತೆ");
  });

  test("a replacement with $ in it goes in as typed, and the bar finds what was selected", async ({ page }) => {
    await page.keyboard.insertText("ಬೆಲೆ");
    await page.keyboard.press("ControlOrMeta+a");
    await openFind(page);
    await expect(page.locator("#find-text")).toHaveValue("ಬೆಲೆ");
    await page.locator("#find-replace").fill("$1 $&");
    await page.locator("#replace-all").click();
    expect(await docText(page)).toBe("$1 $&");
  });

  test("closing the bar takes away the marks, and typing with it open keeps the count right", async ({ page }) => {
    await page.keyboard.insertText("ನಾಡು");
    await openFind(page);
    await page.locator("#find-text").fill("ನಾಡು");
    await expect(page.locator("#find-count")).toHaveText("1 match");
    // The text changes while the bar is open.
    await page.locator("#doc").evaluate((doc) => (doc as HTMLElement).focus());
    await page.keyboard.press("End");
    await page.keyboard.insertText(" ನಾಡು");
    await expect(page.locator("#find-count")).toHaveText("2 matches");
    await page.locator("#find-close").click();
    await expect(page.locator("#find-bar")).toBeHidden();
    await expect(page.locator(".ProseMirror-search-match, .ProseMirror-active-search-match")).toHaveCount(0);
    expect(await caretOffset(page)).toBeGreaterThanOrEqual(0);
  });
});

test.describe("on today's editor", () => {
  test.skip(NEXT, "Today's editor leaves Ctrl+F to the browser.");

  test("there is no find bar, and the menu has no Find and replace", async ({ page }) => {
    await openEditor(page);
    await openMenu(page, "tools-menu");
    await expect(page.locator('[data-run="find"]')).toBeHidden();
  });
});
