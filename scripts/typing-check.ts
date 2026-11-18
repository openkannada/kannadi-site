// Types into the built editor in Chrome the way people do, desktop keys and phone keyboards that compose
// words, and fails when a word is cut in 2, a letter stays Latin, or text lands on the wrong side of a line
// break: node scripts/typing-check.ts [dist]
import puppeteer, { type Page } from "puppeteer-core";

import { chrome, serve } from "./browser.ts";

const dist = process.argv[2] ?? "dist";
const { server, port } = serve(dist);
const browser = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });

/** A key to press, letters to type, or a phone keyboard's composition: its text so far, or the text it commits. */
type Step = { key: string } | { type: string } | { compose: string } | { commit: string };
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
      if ("key" in step) await page.keyboard.press(step.key as never);
      else if ("type" in step) await page.keyboard.type(step.type, { delay: 20 });
      else if ("compose" in step) await cdp.send("Input.imeSetComposition", { text: step.compose, selectionStart: step.compose.length, selectionEnd: step.compose.length });
      else await cdp.send("Input.insertText", { text: step.commit });
      await new Promise((r) => setTimeout(r, 40));
    }
    await new Promise((r) => setTimeout(r, 200));
    return await page.evaluate(() => document.querySelector("#doc")?.textContent ?? "");
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
expect("first letter sent alone, then the whole word again", await typed(typing, [{ commit: "h" }, ...composed("hello"), { commit: "hello " }]).then((t) => t.replace(/^[ಀ-೿]{0,2}(?=[ಀ-೿]+ $)/u, (m) => m)), /^[ಀ-೿]+ $/u);
for (const mode of ["english", "baraha", "iso15919"]) {
  expect(`${mode}: hello from the empty editor`, await typed("/", [{ type: "hello" }], mode), kannadaWord);
}
expect("Kannada keys: Enter at the end, then typing", await typed("/", [{ type: "abc" }, { key: "Enter" }, { type: "xy" }]), "abc\nxy");
expect("English: Enter at the end, then a word", await typed(typing, [{ type: "namaskara" }, { key: "Enter" }, { type: "hello" }]), /^[ಀ-೿]+\n[ಀ-೿]+$/u);
expect("Enter twice at the end, then typing", await typed("/", [{ type: "ab" }, { key: "Enter" }, { key: "Enter" }, { type: "c" }]), "ab\n\nc");
expect("Enter at the end, then Backspace", await typed("/", [{ type: "ab" }, { key: "Enter" }, { key: "Backspace" }, { type: "c" }]), "abc");
expect("Delete at the end after a line break keeps it", await typed("/", [{ type: "ab" }, { key: "Enter" }, { key: "Delete" }, { type: "c" }]), "ab\nc");

await browser.close();
server.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Typing: words convert from their first letter, on desktop keys and composing phone keyboards, and line breaks keep text after them.");
