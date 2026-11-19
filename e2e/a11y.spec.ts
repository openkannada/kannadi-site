// Keyboard-only use, names for screen readers, and focus order.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { docText, focusDoc, isPhone, openEditor } from "./editor.ts";

test("the editor has no accessibility violations, with and without suggestions showing", async ({ page }) => {
  await openEditor(page);
  const scan = () => new AxeBuilder({ page }).include(".editor").analyze();
  expect((await scan()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  const label = page.locator('label[for="mode-english"]');
  await (isPhone(page) ? label.tap() : label.click());
  await page.keyboard.type("namaskara");
  // Scanned mid fade-in, the strip's text would read as low contrast.
  await expect(page.locator("#suggest")).toBeVisible();
  await page.evaluate(() => Promise.all(document.getElementById("suggest")!.getAnimations({ subtree: true }).map((a) => a.finished)));
  expect((await scan()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("every control has a name, and the document is a labeled multi-line text box", async ({ page }) => {
  await openEditor(page);
  await expect(page.getByRole("textbox", { name: "Document" })).toHaveAttribute("aria-multiline", "true");
  await expect(page.getByRole("group", { name: "Editor tools" })).toBeVisible();
  for (const name of ["ಕ", "English", "Baraha"]) await expect(page.getByRole("radio", { name: new RegExp(name) })).toBeAttached();
  // On phones the Save button shows only its icon; its title names it.
  for (const name of [/^More tools$/, /^Save/]) await expect(page.getByRole("button", { name })).toBeVisible();
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".editor button, .editor input")]
      .filter((el) => el.checkVisibility() && el.getAttribute("aria-hidden") !== "true" && !(el.getAttribute("aria-label") || el.textContent?.trim() || (el as HTMLInputElement).labels?.length))
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(unnamed).toEqual([]);
});

test.describe("keyboard only", () => {
  test.skip(({ isMobile }) => isMobile, "Phones have no Tab key.");
  // Safari on a Mac tabs only to text fields unless Option is held, or the setting to tab to every item is on.
  let tab = "Tab";
  test.beforeEach(({ browserName }) => {
    tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  });

  test("Tab goes from the modes through the toolbar into the document, in order", async ({ page }) => {
    await openEditor(page);
    await page.locator("#mode-kannada").focus();
    const order: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press(tab);
      order.push(await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return el.id || el.getAttribute("aria-label") || el.textContent?.trim() || el.tagName;
      }));
      if (order.at(-1) === "doc") break;
    }
    // The microphone shows only where the browser offers Kannada speech recognition.
    expect(order.filter((id) => id !== "voice")).toEqual(["open", "convert", "More tools", "Save", "doc"]);
  });

  test("arrow keys change the mode, and typing then converts", async ({ page }) => {
    await openEditor(page);
    await page.locator("#mode-kannada").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#mode-english")).toBeChecked();
    await expect(page.locator("#doc")).toBeFocused();
    await page.keyboard.type("namaskara");
    // Typed before the word list loads, the word is spelled letter by letter, then gets its best spelling.
    await expect.poll(() => docText(page)).toBe("ನಮಸ್ಕಾರ");
  });

  test("Alt+number changes the mode and says so", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.press("Alt+Digit2");
    await expect(page.locator("#mode-english")).toBeChecked();
    await expect(page.locator("#announce")).toContainText("English letters");
    await page.keyboard.type("namaskara");
    await expect.poll(() => docText(page)).toBe("ನಮಸ್ಕಾರ");
  });

  test("the shortcuts list opens with Ctrl+/ and closes with Escape, giving focus back", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.press("ControlOrMeta+/");
    await expect(page.locator("#shortcuts")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#shortcuts")).toBeHidden();
    await expect(page.locator("#doc")).toBeFocused();
  });

  test("the Save menu opens and works from the keyboard", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಕನ್ನಡ");
    await page.getByRole("button", { name: "Save", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#save-menu")).toBeVisible();
    await page.keyboard.press(tab);
    const [download] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
    expect(download.suggestedFilename()).toBe("kannada.docx");
  });

  test("Ctrl+S saves in the last format", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಕನ್ನಡ");
    const [download] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("ControlOrMeta+s")]);
    expect(download.suggestedFilename()).toBe("kannada.docx");
  });

  test("suggestions are announced, and the strip is named", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("til");
    await expect(page.getByRole("group", { name: "Kannada words for what you typed" })).toBeVisible();
    await expect(page.locator("#announce")).toContainText(/\d+ Kannada words|choices|words/);
  });
});
