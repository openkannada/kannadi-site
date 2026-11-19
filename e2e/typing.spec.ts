// Typing in every mode, with real key events, insertText and keyboard compositions.
import { expect, test } from "@playwright/test";

import { caretAt, chooseMode, docText, focusDoc, isPhone, KANNADA_WORD, type Mode, openEditor, savedText } from "./editor.ts";

const LATIN_MODES: Exclude<Mode, "kannada">[] = ["english", "baraha", "iso15919"];
const KANNADA_LINE = /^[ಀ-೿‌ ]+$/u;

test.describe("the first letter", () => {
  for (const mode of LATIN_MODES) {
    test(`${mode}: the first letter typed in an empty document converts`, async ({ page }) => {
      await openEditor(page, { mode });
      await focusDoc(page);
      await page.keyboard.type("k");
      expect(await docText(page)).toMatch(KANNADA_WORD);
      await page.keyboard.type("a");
      expect(await docText(page)).toBe("ಕ");
    });
  }

  // The browser leaves a <br> in a cleared element; it once became a "\n" that kept the next letter Latin.
  test("english: the first letter after clearing the document converts", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("abc ");
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
    expect(await docText(page)).toBe("");
    await page.keyboard.type("ka");
    expect(await docText(page)).toBe("ಕ");
    // The saved text is what the editor holds; a stray line break from the cleared element would show here.
    await expect.poll(() => savedText(page)).toBe("ಕ");
  });

  test("english: the first letter after a cleared line with a placeholder <br> converts", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.evaluate(() => {
      const doc = document.getElementById("doc")!;
      doc.innerHTML = "<br>";
      getSelection()?.collapse(doc, 0);
    });
    await page.keyboard.type("ka");
    expect(await docText(page)).toBe("ಕ");
    await expect.poll(() => savedText(page)).toBe("ಕ");
  });

  test("english: words after spaces convert, and spaces stay plain spaces", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("ka ka ka ");
    await page.keyboard.type("ka");
    const text = await docText(page);
    expect(text.replace(/ /g, " ")).toBe("ಕ ಕ ಕ ಕ");
    // The saved text has ordinary spaces, whatever the browser shows.
    await expect.poll(() => savedText(page)).toBe("ಕ ಕ ಕ ಕ");
  });
});

