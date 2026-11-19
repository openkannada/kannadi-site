// Paste, open, save and reopen, the sample page and the F8 fix flow, and keeping the text across a reload.
import { readFile } from "node:fs/promises";

import { expect, type Page, test } from "@playwright/test";

import { writeZip } from "../src/editor/zip.ts";
import { docText, focusDoc, isPhone, openEditor, openMenu } from "./editor.ts";

const NUDI = "PÀ£ÀßqÀ"; // ಕನ್ನಡ in Nudi and Baraha (BRH) fonts.

/**
 * Pastes clipboard data into the document. Firefox drops data put on a synthetic paste event, so there the text is
 * copied for real from a scratch element, through its own clipboard; elsewhere the paste event carries it.
 */
async function paste(page: Page, data: { plain: string; html?: string }): Promise<void> {
  if (page.context().browser()?.browserType().name() === "firefox") {
    const caret = await page.evaluate(({ plain, html }) => {
      const sel = getSelection()!;
      const node = document.getElementById("doc")!.firstChild;
      const at = sel.rangeCount && node && sel.getRangeAt(0).startContainer === node ? sel.getRangeAt(0).startOffset : -1;
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
      return at;
    }, data);
    await page.keyboard.press("ControlOrMeta+c");
    await page.evaluate((at) => {
      document.getElementById("paste-source")!.remove();
      const doc = document.getElementById("doc")!;
      doc.focus();
      const node = doc.firstChild;
      if (node && at >= 0) getSelection()!.collapse(node, at);
    }, caret);
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

/** Opens a file through the Open button's file input. */
async function openFile(page: Page, name: string, body: Buffer | string, mimeType = "application/octet-stream"): Promise<void> {
  await page.locator("#file").setInputFiles({ name, mimeType, buffer: Buffer.from(body) });
}

/** Saves through the Save menu and returns the file's name and bytes. */
async function save(page: Page, format: string): Promise<{ name: string; body: Buffer }> {
  await openMenu(page, "save-menu");
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator(`[data-export="${format}"]`).click()]);
  const path = await download.path();
  return { name: download.suggestedFilename(), body: await readFile(path) };
}

/**
 * Empties the document with New document, so a file that fails to open leaves it empty. Reloading instead would
 * bring the text back, since the page saves it as it unloads.
 */
