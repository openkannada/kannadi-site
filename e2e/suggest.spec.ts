// Word suggestions while typing in English letters: what they offer, and choosing one by click, tap or keyboard.
import { expect, test } from "@playwright/test";

import { chooseMode, currentSuggestion, docText, ENGINE, focusDoc, isPhone, openEditor, suggestions } from "./editor.ts";

test.beforeEach(async ({ page }) => {
  await openEditor(page, { mode: "english" });
  await focusDoc(page);
});

test("the suggestions match the word being typed, and the shown word is the first", async ({ page }) => {
  await page.keyboard.type("til");
  const list = await suggestions(page);
  expect(list[0]).toBe(await docText(page));
  expect(await currentSuggestion(page)).toBe(list[0]);
  // Short common words that start the same way come before long forms.
  expect(list).toContain("ತಿಳಿ");
  expect(list).not.toContain("ತಿಳಿದುಬರುತ್ತದೆ");
});

test("the word typed without its final a is offered with it", async ({ page }) => {
  test.fail(ENGINE, "The typing engine offers ತಿಲ only for tila.");
  await page.keyboard.type("til");
  expect(await suggestions(page)).toContain("ತಿಲ");
});

test("each suggestion sounds like the letters typed", async ({ page }) => {
  for (const [typed, want] of [["namaskara", "ನಮಸ್ಕಾರ"], ["kannada", "ಕನ್ನಡ"], ["mane", "ಮನೆ"], ["haalu", "ಹಾಲು"], ["bengaluru", "ಬೆಂಗಳೂರು"]] as const) {
    await page.keyboard.type(typed);
    expect(await docText(page), typed).toBe(want);
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
  }
});

test("a suggestion chosen by click or tap replaces the word", async ({ page }) => {
  await page.keyboard.type("til");
  const list = await suggestions(page);
  const second = page.locator("#suggest button").nth(1);
  await (isPhone(page) ? second.tap() : second.click());
  expect(await docText(page)).toBe(list[1]);
  await expect(page.locator("#doc")).toBeFocused();
  await page.keyboard.type(" ma");
  expect((await docText(page)).replace(/ /g, " ")).toBe(`${list[1]} ಮ`);
});

test("Tab and Shift+Tab move through the suggestions, and Space keeps the chosen one", async ({ page }) => {
  await page.keyboard.type("til");
  const list = await suggestions(page);
  await page.keyboard.press("Tab");
  expect(await docText(page)).toBe(list[1]);
  expect(await currentSuggestion(page)).toBe(list[1]);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  expect(await docText(page)).toBe(list[1]);
  await expect(page.locator("#announce")).toContainText(list[1]!);
  await page.keyboard.press("Space");
  expect((await docText(page)).replace(/ /g, " ")).toBe(`${list[1]} `);
});

test("a chosen word comes first the next time", async ({ page }) => {
  await page.keyboard.type("til");
  const list = await suggestions(page);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await page.keyboard.type("til");
  expect(await docText(page)).toMatch(new RegExp(`${list[1]}$`));
});

test("after a word is done its alternatives stay until the next edit, and a pick swaps it", async ({ page }) => {
  await page.keyboard.type("til ");
  const list = await suggestions(page);
  expect(list.length).toBeGreaterThan(1);
  const second = page.locator("#suggest button").nth(1);
  await (isPhone(page) ? second.tap() : second.click());
  expect((await docText(page)).replace(/ /g, " ")).toBe(`${list[1]} `);
  await page.keyboard.type("ma");
  expect((await docText(page)).replace(/ /g, " ")).toBe(`${list[1]} ಮ`);
});

test("digits after a word are typed as digits", async ({ page }) => {
  await page.keyboard.type("ward12");
  expect(await docText(page)).toMatch(/^[ಀ-೿]+12$/u);
});

test("the word list is all that loads; the typing engine's model waits for ?typing=next", async ({ page }) => {
  test.skip(ENGINE, "On the word list only.");
  const asked: string[] = [];
  page.on("request", (r) => asked.push(r.url()));
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
  await chooseMode(page, "english");
  await focusDoc(page);
  await page.keyboard.type("namaskara");
  expect(await docText(page)).toBe("ನಮಸ್ಕಾರ");
  expect(asked.filter((url) => /\/kn\.typing\b|kannadi_typing/.test(url))).toEqual([]);
  expect(asked.some((url) => /words\.[\w-]+\.tsv$/.test(url))).toBe(true);
});

test.describe("with the typing engine", () => {
  test.skip(!ENGINE, "With ?typing=next only.");

  test("words picked from the word list carry over, and a word picked now is kept after a reload", async ({ page }) => {
    const models: string[] = [];
    page.on("request", (r) => /\/kn\.typing\b/.test(r.url()) && models.push(r.url()));
    await page.evaluate(() => {
      localStorage.removeItem("kannadi.typing.v1");
      localStorage.setItem("kannadi.picks.v1", JSON.stringify([["til", "ತಿಳಿ"]]));
    });
    const reload = async () => {
      await page.reload();
      await page.waitForFunction(() => document.documentElement.classList.contains("ready"));
      await chooseMode(page, "english");
      await page.evaluate(() => (document.getElementById("doc")!.textContent = ""));
      await focusDoc(page);
    };
    await reload();
    await page.keyboard.type("til");
    expect(await docText(page)).toBe("ತಿಳಿ");
    await page.keyboard.type(" mane");
    const list = await suggestions(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("kannadi.typing.v1"))).not.toBeNull();
    await reload();
    await page.keyboard.type("mane");
    expect(await docText(page)).toMatch(new RegExp(`${list[1]}$`));
    // The model comes gzipped, since Cloudflare does not compress binary files.
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((url) => url.endsWith(".gz"))).toBe(true);
  });
});