test.describe("input methods", () => {
  // Every way text reaches the page must convert the same: key presses, typed text, insertText and paste-like input.
  const methods: Record<string, (page: import("@playwright/test").Page, text: string) => Promise<void>> = {
    "keyboard.type": (page, text) => page.keyboard.type(text, { delay: 30 }),
    "keyboard.press": async (page, text) => {
      for (const c of text) await page.keyboard.press(c);
    },
    insertText: async (page, text) => {
      for (const c of text) await page.keyboard.insertText(c);
    },
    "execCommand insertText": async (page, text) => {
      for (const c of text) await page.evaluate((c) => document.execCommand("insertText", false, c), c);
    },
  };
  for (const [name, send] of Object.entries(methods)) {
    test(`english: "til" by ${name} converts`, async ({ page }) => {
      await openEditor(page, { mode: "english" });
      await focusDoc(page);
      await send(page, "til");
      expect(await docText(page)).toMatch(KANNADA_WORD);
    });
  }

  test("english: typing right after clicking the English button lands in the document, converted", async ({ page }) => {
    await openEditor(page);
    await chooseMode(page, "english");
    await page.keyboard.type("til");
    expect(await docText(page)).toMatch(KANNADA_WORD);
  });

  test("english: clicking English when it is already chosen still sends typing to the document", async ({ page }) => {
    await openEditor(page, { path: "/english-to-kannada-typing/" });
    await expect(page.locator("#mode-english")).toBeChecked();
    const label = page.locator('label[for="mode-english"]');
    await (isPhone(page) ? label.tap() : label.click());
    await page.keyboard.type("til");
    expect(await docText(page)).toMatch(KANNADA_WORD);
  });

  test("english: a mode chosen while the editor is still loading is kept", async ({ page }) => {
    await page.route(/\.wasm$/, async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    await page.goto("/editor/");
    const label = page.locator('label[for="mode-english"]');
    await (isPhone(page) ? label.tap() : label.click());
    await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
    await expect(page.locator("#mode-english")).toBeChecked();
    await focusDoc(page);
    await page.keyboard.type("til");
    expect(await docText(page)).toMatch(KANNADA_WORD);
  });

  test("switching mode with the toolbar keeps the caret where it was", async ({ page }) => {
    await openEditor(page, { mode: "baraha" });
    await focusDoc(page);
    await page.keyboard.type("kannaDa naaDu");
    await caretAt(page, 5);
    await chooseMode(page, "kannada");
    await page.keyboard.insertText("!");
    expect((await docText(page)).replace(/\u00a0/g, " ")).toBe("ಕನ್ನಡ! ನಾಡು");
  });

  test("english: typing before the word list loads converts, then gets the best spelling", async ({ page }) => {
    await page.route(/words.*\.tsv/, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await openEditor(page);
    const label = page.locator('label[for="mode-english"]');
    await (isPhone(page) ? label.tap() : label.click());
    await page.keyboard.type("namaskara");
    expect(await docText(page)).toMatch(KANNADA_WORD);
    await expect.poll(() => docText(page), { timeout: 10_000 }).toBe("ನಮಸ್ಕಾರ");
  });

  test("english: a keyboard composition converts when it ends", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Compositions are driven through the Chrome DevTools Protocol.");
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    const cdp = await page.context().newCDPSession(page);
    for (const t of ["t", "ti", "til"]) await cdp.send("Input.imeSetComposition", { text: t, selectionStart: t.length, selectionEnd: t.length });
    await cdp.send("Input.insertText", { text: "til " });
    await expect.poll(() => docText(page)).toMatch(/^[ಀ-೿]+ $/u);
  });

  test("english: composition events without key events convert", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    // What a phone keyboard sends: compositionstart, compositionupdate and text, then compositionend.
    await page.evaluate(async () => {
      const doc = document.getElementById("doc")!;
      doc.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
      document.execCommand("insertText", false, "til");
      doc.dispatchEvent(new CompositionEvent("compositionend", { data: "til" }));
    });
    await expect.poll(() => docText(page)).toMatch(KANNADA_WORD);
  });
});

test.describe("text with line breaks", () => {
  test("inserted text keeps its line breaks", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಒಂದು\nಎರಡು\n\nಮೂರು");
    expect(await docText(page)).toBe("ಒಂದು\nಎರಡು\n\nಮೂರು");
    await page.keyboard.insertText("!");
    expect(await docText(page)).toBe("ಒಂದು\nಎರಡು\n\nಮೂರು!");
  });
});

test.describe("Kannada keys", () => {
  test("Kannada letters go in as typed and Latin stays Latin", async ({ page }) => {
    await openEditor(page);
    await focusDoc(page);
    await page.keyboard.insertText("ಕನ್ನಡ");
    await page.keyboard.type(" abc");
    expect(await docText(page)).toBe("ಕನ್ನಡ abc");
  });
});

