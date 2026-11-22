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
    await expect.poll(() => page.evaluate(() => document.querySelectorAll("#doc > p").length), { timeout: 60_000 }).toBe(60_000);
    await expect(page.locator("#saved")).toHaveText("Saved on this device", { timeout: 30_000 });
    await reload(page);
    await expect.poll(() => page.evaluate(() => document.querySelectorAll("#doc > p").length), { timeout: 60_000 }).toBe(60_000);
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

  test("a reload while IndexedDB is still opening keeps the document", async ({ page, context }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಉಳಿಸಿದ ಪಠ್ಯ");
    await expect(page.locator("#saved")).toHaveText("Saved on this device");
    // The next load opens IndexedDB 3 seconds late, and is left before it finishes.
    await page.evaluate(() => sessionStorage.setItem("slow", "1"));
    await context.addInitScript(() => {
      if (sessionStorage.getItem("slow") !== "1") return;
      sessionStorage.removeItem("slow");
      const open = indexedDB.open.bind(indexedDB);
      indexedDB.open = (...args: Parameters<IDBFactory["open"]>) => {
        const request = open(...args);
        let handler: ((e: Event) => void) | null = null;
        Object.defineProperty(request, "onsuccess", { set: (f) => (handler = f), get: () => handler });
        request.addEventListener("success", (e) => setTimeout(() => handler?.call(request, e), 3000));
        return request;
      };
    });
    await page.goto(page.url(), { waitUntil: "load" });
    await page.waitForTimeout(300);
    await openEditor(page);
    await expect.poll(() => docText(page)).toBe("ಉಳಿಸಿದ ಪಠ್ಯ");
  });

  test("where IndexedDB will not open, the editor works and keeps the document in localStorage", async ({ page }) => {
    await page.addInitScript(() => {
      indexedDB.open = () => {
        throw new DOMException("blocked", "SecurityError");
      };
    });
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಸ್ಥಳೀಯ ಪಠ್ಯ");
    await expect(page.locator("#saved")).toHaveText("Saved on this device");
    await reload(page);
    await expect.poll(() => docText(page)).toBe("ಸ್ಥಳೀಯ ಪಠ್ಯ");
    await openMenu(page, "tools-menu");
    await expect(page.locator("#recent")).toBeHidden();
  });

  test("the old document moves over once, and never comes back over a newer one", async ({ page }) => {
    await page.goto("/editor/");
    await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
    await focusDoc(page);
    await page.keyboard.insertText("ಹಳೆಯದು");
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("kannadi.editor.v1") ?? "{}").text)).toBe("ಹಳೆಯದು");
    await openEditor(page);
    await expect.poll(() => docText(page)).toBe("ಹಳೆಯದು");
    // On the next load, a current document that was never saved, as when New document is left at once. It is set
    // before the editor reads it, since the page saves its own as it unloads.
    await page.addInitScript(() => {
      if (sessionStorage.getItem("once")) return;
      sessionStorage.setItem("once", "1");
      localStorage.setItem("kannadi.current.v1", JSON.stringify("never-saved"));
    });
    await reload(page);
    await expect.poll(() => docText(page)).toBe("");
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
    const names = await page.evaluate(async () => (typeof indexedDB.databases === "function" ? (await indexedDB.databases()).map((d) => d.name) : null));
    if (names) expect(names).not.toContain("kannadi");
  });
});