async function newDocument(page: Page): Promise<void> {
  await openMenu(page, "tools-menu");
  await page.locator('[data-run="new"]').click();
  await expect.poll(() => docText(page)).toBe("");
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docx = (body: string) =>
  writeZip([
    ["word/document.xml", `<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`],
    ["word/styles.xml", `<?xml version="1.0"?><w:styles ${W}></w:styles>`],
  ]);
const run = (text: string, font?: string) =>
  `<w:r>${font ? `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/></w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;

test.beforeEach(async ({ page }) => {
  await openEditor(page);
  await focusDoc(page);
});

test.describe("paste", () => {
  test("Unicode Kannada pastes as it is", async ({ page }) => {
    await paste(page, { plain: "ಕನ್ನಡ ನಾಡು\nಎರಡನೆಯ ಸಾಲು" });
    await expect.poll(() => docText(page)).toBe("ಕನ್ನಡ ನಾಡು\nಎರಡನೆಯ ಸಾಲು");
  });

  test("Nudi text converts, and can be put back as it was", async ({ page }) => {
    await paste(page, { plain: NUDI });
    await expect.poll(() => docText(page)).toBe("ಕನ್ನಡ");
    await expect(page.locator("#toast-text")).toContainText("converted");
    await page.locator("#toast-action").click();
    await expect.poll(() => docText(page)).toBe(NUDI);
  });

  for (const font of ["BRH Kannada", "Baraha Kan", "Nudi 01 e"]) {
    test(`rich text in ${font} converts, and English in it stays English`, async ({ page }) => {
      await paste(page, { plain: `Report\n${NUDI}`, html: `<p><span style="font-family:Calibri">Report</span></p><p style="font-family:'${font}'">${NUDI}</p>` });
      await expect.poll(() => docText(page)).toBe("Report\nಕನ್ನಡ");
    });
  }

  test("mixed English and Unicode Kannada is left alone", async ({ page }) => {
    const mixed = "Ward 12: ಕನ್ನಡ ಶಾಲೆ, Bengaluru (2026)";
    await paste(page, { plain: mixed });
    await expect.poll(() => docText(page)).toBe(mixed);
  });

  test("plain English is left alone", async ({ page }) => {
    await paste(page, { plain: "Minutes of the meeting held on 12 March." });
    await expect.poll(() => docText(page)).toBe("Minutes of the meeting held on 12 March.");
  });

  test("a long Nudi document converts quickly and stays quick to type in", async ({ page }) => {
    const line = "¸ÀPÁðj ¥ÁæxÀ«ÄPÀ ±Á¯ÉUÀ¼À°è PÁAiÀÄð¤ªÀð»¸ÀÄwÛgÀÄªÀ ²PÀëPÀjUÉ ¥ÀÅ£Àgï ZÉÃvÀ£À";
    const text = Array.from({ length: 3000 }, () => line).join("\n");
    const started = Date.now();
    await paste(page, { plain: text });
    await expect.poll(() => page.evaluate(() => (document.getElementById("doc")?.textContent ?? "").length), { timeout: 20_000 }).toBeGreaterThan(100_000);
    const converted = Date.now() - started;
    expect(await docText(page)).not.toContain("¸");
    expect(converted, "ms to convert 3,000 lines").toBeLessThan(8_000);
    // Typing at the end of a long document must keep up with the keys.
    await page.keyboard.press("ControlOrMeta+End");
    const typed = Date.now();
    await page.keyboard.type("abcdefghij");
    expect(Date.now() - typed, "ms to type 10 letters").toBeLessThan(3_000);
    expect(await docText(page)).toMatch(/abcdefghij$/);
  });
});

test.describe("open", () => {
  test("a Nudi text file converts", async ({ page }) => {
    await openFile(page, "old.txt", Buffer.from([0x50, 0xc0, 0xa3, 0xc0, 0xdf, 0x71, 0xc0]), "text/plain");
    await expect.poll(() => docText(page)).toBe("ಕನ್ನಡ");
    await expect(page.locator("#toast-text")).toContainText("old.txt");
  });

  test("a Word file with English and Nudi runs converts only the Nudi", async ({ page }) => {
    const body = `<w:p>${run("English ", "Arial")}${run(NUDI, "BRH Kannada")}</w:p><w:p>${run("ಯೂನಿಕೋಡ್")}</w:p>`;
    await openFile(page, "letter.docx", Buffer.from(await docx(body)));
    await expect.poll(() => docText(page)).toBe("English ಕನ್ನಡ\nಯೂನಿಕೋಡ್");
  });

  test("an HTML page in a Nudi font converts", async ({ page }) => {
    const html = `<!doctype html><html><head><style>.k{font-family:"Nudi 01 e"}</style></head><body><h1>Notice</h1><p class="k">${NUDI}</p></body></html>`;
    await openFile(page, "notice.html", html, "text/html");
    await expect.poll(() => docText(page)).toBe("Notice\nಕನ್ನಡ");
  });

  test("an old .doc file is refused with a message and leaves the text alone", async ({ page }) => {
    await page.keyboard.type("abc");
    await openFile(page, "old.doc", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, ...new Array(512).fill(0)]));
    await expect(page.locator("#toast-text")).toContainText(".docx");
    expect(await docText(page)).toBe("abc");
  });

  test("the page from 2002 opens converted, with its marks and the problem count", async ({ page }) => {
    const sample = page.locator("#sample");
    await (isPhone(page) ? sample.tap() : sample.click());
    await expect.poll(() => docText(page)).toContain("ಶಿಕ್ಷಕರಿಗೆ");
    expect(await docText(page)).not.toMatch(/[¸ÀÉÃ]/);
    await expect(page.locator("#toast-text")).toContainText(/converted/i);
  });
});