test.describe("editing", () => {
  test("baraha: Backspace in a word takes back 1 letter at a time, through ottaksharas", async ({ page }) => {
    await openEditor(page, { mode: "baraha" });
    await focusDoc(page);
    await page.keyboard.type("kannaDa");
    expect(await docText(page)).toBe("ಕನ್ನಡ");
    const steps: string[] = [];
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press("Backspace");
      steps.push(await docText(page));
    }
    expect(steps).toEqual(["ಕನ್ನಡ್", "ಕನ್ನ", "ಕನ್ನ್", "ಕನ್", "ಕ", "ಕ್", ""]);
  });

  test("baraha: Backspace after a finished word deletes Kannada signs, never leaving Latin", async ({ page }) => {
    await openEditor(page, { mode: "baraha" });
    await focusDoc(page);
    await page.keyboard.type("kannaDa ");
    let text = await docText(page);
    while (text) {
      await page.keyboard.press("Backspace");
      const next = await docText(page);
      expect(next.length).toBeLessThan(text.length);
      expect("ಕನ್ನಡ ".startsWith(next.replace(/ /g, " "))).toBe(true);
      text = next;
    }
  });

  for (const [key, char] of [["Space", " "], ["Comma", ","], ["Period", "."], ["Shift+Digit1", "!"], ["Enter", "\n"]] as const) {
    test(`english: ${key} ends the word and keeps it`, async ({ page }) => {
      await openEditor(page, { mode: "english" });
      await focusDoc(page);
      await page.keyboard.type("namaskara");
      await page.keyboard.press(key);
      await page.keyboard.type("kannada");
      expect((await docText(page)).replace(/ /g, " ")).toBe(`ನಮಸ್ಕಾರ${char}ಕನ್ನಡ`);
    });
  }

  for (const mode of ["kannada", "english", "baraha"] as const) {
    test(`${mode}: Enter at the end, then typing, starts a new line`, async ({ page }) => {
      await openEditor(page, { mode });
      await focusDoc(page);
      const [first, second] = mode === "kannada" ? ["ಅಬ", "ಕ"] : ["ab", "ka"];
      if (mode === "kannada") await page.keyboard.insertText(first!);
      else await page.keyboard.type(first!);
      const line = await docText(page);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      if (mode === "kannada") await page.keyboard.insertText(second!);
      else await page.keyboard.type(second!);
      expect(await docText(page)).toBe(`${line}\n\nಕ`);
      // Backspace in a word being typed takes back 1 Latin letter, so the Latin modes need 1 press per letter.
      for (let i = 0; i < (mode === "kannada" ? 2 : 3); i++) await page.keyboard.press("Backspace");
      if (mode === "kannada") await page.keyboard.insertText(second!);
      else await page.keyboard.type(second!);
      expect(await docText(page)).toBe(`${line}\nಕ`);
    });
  }

  test("baraha: letters typed in the middle of a word go in as Kannada", async ({ page }) => {
    await openEditor(page, { mode: "baraha" });
    await focusDoc(page);
    await page.keyboard.type("kanaDa ");
    await caretAt(page, 2);
    await page.keyboard.type("n");
    const text = await docText(page);
    expect(text).not.toMatch(/[a-z]/);
    expect(text.replace(/ /g, " ")).toMatch(/^[ಀ-೿‌]+ $/u);
  });

  test("english: undo and redo whole words", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("namaskara ");
    await page.waitForTimeout(1600);
    await page.keyboard.type("kannada");
    await page.keyboard.press("ControlOrMeta+z");
    expect((await docText(page)).replace(/ /g, " ")).toBe("ನಮಸ್ಕಾರ ");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect((await docText(page)).replace(/ /g, " ")).toBe("ನಮಸ್ಕಾರ ಕನ್ನಡ");
    await page.keyboard.press("ControlOrMeta+z");
    await page.keyboard.press("ControlOrMeta+y");
    expect((await docText(page)).replace(/ /g, " ")).toBe("ನಮಸ್ಕಾರ ಕನ್ನಡ");
  });

  test("switching mode mid-word keeps the word and types the next one in the new mode", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("kanna");
    const first = await docText(page);
    expect(first).toMatch(KANNADA_WORD);
    await page.keyboard.press("Alt+Digit3");
    await expect(page.locator("#mode-baraha")).toBeChecked();
    await page.keyboard.type("Da");
    expect(await docText(page)).toBe(`${first}ಡ`);
    await page.keyboard.press("Alt+Digit1");
    await page.keyboard.type("x");
    expect(await docText(page)).toBe(`${first}ಡx`);
  });

  test("english: Escape keeps the word in English letters", async ({ page }) => {
    await openEditor(page, { mode: "english" });
    await focusDoc(page);
    await page.keyboard.type("hello");
    await page.keyboard.press("Escape");
    expect(await docText(page)).toBe("hello");
  });

  test("every Latin mode types a whole line of Kannada", async ({ page }) => {
    const lines: Record<string, string> = { english: "namaskara kannada", baraha: "namaskaara kannaDa", iso15919: "namaskāra kannaḍa" };
    for (const mode of LATIN_MODES) {
      await openEditor(page, { mode });
      await focusDoc(page);
      await page.keyboard.type(lines[mode]!);
      expect((await docText(page)).replace(/ /g, " "), mode).toMatch(KANNADA_LINE);
      await page.evaluate(() => localStorage.clear());
    }
  });
});
