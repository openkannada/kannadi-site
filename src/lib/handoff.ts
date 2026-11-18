// Text pasted on the home page, carried to the editor in sessionStorage so it never appears in a URL.

export const HANDOFF_KEY = "openkannada.handoff.v1";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The session store, or null where the browser blocks it. */
export function sessionStore(): Store | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Keeps text for the editor; false when there is nothing to keep or the store refuses it. */
export function giveText(store: Store | null, text: string): boolean {
  if (!store || !text.trim()) return false;
  try {
    store.setItem(HANDOFF_KEY, text);
    return true;
  } catch {
    return false;
  }
}

/** The text kept for the editor, removed so a reload does not insert it again; null when there is none. */
export function takeText(store: Store | null): string | null {
  if (!store) return null;
  try {
    const text = store.getItem(HANDOFF_KEY);
    store.removeItem(HANDOFF_KEY);
    return text?.trim() ? text : null;
  } catch {
    return null;
  }
}