test.describe("fixing marked problems", () => {
  test("F8 goes to a broken syllable, offers a fix, and the fix clears the mark", async ({ page }, info) => {
    test.skip(isPhone(page), "F8 is a desktop key; phones tap the mark.");
    // A vowel sign after a virama is a broken syllable.
    await page.keyboard.insertText("ಕನ್ನಡ ಕ್ಾ ನಾಡು");
    await expect(page.locator("#problems")).toBeVisible();
    await expect(page.locator("#problem-count")).toHaveText("1");
    await page.keyboard.press("F8");
    await expect(page.locator("#popover")).toBeVisible();
    await expect(page.locator("#popover .pop-actions button").first()).toBeFocused();
    await info.attach("fix-card.png", { body: await page.screenshot(), contentType: "image/png" });
    await page.keyboard.press("Enter");
    await expect(page.locator("#problems")).toBeHidden();
    expect(await docText(page)).not.toContain("್ಾ");
    await expect(page.locator("#doc")).toBeFocused();
  });

  test("Shift+F8 goes back, and Escape closes the card", async ({ page }) => {
    test.skip(isPhone(page), "F8 is a desktop key; phones tap the mark.");
    await page.keyboard.insertText("ಕ್ಾ ಮತ್ತು ಗ್ೆ");
    await expect(page.locator("#problem-count")).toHaveText("2");
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.press("Shift+F8");
    await expect(page.locator("#popover")).toBeVisible();
    // The card names the broken sign; the second problem, ಗ್ೆ, is the last one.
    await expect(page.locator("#popover .pop-sample")).toHaveText("ೆ");
    await page.keyboard.press("Escape");
    await expect(page.locator("#popover")).toBeHidden();
  });

  test("tapping a mark opens its fixes", async ({ page }) => {
    await page.keyboard.insertText("ಕನ್ನಡ ಕ್ಾ");
    await expect(page.locator("#problem-count")).toHaveText("1");
    // The vowel sign after the virama, at offset 8, is the mark; the tap lands on the syllable ಕ್ಾ it is part of.
    const at = await page.evaluate(() => {
      const range = document.createRange();
      range.setStart(document.getElementById("doc")!.firstChild!, 8);
      range.setEnd(document.getElementById("doc")!.firstChild!, 9);
      const r = range.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (isPhone(page)) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    await expect(page.locator("#popover")).toBeVisible();
  });
});

test.describe("save and reopen", () => {
  const TEXT = "ಕನ್ನಡ ನಾಡು\n\tಎರಡನೆಯ ಸಾಲು <b>&\n\nಕೊನೆ";

  for (const format of ["txt", "html", "docx"]) {
    test(`${format} keeps the text exactly`, async ({ page }) => {
      test.skip(isPhone(page) && format === "docx", "The same code saves on phones; once is enough.");
      await page.keyboard.insertText("x");
      await page.evaluate((text) => {
        const doc = document.getElementById("doc")!;
        doc.textContent = text;
        doc.dispatchEvent(new InputEvent("input", { inputType: "insertReplacementText" }));
      }, TEXT);
      const file = await save(page, format);
      expect(file.name).toBe(`kannada.${format}`);
      await newDocument(page);
      await openFile(page, file.name, file.body);
      await expect.poll(() => docText(page)).toBe(TEXT);
    });
  }

  test("saved HTML edited elsewhere, with a comment added, still opens", async ({ page }) => {
    const text = "ಕನ್ನಡ  ನಾಡು\n\n  ಎರಡು\n";
    await paste(page, { plain: text });
    await expect.poll(() => docText(page)).toBe(text);
    const file = await save(page, "html");
    const edited = file.body.toString("utf8").replace("<body>", "<body>\n<!-- edited in another program -->");
    await newDocument(page);
    await openFile(page, "edited.html", edited, "text/html");
    await expect.poll(() => docText(page)).toBe(text);
  });

  test("Nudi keeps the text when converted back", async ({ page }) => {
    await page.keyboard.insertText("ಕನ್ನಡ ನಾಡು");
    const file = await save(page, "nudi");
    expect(file.name).toBe("kannada-nudi.txt");
    expect([...file.body]).not.toContain(0x3f);
    await newDocument(page);
    await openFile(page, "back.txt", file.body, "text/plain");
    await expect.poll(() => docText(page)).toBe("ಕನ್ನಡ ನಾಡು");
  });
});

test.describe("on this device", () => {
  test("a reload keeps the text, the mode and says it is saved", async ({ page }) => {
    await page.keyboard.insertText("ಕನ್ನಡ");
    await expect(page.locator("#saved")).toHaveText("Saved on this device");
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
    expect(await docText(page)).toBe("ಕನ್ನಡ");
    await expect(page.locator("#saved")).toHaveText("Saved on this device");
  });

  test("text typed right before closing the page is kept", async ({ page }) => {
    await page.keyboard.insertText("ಕನ್ನಡ");
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
    expect(await docText(page)).toBe("ಕನ್ನಡ");
  });

  test("New document clears the text", async ({ page }) => {
    await page.keyboard.insertText("ಕನ್ನಡ");
    await openMenu(page, "tools-menu");
    await page.locator('[data-run="new"]').click();
    expect(await docText(page)).toBe("");
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
    expect(await docText(page)).toBe("");
  });
});
