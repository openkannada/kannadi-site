// The editor's words for this page, and helpers to fill them in.
import { fmt, type Lang, pageLang, plural, type Plural } from "../i18n/core.ts";
import { EDITOR_EN, type EditorStrings } from "../i18n/editor.en.ts";

export { fmt };
export type { EditorStrings };

/** The dictionary Editor.astro wrote into the page, or English where there is none, as in Node tests. */
export function pageStrings(doc: Document | undefined = globalThis.document): EditorStrings {
  const json = doc?.querySelector<HTMLElement>(".editor[data-ui-strings]")?.dataset.uiStrings;
  if (!json) return EDITOR_EN;
  try {
    return JSON.parse(json) as EditorStrings;
  } catch {
    return EDITOR_EN;
  }
}

export const S: EditorStrings = pageStrings();

/** A number as the editor shows it, in Indian grouping: 1,20,000. */
export const num = (n: number) => n.toLocaleString("en-IN");

/** The form of `forms` for count `n`, with its {n} slot still open. */
export function pick(n: number, forms: Plural, lang: Lang = pageLang()): string {
  return plural(n, { one: "one", other: "other" }, lang) === "one" ? (forms.one ?? forms.other) : forms.other;
}

/** The form of `forms` for count `n`, with {n} and any other slots filled in. */
export function count(n: number, forms: Plural, values: Record<string, string | number> = {}): string {
  return fmt(pick(n, forms), { ...values, n: num(n) });
}

export type Part = { text: string } | { slot: string };

/** A template as text and the names of its {slots}, in order, for slots that become elements. */
export function parts(template: string): Part[] {
  return template
    .split(/\{(\w+)\}/)
    .map((piece, i): Part => (i % 2 ? { slot: piece } : { text: piece }))
    .filter((p) => !("text" in p) || p.text !== "");
}

/** A template as nodes to append, with string slots filled in as text and node slots placed as they are. */
export function nodes(template: string, values: Record<string, string | Node>): (string | Node)[] {
  const out: (string | Node)[] = [];
  for (const p of parts(template)) {
    const value = "text" in p ? p.text : Object.hasOwn(values, p.slot) ? values[p.slot]! : `{${p.slot}}`;
    const last = out.length - 1;
    if (typeof value === "string" && typeof out[last] === "string") out[last] += value;
    else out.push(value);
  }
  return out;
}
