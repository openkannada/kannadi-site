// Text pasted on the home page, carried to the editor in sessionStorage so it never appears in a URL.

export const HANDOFF_KEY = "openkannada.handoff.v1";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** What the home page hands over: the plain text, and the clipboard's HTML when it was pasted, for its fonts. */
export interface Handoff {
  text: string;
  html: string;
}

/** The session store, or null where the browser blocks it. */
export function sessionStore(): Store | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Keeps text for the editor; false when there is nothing to keep or the store refuses it. */
export function giveText(store: Store | null, text: string, html = ""): boolean {
  if (!store || !text.trim()) return false;
  try {
    store.setItem(HANDOFF_KEY, JSON.stringify({ text, html } satisfies Handoff));
    return true;
  } catch {
    return false;
  }
}

/** The clipboard's HTML when the field still holds what was pasted; Windows clipboards end lines with CRLF. */
export function htmlFor(field: string, pasted: { html: string; plain: string }): string {
  const lines = (t: string) => t.replace(/\r\n?/g, "\n").trim();
  return pasted.html && lines(field) === lines(pasted.plain) ? pasted.html : "";
}

/** Keeps text for the editor with its HTML, or, when the HTML does not fit the store, the text alone. */
export function handOver(store: Store | null, text: string, html: string): boolean {
  return (html !== "" && giveText(store, text, html)) || giveText(store, text);
}

/** The text kept for the editor, left in place until doneWith, so a reload before it is pasted keeps it. */
export function takeText(store: Store | null): Handoff | null {
  if (!store) return null;
  try {
    const raw = store.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Handoff>;
    if (typeof value.text !== "string" || !value.text.trim()) return null;
    return { text: value.text, html: typeof value.html === "string" ? value.html : "" };
  } catch {
    return null;
  }
}

/** Removes the kept text once it is in the editor, so a reload does not insert it again. */
export function doneWith(store: Store | null): void {
  try {
    store?.removeItem(HANDOFF_KEY);
  } catch {
    // A store that cannot remove also could not have kept anything.
  }
}
