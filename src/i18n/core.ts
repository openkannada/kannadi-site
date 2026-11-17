// Shared by every dictionary: the languages, and filling in {name} slots and plurals.

export type Lang = "en" | "kn";
export const LANGS: Lang[] = ["en", "kn"];

/** A word or phrase that changes with a count, in Intl.PluralRules categories; "other" is required. */
export interface Plural {
  one?: string;
  other: string;
}

/** The template with each {name} replaced by its value; unknown names are left as they are. */
export function fmt(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in values ? String(values[name]) : all));
}

/** The form of `forms` for count `n` in `lang`, with {n} filled in. */
export function plural(n: number, forms: Plural, lang: Lang): string {
  const rule = new Intl.PluralRules(lang === "kn" ? "kn-IN" : "en-IN").select(n);
  const form = (rule === "one" ? forms.one : undefined) ?? forms.other;
  return fmt(form, { n });
}

/** The language a page is in, from its lang attribute. */
export function pageLang(doc: Document | undefined = globalThis.document): Lang {
  return doc?.documentElement.lang.startsWith("kn") ? "kn" : "en";
}
