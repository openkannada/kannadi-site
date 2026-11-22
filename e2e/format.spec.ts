// Headings, lists, quotes, bold, italic, underline and links on the ProseMirror editor, with the typing modes in them.
import { readFile } from "node:fs/promises";

import { expect, type Page, test } from "@playwright/test";

import { docText, focusDoc, isPhone, NEXT, openEditor, openMenu, paste, suggestions } from "./editor.ts";

/** The document's HTML, for checking its structure. */
// Safari on an iPhone leaves an empty style attribute on a list it wraps.
const html = (page: Page) =>
  page.evaluate(() => document.getElementById("doc")!.innerHTML.replace(/<br class="ProseMirror-trailingBreak">/g, "").replace(/ style=""/g, ""));

const reload = async (page: Page) => {
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
};

/** Enter, with the moment a phone gives; an emulated iPhone splits the line only after 200ms. */
const enter = async (page: Page) => {
  await page.keyboard.press("Enter");
  if (isPhone(page)) await page.waitForTimeout(250);
};

const format = async (page: Page, name: string) => {
  await openMenu(page, "format-menu");
  const item = page.locator(`#format-menu [data-format="${name}"]`);
  await (isPhone(page) ? item.tap() : item.click());
};

test.describe("on the ProseMirror editor", () => {
  test.skip(!NEXT, "Formats are on the ProseMirror editor, behind ?editor=next.");

  test("Ctrl+B, I and U format what is typed next, and the formats stay after a reload", async ({ page, browserName }) => {
    test.skip(isPhone(page), "Phones format from the menu.");
    test.skip(browserName === "webkit", "Safari takes Cmd+U for itself in a Playwright run; the menu covers underline there.");
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಕನ್ನಡ ");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.insertText("ನಾಡು");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.press("ControlOrMeta+i");
    await page.keyboard.insertText(" ನುಡಿ");
    expect(await html(page)).toBe("<p>ಕನ್ನಡ <strong>ನಾಡು</strong><em> ನುಡಿ</em></p>");
    await reload(page);
    expect(await html(page)).toBe("<p>ಕನ್ನಡ <strong>ನಾಡು</strong><em> ನುಡಿ</em></p>");
  });

  test("the menu makes headings, lists and quotes, shows what applies, and Text takes them back", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಶೀರ್ಷಿಕೆ");
    await format(page, "h1");
    expect(await html(page)).toBe("<h1>ಶೀರ್ಷಿಕೆ</h1>");
    await openMenu(page, "format-menu");
    await expect(page.locator('#format-menu [data-format="h1"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('#format-menu [data-format="paragraph"]')).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Escape");
    await format(page, "paragraph");
    expect(await html(page)).toBe("<p>ಶೀರ್ಷಿಕೆ</p>");
    await format(page, "bullet");
    expect(await html(page)).toBe("<ul><li><p>ಶೀರ್ಷಿಕೆ</p></li></ul>");
    await format(page, "paragraph");
    expect(await html(page)).toBe("<p>ಶೀರ್ಷಿಕೆ</p>");
    await format(page, "quote");
    expect(await html(page)).toBe("<blockquote><p>ಶೀರ್ಷಿಕೆ</p></blockquote>");
    await page.keyboard.press("ControlOrMeta+z");
    expect(await html(page)).toBe("<p>ಶೀರ್ಷಿಕೆ</p>");
  });

  test("# , - , 1. and > at the start of a line make a heading, lists and a quote, in English letters too", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("# namaskara");
    await enter(page);
    await page.keyboard.type("- kannada");
    await enter(page);
    await page.keyboard.type("naadu");
    await enter(page);
    await enter(page);
    await page.keyboard.type("1. ondu");
    await enter(page);
    await enter(page);
    await page.keyboard.type("> mane");
    await expect.poll(() => html(page)).toBe(
      "<h1>ನಮಸ್ಕಾರ</h1><ul><li><p>ಕನ್ನಡ</p></li><li><p>ನಾಡು</p></li></ul><ol><li><p>ಒಂದು</p></li></ol><blockquote><p>ಮನೆ</p></blockquote>",
    );
    expect(await docText(page)).toBe("ನಮಸ್ಕಾರ\nಕನ್ನಡ\nನಾಡು\nಒಂದು\nಮನೆ");
  });

  test("suggestions and Backspace work inside a list item", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("- til");
    expect(await suggestions(page)).toContain("ತಿಳಿ");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("l ");
    await expect.poll(() => html(page)).toMatch(/^<ul><li><p>[ಀ-೿]+ <\/p><\/li><\/ul>$/u);
  });

  test("a link goes on the selected words, and an address that is not on the web is refused", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಓಪನ್ ಕನ್ನಡ");
    await page.keyboard.press("ControlOrMeta+a");
    await openMenu(page, "format-menu");
    await page.locator("#link-href").fill("javascript:alert(1)");
    await page.locator("#format-link [type=submit]").click();
    expect(await html(page)).toBe("<p>ಓಪನ್ ಕನ್ನಡ</p>");
    await openMenu(page, "format-menu");
    await page.locator("#link-href").fill("https://openkannada.org/");
    await page.locator("#format-link [type=submit]").click();
    expect(await html(page)).toBe('<p><a href="https://openkannada.org/" rel="noopener noreferrer">ಓಪನ್ ಕನ್ನಡ</a></p>');
  });

  test("pasted HTML keeps its headings, lists and bold, and drops what it cannot hold", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await paste(page, {
      html: '<h2>ವರದಿ</h2><ul><li>ಒಂದು</li><li><b>ಎರಡು</b></li></ul><p><i>ಓರೆ</i> <img src="x.png"><script>x()</script></p>',
      plain: "ವರದಿ\nಒಂದು\nಎರಡು\nಓರೆ",
    });
    await expect.poll(() => html(page)).toBe("<h2>ವರದಿ</h2><ul><li><p>ಒಂದು</p></li><li><p><strong>ಎರಡು</strong></p></li></ul><p><em>ಓರೆ</em></p>");
  });

  test("bold, italic and underline set with styles, as Google Docs copies them, are kept", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Firefox copies what it draws, and this page's policy blocks inline styles, so a styled copy here carries none.");
    await openEditor(page);
    await focusDoc(page);
    await paste(page, {
      html: '<b style="font-weight:normal" id="docs-internal-guid-1"><p><span style="font-weight:700">ದಪ್ಪ</span> <span style="font-style:italic">ಓರೆ</span> <span style="text-decoration:underline">ಗೆರೆ</span></p></b>',
      plain: "ದಪ್ಪ ಓರೆ ಗೆರೆ",
    });
    await expect.poll(() => html(page)).toBe("<p><strong>ದಪ್ಪ</strong> <em>ಓರೆ</em> <u>ಗೆರೆ</u></p>");
  });

  test("HTML saved with formats opens again with them", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.type("# ");
    await page.keyboard.insertText("ಶೀರ್ಷಿಕೆ");
    await enter(page);
    await page.keyboard.type("- ");
    await page.keyboard.insertText("ಒಂದು  ಎರಡು");
    const structure = await html(page);
    await openMenu(page, "save-menu");
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator('[data-export="html"]').click()]);
    const body = await readFile(await download.path(), "utf8");
    expect(body).toContain("<h1>ಶೀರ್ಷಿಕೆ</h1>");
    await openMenu(page, "tools-menu");
    await page.locator('[data-run="new"]').click();
    await expect.poll(() => docText(page)).toBe("");
    await page.locator("#file").setInputFiles({ name: "saved.html", mimeType: "text/html", buffer: Buffer.from(body) });
    await expect.poll(() => html(page)).toBe(structure);
  });

  test("the format menu works on a phone, and the Format button is in the toolbar", async ({ page }) => {
    await openEditor(page);
    await expect(page.locator("#format")).toBeVisible();
    await focusDoc(page);
    await page.keyboard.insertText("ಶೀರ್ಷಿಕೆ");
    await format(page, "h2");
    expect(await html(page)).toBe("<h2>ಶೀರ್ಷಿಕೆ</h2>");
  });
});

test.describe("on today's editor", () => {
  test.skip(NEXT, "Today's editor holds plain text.");

  test("there is no Format button", async ({ page }) => {
    await openEditor(page);
    await expect(page.locator("#format")).toBeHidden();
  });
});
