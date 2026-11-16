// The suggestion strip: Kannada words for the word being typed in English
// letters, shown above the word on desktop and above the toolbar on phones.
import type { ComposingWord } from "./compose.ts";

export class SuggestStrip {
  private readonly el: HTMLElement;
  private readonly rect: (start: number, end: number) => DOMRect;
  private readonly pick: (index: number) => void;
  private buttons: HTMLButtonElement[] = [];

  constructor(el: HTMLElement, rect: (start: number, end: number) => DOMRect, pick: (index: number) => void) {
    this.el = el;
    this.rect = rect;
    this.pick = pick;
    // Keep the caret in the document while a word is tapped.
    el.addEventListener("pointerdown", (e) => e.preventDefault());
  }

  show(word: ComposingWord, words: string[], selected: number): void {
    this.buttons = words.map((w, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.lang = "kn";
      b.textContent = w;
      b.tabIndex = -1;
      b.addEventListener("click", () => this.pick(i));
      return b;
    });
    this.el.replaceChildren(...this.buttons);
    this.select(selected);
    this.el.hidden = false;
    this.place(word);
  }

  select(index: number): void {
    this.buttons.forEach((b, i) => (i === index ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current")));
  }

  hide(): void {
    this.el.hidden = true;
    this.el.replaceChildren();
    this.buttons = [];
  }

  private place(word: ComposingWord): void {
    if (matchMedia("(max-width: 47.99rem)").matches) {
      this.el.style.left = this.el.style.top = "";
      return;
    }
    const r = this.rect(word.start, word.end);
    const above = r.top - this.el.offsetHeight - 8;
    this.el.style.left = `${Math.max(8, Math.min(r.left - 8, innerWidth - this.el.offsetWidth - 8))}px`;
    this.el.style.top = `${above >= 8 ? above : r.bottom + 8}px`;
  }
}
