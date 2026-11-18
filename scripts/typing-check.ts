// Types into the built editor in Chrome the way people do, desktop keys and phone keyboards that compose
// words, and fails when a word is cut in 2, a letter stays Latin, or text lands on the wrong side of a line
// break: node scripts/typing-check.ts [dist]
import puppeteer, { type Page } from "puppeteer-core";

import { chrome, serve } from "./browser.ts";

const dist = process.argv[2] ?? "dist";
const { server, port } = serve(dist);
const browser = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });

/** A key to press, letters to type, or a phone keyboard's composition: its text so far, or the text it commits. */
type Step = { key: string } | { type: string } | { compose: string; from?: number; to?: number } | { commit: string } | { caret: number } | { selectAll: true } | { pause: number };
const composed = (word: string): Step[] => [...word].map((_, i) => ({ compose: word.slice(0, i + 1) }));

async function typed(path: string, steps: Step[], mode?: string): Promise<string> {
  const context = await browser.createBrowserContext();
  try {
    const page: Page = await context.newPage();
    const cdp = await page.createCDPSession();
    await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => (document.querySelector("#doc") as HTMLElement | null)?.isContentEditable);
    if (mode) await page.evaluate((m) => (document.getElementById(`mode-${m}`) as HTMLInputElement).click(), mode);
    await page.click("#doc");
    for (const step of steps) {
      if ("key" in step) {
        const keys = step.key.split("+");
        for (const k of keys.slice(0, -1)) await page.keyboard.down(k as never);
        await page.keyboard.press(keys.at(-1) as never);
        for (const k of keys.slice(0, -1).reverse()) await page.keyboard.up(k as never);
      }
      else if ("type" in step) await page.keyboard.type(step.type, { delay: 20 });
      else if ("pause" in step) await new Promise((r) => setTimeout(r, step.pause));
      else if ("compose" in step) {
        // A replacement up to -1 runs to the end of the text as it is now.
        const to = step.to === -1 ? await page.evaluate(() => (document.querySelector("#doc")?.textContent ?? "").replace(/\n$/, "").length) : step.to;
        const replace = step.from === undefined || to === undefined ? {} : { replacementStart: step.from, replacementEnd: to };
        await cdp.send("Input.imeSetComposition", { text: step.compose, selectionStart: step.compose.length, selectionEnd: step.compose.length, ...replace });
      }
      else if ("caret" in step) {
        await page.evaluate((at) => {
          const doc = document.querySelector("#doc") as HTMLElement;
          const node = doc.firstChild ?? doc;
          getSelection()?.collapse(node, Math.min(at, node.textContent?.length ?? 0));
        }, step.caret);
      } else if ("selectAll" in step) {
        await page.evaluate(() => getSelection()?.selectAllChildren(document.querySelector("#doc") as HTMLElement));
      } else await cdp.send("Input.insertText", { text: step.commit });
      await new Promise((r) => setTimeout(r, 40));
    }
    await new Promise((r) => setTimeout(r, 200));
    // The element ends with "\n" only when it holds the extra one that keeps an empty last line.
    return await page.evaluate(() => (document.querySelector("#doc")?.textContent ?? "").replace(/\n$/, ""));
  } finally {
    await context.close();
  }
}

const problems: string[] = [];
const expect = (label: string, got: string, want: string | RegExp) => {
  if (typeof want === "string" ? got !== want : !want.test(got)) problems.push(`${label}: got ${JSON.stringify(got)}, expected ${typeof want === "string" ? JSON.stringify(want) : want}`);
};
const typing = "/english-to-kannada-typing/";
const kannadaWord = /^[ಀ-೿]+$/u;

