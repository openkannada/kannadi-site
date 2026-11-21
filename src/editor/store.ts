// Where the document is kept on this device. Today's editor keeps 1 document in localStorage. With ?editor=next,
// IndexedDB keeps each document, so a long one fits, and keeps the last few as recent documents; the settings stay
// in localStorage, and a document from localStorage moves over the first time.

export interface Settings {
  mode: string;
  font: string;
  autoConvert: boolean;
  zero: boolean;
  digits: boolean;
  lastFormat?: string;
}

export interface Saved {
  text: string;
  unknown?: number[];
  kept?: number[];
  settings?: Partial<Settings>;
  fileName?: string;
}

export interface Recent {
  id: string;
  /** The first line of the text, for the list. */
  title: string;
  updated: number;
}

export interface DocumentStore {
  read(): Promise<Saved | null>;
  /** Saves the current document; false when it does not fit. */
  write(value: Saved): Promise<boolean>;
  /** Saves at once, as the page closes, where a write that has to wait may not finish. */
  flush(value: Saved): void;
  /** The recent documents other than the current one, newest first, or null where the store keeps only 1. */
  recent(): Promise<Recent[] | null>;
  /** Starts a new current document, keeping the last one among the recent documents. */
  create(): Promise<void>;
  /** Makes a recent document current and returns it. */
  open(id: string): Promise<Saved | null>;
}

export const LOCAL_KEY = "kannadi.editor.v1";
const SETTINGS_KEY = "kannadi.settings.v1";
const CURRENT_KEY = "kannadi.current.v1";
/** The current document, written at once as the page closes, until IndexedDB has it. */
const PENDING_KEY = "kannadi.pending.v1";
const DB = "kannadi";
const DOCS = "documents";
/** How many recent documents are kept; older ones are deleted. */
export const KEEP = 10;

const local = {
  get<T>(key: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};

/** 1 document with its settings in localStorage, as today's editor keeps it. */
export class LocalStore implements DocumentStore {
  async read(): Promise<Saved | null> {
    return local.get<Saved>(LOCAL_KEY);
  }
  async write(value: Saved): Promise<boolean> {
    return local.set(LOCAL_KEY, value);
  }
  flush(value: Saved): void {
    local.set(LOCAL_KEY, value);
  }
  async recent(): Promise<null> {
    return null;
  }
  async create(): Promise<void> {}
  async open(): Promise<null> {
    return null;
  }
}

interface Row extends Omit<Saved, "settings">, Recent {}

const title = (text: string) => text.trimStart().split("\n", 1)[0]!.slice(0, 60);

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** Each document in IndexedDB, the last KEEP of them kept; the settings in localStorage. */
export class IdbStore implements DocumentStore {
  private db: Promise<IDBDatabase>;
  private id: string;

  constructor(name = DB) {
    this.id = local.get<string>(CURRENT_KEY) ?? crypto.randomUUID();
    this.db = new Promise((resolve, reject) => {
      const open = indexedDB.open(name, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(DOCS, { keyPath: "id" }).createIndex("updated", "updated");
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
  }

  private async docs(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await this.db).transaction(DOCS, mode).objectStore(DOCS);
  }

  async read(): Promise<Saved | null> {
    const settings = local.get<Partial<Settings>>(SETTINGS_KEY) ?? undefined;
    const row = (await request((await this.docs("readonly")).get(this.id))) as Row | undefined;
    // Text written as the page closed is newer than IndexedDB's copy.
    const pending = local.get<{ id: string; at: number; value: Saved }>(PENDING_KEY);
    if (pending?.id === this.id && (!row || pending.at > row.updated)) {
      await this.write(pending.value);
      return { ...pending.value, ...(settings ? { settings } : {}) };
    }
    if (row) return { ...row, ...(settings ? { settings } : {}) };
    // The first time, the document today's editor kept moves over.
    const old = local.get<Saved>(LOCAL_KEY);
    if (!old) return settings ? { text: "", settings } : null;
    await this.write(old);
    return { ...old, settings: { ...old.settings, ...settings } };
  }

  async write(value: Saved): Promise<boolean> {
    const { settings, ...doc } = value;
    if (settings) local.set(SETTINGS_KEY, settings);
    local.set(CURRENT_KEY, this.id);
    const row: Row = { ...doc, id: this.id, title: title(doc.text), updated: Date.now() };
    try {
      const store = await this.docs("readwrite");
      await request(store.put(row));
      await this.prune(store);
      if (local.get<{ id: string; at: number }>(PENDING_KEY)?.id === this.id) localStorage.removeItem(PENDING_KEY);
      return true;
    } catch {
      return false;
    }
  }

  /** Deletes documents beyond the newest KEEP, and empty ones other than the current one. */
  private async prune(store: IDBObjectStore): Promise<void> {
    const rows = (await request(store.index("updated").getAll())) as Row[];
    rows.reverse();
    const keep = new Set(rows.filter((r) => r.text || r.id === this.id).slice(0, KEEP).map((r) => r.id));
    for (const r of rows) if (!keep.has(r.id)) store.delete(r.id);
  }

  flush(value: Saved): void {
    const { settings, ...doc } = value;
    if (settings) local.set(SETTINGS_KEY, settings);
    // A document too long for localStorage relies on the last write, at most half a second old.
    local.set(PENDING_KEY, { id: this.id, at: Date.now(), value: doc });
  }

  async recent(): Promise<Recent[]> {
    const rows = (await request((await this.docs("readonly")).index("updated").getAll())) as Row[];
    return rows
      .filter((r) => r.text && r.id !== this.id)
      .reverse()
      .map(({ id, title, updated }) => ({ id, title, updated }));
  }

  async create(): Promise<void> {
    this.id = crypto.randomUUID();
    local.set(CURRENT_KEY, this.id);
  }

  async open(id: string): Promise<Saved | null> {
    const row = (await request((await this.docs("readonly")).get(id))) as Row | undefined;
    if (!row) return null;
    this.id = id;
    local.set(CURRENT_KEY, id);
    return row;
  }
}
