// The suggestion strip: Kannada words for the word being typed in English
// letters, shown above the word on desktop and above the toolbar on phones.
import type { ComposingWord } from "./compose.ts";

export interface StripPlace {
  /** Screen box of the word's text. */
  rect: (start: number, end: number) => DOMRect;
  /** The screen area the strip must stay out of on desktop: the toolbar, and the band behind it. */
  avoid: () => { top: number; bottom: number };
}

export class SuggestStrip {
  private readonly el: HTMLElement;
  private readonly at: StripPlace;
  private readonly pick: (index: number) => void;
  private buttons: HTMLButtonElement[] = [];
  private word: ComposingWord | null = null;

  constructor(el: HTMLElement, at: StripPlace, pick: (index: number) => void) {
    this.el = el;
    this.at = at;
    this.pick = pick;
    // Keep the caret in the document while a word is tapped.
    el.addEventListener("pointerdown", (e) => e.preventDefault());
    // The strip is fixed on screen, so it follows its word when the page scrolls.
    addEventListener("scroll", () => this.word && this.place(this.word), { passive: true });
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
    this.word = word;
    this.place(word);
  }

  select(index: number): void {
    this.buttons.forEach((b, i) => (i === index ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current")));
  }

  hide(): void {
    this.el.hidden = true;
    this.el.replaceChildren();
    this.buttons = [];
    this.word = null;
  }

  private place(word: ComposingWord): void {
    if (matchMedia("(max-width: 47.99rem)").matches) {
      this.el.style.left = this.el.style.top = "";
      return;
    }
    const r = this.at.rect(word.start, word.end);
    const height = this.el.offsetHeight;
    const above = r.top - height - 8;
    // Above the word, unless that runs into the toolbar or off the top; then below it.
    const avoid = this.at.avoid();
    const clear = above >= 8 && (above >= avoid.bottom + 8 || above + height <= avoid.top - 8);
    this.el.style.left = `${Math.max(8, Math.min(r.left - 8, innerWidth - this.el.offsetWidth - 8))}px`;
    this.el.style.top = `${clear ? above : r.bottom + 8}px`;
  }
}