const whole = await typed(typing, [...composed("hello"), { commit: "hello " }]);
expect("a composed word", whole, /^[ಀ-೿]+ $/u);
expect("first letter sent alone, the rest composed", await typed(typing, [{ commit: "h" }, ...composed("ello"), { commit: "ello " }]), whole);
// The keyboard takes back the rendered letter and composes the whole word over it, as phone keyboards do.
expect("first letter sent alone, then taken back with the whole word", await typed(typing, [{ commit: "h" }, { compose: "he", from: 0, to: -1 }, ...composed("hello").slice(2), { commit: "hello " }]), whole);
expect("a word typed after clearing the document", await typed(typing, [{ type: "abc " }, { selectAll: true }, { key: "Backspace" }, { type: "hello" }]), kannadaWord);
expect("a word typed after a word and a space", await typed(typing, [{ type: "hi " }, { type: "ta" }]), /^[\u0C80-\u0CFF]+[ \u00a0][\u0C80-\u0CFF]+$/u);
expect("a word typed after a space typed at the end", await typed(typing, [{ type: "hi" }, { key: "Escape" }, { type: " ta" }]), /^hi[ \u00a0][\u0C80-\u0CFF]+$/u);
// "ನಮಸ್ಕಾರ " is 8 code units, so the caret goes right before ಕನ್ನಡ.
const before = await typed(typing, [{ type: "namaskaara kannaDa " }]);
expect("a word typed right before Kannada text", await typed(typing, [{ type: "namaskaara kannaDa " }, { caret: 8 }, { type: "hosa " }]), before.replace(/ /, " ಹೊಸ "));
expect("Enter after a word typed right before Kannada text", await typed(typing, [{ type: "namaskaara kannaDa " }, { caret: 8 }, { type: "hosa" }, { key: "Enter" }]), before.replace(/ /, " ಹೊಸ\n").replace(/ $/, " "));
expect("undo after a word typed right before Kannada text", await typed(typing, [{ type: "namaskaara kannaDa " }, { caret: 8 }, { pause: 1600 }, { type: "ho" }, { key: "Control+z" }]), before);
expect("a word ending in a consonant, then a space, before Kannada text leaves no ZWNJ", await typed(typing, [{ type: "namaskaara kannaDa " }, { caret: 8 }, { type: "bus " }]), /^[^\u200C]+$/u);
expect("a word typed over a selection", await typed(typing, [{ type: "abc" }, { key: "Escape" }, { selectAll: true }, { type: "nu" }]), kannadaWord);
expect("x and q in English letters", await typed(typing, [{ type: "taxi" }]), kannadaWord);
// A composition the page moves away from, with no compositionend, must not stop the editor converting.
expect("typing after a composition that never ended", await typed(typing, [{ compose: "hel" }, { caret: 0 }, { type: "ka " }]), /^[\u0C80-\u0CFF]+ /u);
for (const mode of ["english", "baraha", "iso15919"]) {
  expect(`${mode}: hello from the empty editor`, await typed("/", [{ type: "hello" }], mode), kannadaWord);
}
expect("Kannada keys: Enter at the end, then typing", await typed("/", [{ type: "abc" }, { key: "Enter" }, { type: "xy" }]), "abc\nxy");
expect("English: Enter at the end, then a word", await typed(typing, [{ type: "namaskara" }, { key: "Enter" }, { type: "hello" }]), /^[ಀ-೿]+\n[ಀ-೿]+$/u);
expect("Enter twice at the end, then typing", await typed("/", [{ type: "ab" }, { key: "Enter" }, { key: "Enter" }, { type: "c" }]), "ab\n\nc");
expect("Enter at the end, then Backspace", await typed("/", [{ type: "ab" }, { key: "Enter" }, { key: "Backspace" }, { type: "c" }]), "abc");
expect("Delete at the end after a line break keeps it", await typed("/", [{ type: "ab" }, { key: "Enter" }, { key: "Delete" }, { type: "c" }]), "ab\nc");

// A file the editor cannot read leaves the document as it was, with a message.
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => (document.querySelector("#doc") as HTMLElement | null)?.isContentEditable);
  await page.click("#doc");
  await page.keyboard.type("abc");
  const dropped = await page.evaluate(async () => {
    const doc = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, ...new Array(512).fill(0)]);
    const data = new DataTransfer();
    data.items.add(new File([doc], "old.doc"));
    document.dispatchEvent(new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 800));
    return { text: document.querySelector("#doc")?.textContent ?? "", toast: document.querySelector("[role=status]")?.textContent ?? document.body.innerText };
  });
  expect("a dropped .doc leaves the document as it was", dropped.text, "abc");
  expect("a dropped .doc says what to do", dropped.toast, /\.docx/);
  await context.close();
}

// Rich text copied from another page pastes with no console error and converts its legacy font text.
{
  const context = await browser.createBrowserContext();
  const source = await context.newPage();
  await source.setContent(`<div id="s" contenteditable><p><span style="font-family:Calibri">Report</span></p><p style='font-family:"BRH Kannada"'>PÀ£ÀßqÀ</p></div>`);
  await source.evaluate(() => {
    const s = document.getElementById("s") as HTMLElement;
    s.focus();
    getSelection()?.selectAllChildren(s);
  });
  await source.keyboard.press("KeyC", { commands: ["Copy"] } as never);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => (document.querySelector("#doc") as HTMLElement | null)?.isContentEditable);
  await page.click("#doc");
  await page.keyboard.press("KeyV", { commands: ["Paste"] } as never);
  await new Promise((r) => setTimeout(r, 800));
  expect("rich paste", (await page.evaluate(() => document.querySelector("#doc")?.textContent ?? "")).replace(/\n$/, ""), "Report\nಕನ್ನಡ");
  expect("rich paste logs no console error", errors.join(" | "), "");
  await context.close();
}

await browser.close();
server.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Typing: words convert from their first letter, on desktop keys and composing phone keyboards, and line breaks keep text after them.");
