// Find and replace for Kannada: a query matches every way Unicode can spell the same text, as ೊ is also ೆ with ೂ,
// and can keep to whole aksharas, so ಕ does not match inside ಕಾ or ಕ್ಕ.
import { SearchQuery } from "prosemirror-search";

export interface FindOptions {
  /** Matches only whole aksharas: none inside a conjunct, and none with a sign after it. */
  aksharas: boolean;
  /** Latin letters match only in the same case; Kannada has none. */
  caseSensitive: boolean;
}

/** Signs that join the letter before them into its akshara. */
const SIGNS = "\\u0C81-\\u0C83\\u0CBC\\u0CBE-\\u0CCD\\u0CD5\\u0CD6\\u0CF3\\u200C\\u200D";
const VIRAMA = "\\u0CCD";
const CONSONANTS = "\\u0C95-\\u0CB9\\u0CDD\\u0CDE";

const escape = (s: string) => s.replace(/[\\^$.*+?()[\]{}|/-]/g, "\\$&");

/** Every sequence that NFC turns into `char`: itself, and each way of composing its decomposition. */
function forms(char: string): string[] {
  const decomposed = [...char.normalize("NFD")];
  const out = new Set<string>();
  const walk = (rest: string[], done: string) => {
    if (!rest.length) return void out.add(done);
    for (let n = 1; n <= rest.length; n++) {
      const head = rest.slice(0, n).join("").normalize("NFC");
      if ([...head].length === 1) walk(rest.slice(n), done + head);
    }
  };
  walk(decomposed, "");
  out.add(char);
  return [...out].sort((a, b) => b.length - a.length);
}

/** A regular expression source for `text` that matches every canonically equivalent spelling of it. */
export function equivalentPattern(text: string, options: Pick<FindOptions, "aksharas">): string {
  const chars = [...text.normalize("NFC")];
  const body = chars
    .map((c) => {
      const all = forms(c);
      return all.length > 1 ? `(?:${all.map(escape).join("|")})` : escape(c);
    })
    .join("");
  if (!options.aksharas || !chars.length) return body;
  const last = chars.at(-1)!;
  // Not after a virama, which would put the first letter inside a conjunct; not before a sign that joins it, nor,
  // after a final virama, before the consonant it would join.
  const after = last === "್" ? `(?![${SIGNS}${CONSONANTS}])` : `(?![${SIGNS}])`;
  return `(?<!${VIRAMA})${body}${after}`;
}

/** The search query for the find bar. */
export function findQuery(text: string, replace: string, options: FindOptions): SearchQuery {
  return new SearchQuery({
    search: equivalentPattern(text, options),
    regexp: true,
    caseSensitive: options.caseSensitive,
    // A regular expression query reads $ in the replacement as a group; the text replaces as typed.
    replace: replace.normalize("NFC").replace(/\$/g, "$$$$"),
  });
}
