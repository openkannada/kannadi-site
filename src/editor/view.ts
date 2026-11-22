// Keeps the text clear of the toolbar. On desktop the toolbar sticks to the top of the window, and on phones it
// docks at the bottom; while text runs under it, a band in the sheet's color hides that text. The caret line stays
// in the clear part of the window, between the band and the suggestions, as the caret moves.
import type { EditorSurface } from "./editor.ts";

export interface ViewParts {
  dock: HTMLElement;
  toolbar: HTMLElement;
  sheet: HTMLElement;
  strip: HTMLElement;
}

/** Space kept between the caret line and the band or the suggestions. */
const MARGIN = 12;
const PHONE = "(max-width: 47.99rem)";

export class View {
  private readonly editor: EditorSurface;
  private readonly parts: ViewParts;
  private frame = 0;
  /** A pointer is down, as in a drag selection: scrolling now would move the page under it. */
  private pressed = false;
  private waiting = false;

  constructor(editor: EditorSurface, parts: ViewParts) {
    this.editor = editor;
    this.parts = parts;
    const band = () => this.band();
    addEventListener("scroll", band, { passive: true });
    addEventListener("resize", band);
    // Only a primary mouse button drags a selection; touch and pens move the caret their own way.
    addEventListener("pointerdown", (e) => (this.pressed = e.pointerType === "mouse" && e.button === 0), { capture: true, passive: true });
    const release = () => {
      this.pressed = false;
      if (this.waiting) this.keepCaret();
    };
    // A press can end with no pointerup, as when a context menu or a drag takes over, or the window loses focus.
    for (const type of ["pointerup", "pointercancel", "contextmenu", "dragstart", "keydown", "beforeinput", "blur"]) {
      addEventListener(type, release, { capture: true, passive: true });
    }
    band();
  }

  private get phone(): boolean {
    return matchMedia(PHONE).matches;
  }

  /** Shows the band while the sheet's text runs under the toolbar. */
  band(): void {
    const { dock, toolbar, sheet } = this.parts;
    const bar = toolbar.getBoundingClientRect();
    const page = sheet.getBoundingClientRect();
    // On desktop the toolbar rests on the sheet's top edge, over its padding; text reaches it once it sticks.
    const under = this.phone ? page.top < bar.top && page.bottom > bar.top : dock.getBoundingClientRect().top <= 0.5 && page.bottom > bar.top;
    dock.toggleAttribute("data-stuck", under);
  }

  /** The bottom of the band on desktop, which reaches below the dock's own box. */
  private bandBottom(): number {
    const { dock } = this.parts;
    return dock.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(dock, "::before").bottom) || 0);
  }

  /** The screen area the suggestions must stay out of on desktop: the toolbar, and the band when it shows. */
  avoid(): { top: number; bottom: number } {
    const bar = this.parts.toolbar.getBoundingClientRect();
    return this.parts.dock.hasAttribute("data-stuck") ? { top: 0, bottom: this.bandBottom() } : { top: bar.top, bottom: bar.bottom };
  }

  /** The part of the window where the caret line is in the clear. */
  private clear(): { top: number; bottom: number } {
    const { dock, strip } = this.parts;
    const stuck = dock.hasAttribute("data-stuck");
    if (this.phone) {
      let bottom = this.parts.toolbar.getBoundingClientRect().top;
      if (!strip.hidden) bottom = Math.min(bottom, strip.getBoundingClientRect().top);
      return { top: MARGIN, bottom: bottom - MARGIN };
    }
    return { top: stuck ? this.bandBottom() + MARGIN : MARGIN, bottom: innerHeight - MARGIN };
  }

  /** Scrolls the caret line into the clear part of the window, after the browser has laid out the latest change. */
  keepCaret(): void {
    this.waiting = this.pressed;
    if (this.pressed) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      if (document.activeElement !== this.editor.el) return;
      const sel = document.getSelection();
      if (!sel?.isCollapsed) return;
      // A scroll can change whether the band shows, and so the clear part; 1 more pass settles it.
      for (let pass = 0; pass < 2; pass++) {
        this.band();
        const caret = this.editor.caretRect();
        if (!caret) return;
        const zone = this.clear();
        if (caret.top < zone.top) scrollBy({ top: caret.top - zone.top, behavior: "instant" });
        else if (caret.bottom > zone.bottom) scrollBy({ top: caret.bottom - zone.bottom, behavior: "instant" });
        else break;
      }
      this.band();
    });
  }
}
