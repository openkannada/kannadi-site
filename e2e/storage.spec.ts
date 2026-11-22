// Keeping documents on this device: IndexedDB with recent documents on the ProseMirror editor, localStorage on today's.
import { expect, type Page, test } from "@playwright/test";

import { docText, focusDoc, isPhone, NEXT, openEditor, openMenu } from "./editor.ts";

const reload = async (page: Page) => {
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
};

/** Pastes plain text into the document at the caret. */
const paste = (page: Page, plain: string) =>
  page.evaluate((plain) => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", plain);
    document.getElementById("doc")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, plain);

test.describe("on the ProseMirror editor", () => {
  test.skip(!NEXT, "Documents live in IndexedDB on the ProseMirror editor, behind ?editor=next.");

  test("a document too long for localStorage is kept, and comes back after a reload", async ({ page, browserName }) => {
    test.skip(isPhone(page) || browserName !== "chromium", "6 million characters once is enough.");
    test.setTimeout(120_000);
    await openEditor(page);
    await focusDoc(page);
    // Over every browser's localStorage limit of 5 or 10 MB.
    const line = "ಕನ್ನಡ ನಾಡು ನುಡಿ ".repeat(6);
    const text = Array.from({ length: 60_000 }, () => line).join("\n");
    await paste(page, text);
    await expect.poll(() => page.evaluate(() => document.querySelectorAll("#doc p").length), { timeout: 60_000 }).toBe(60_000);
    await expect(page.locator("#saved")).toHaveText("Saved on this device", { timeout: 30_000 });
    await reload(page);
    await expect.poll(() => page.evaluate(() => document.querySelectorAll("#doc p").length), { timeout: 60_000 }).toBe(60_000);
    expect((await docText(page)).length).toBe(text.length);
  });

  test("the document today's editor kept moves over, and stays", async ({ page }) => {
    await page.goto("/editor/");
    await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
    await focusDoc(page);
    await page.keyboard.insertText("ಹಳೆಯ ದಾಖಲೆ");
    // Today's editor, on the page without ?editor=next, keeps it in localStorage.
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("kannadi.editor.v1") ?? "{}").text)).toBe("ಹಳೆಯ ದಾಖಲೆ");
    await openEditor(page);
    await expect.poll(() => docText(page)).toBe("ಹಳೆಯ ದಾಖಲೆ");
    await focusDoc(page);
    await page.keyboard.insertText(" ಹೊಸ");
    await reload(page);
    await expect.poll(() => docText(page)).toBe("ಹಳೆಯ ದಾಖಲೆ ಹೊಸ");
  });

  test("New document keeps the last one among the recent documents, and choosing it opens it again", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಮೊದಲ ದಾಖಲೆ");
    await openMenu(page, "tools-menu");
    await expect(page.locator("#recent")).toBeHidden();
    await page.locator('[data-run="new"]').click();
    await expect.poll(() => docText(page)).toBe("");
    await expect(page.locator("#toast-text")).toContainText("Recent documents");
    await page.keyboard.insertText("ಎರಡನೆಯ ದಾಖಲೆ");
    await openMenu(page, "tools-menu");
    const first = page.locator("#recent-list button", { hasText: "ಮೊದಲ ದಾಖಲೆ" });
    await expect(first).toBeVisible();
    await first.click();
    await expect.poll(() => docText(page)).toBe("ಮೊದಲ ದಾಖಲೆ");
    await reload(page);
    await expect.poll(() => docText(page)).toBe("ಮೊದಲ ದಾಖಲೆ");
    await openMenu(page, "tools-menu");
    await expect(page.locator("#recent-list button", { hasText: "ಎರಡನೆಯ ದಾಖಲೆ" })).toBeVisible();
  });
});

test.describe("on today's editor", () => {
  test.skip(NEXT, "Today's editor keeps 1 document in localStorage.");

  test("New document clears the text with Undo to bring it back, and lists no recent documents", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಮೊದಲ ದಾಖಲೆ");
    await openMenu(page, "tools-menu");
    await page.locator('[data-run="new"]').click();
    await expect.poll(() => docText(page)).toBe("");
    await expect(page.locator("#toast-text")).toContainText("Ctrl+Z");
    await openMenu(page, "tools-menu");
    await expect(page.locator("#recent")).toBeHidden();
    expect(await page.evaluate(async () => ((await indexedDB.databases?.()) ?? []).map((d) => d.name))).not.toContain("kannadi");
  });
});
