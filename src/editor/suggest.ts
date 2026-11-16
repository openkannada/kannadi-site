// Kannada words for loosely typed English letters ("namaskara" gives ನಮಸ್ಕಾರ):
// words that sound alike share a phonetic key, and commoner words rank first.

export interface SuggestKannadi {
  phoneticKey: (word: string) => string;
  latinKey: (latin: string) => string;
  strict: (latin: string) => string;
}

/** How many words the strip shows. */
export const SHOWN = 5;
/** Words keyed between pauses while building. */
const CHUNK = 2000;
/** How many remembered choices are kept. */
const REMEMBERED = 500;

export class Suggester {
  private readonly k: SuggestKannadi;
  /** Words in order of frequency; a word's index is its rank. */
  private readonly words: string[];
  private readonly rank = new Map<string, number>();
  /** Word indexes sorted by key, and their keys, for exact and prefix lookups. */
  private order: number[] = [];
  private keys: string[] = [];
  private picks: Map<string, string>;

  /** `wordKeys[i]` is the phonetic key of `words[i]`; see {@link Suggester.create}. */
  constructor(k: SuggestKannadi, words: string[], wordKeys: string[], picks: [string, string][] = []) {
    this.k = k;
    this.words = words;
    words.forEach((w, i) => this.rank.set(w, i));
    this.picks = new Map(picks);
    const keyed = wordKeys.map((key, i) => [key, i] as const);
    keyed.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
    this.keys = keyed.map(([key]) => key);
    this.order = keyed.map(([, i]) => i);
  }

  /** Builds a suggester, computing the word keys in chunks so a phone stays responsive. */
  static async create(
    k: SuggestKannadi,
    words: string[],
    picks: [string, string][] = [],
    pause: () => Promise<void> = () => new Promise((r) => setTimeout(r, 0)),
  ): Promise<Suggester> {
    const keys: string[] = [];
    for (let i = 0; i < words.length; i += CHUNK) {
      for (const w of words.slice(i, i + CHUNK)) keys.push(k.phoneticKey(w));
      await pause();
    }
    return new Suggester(k, words, keys, picks);
  }

  /** Index of the first key at or after `key`. */
  private lowerBound(key: string): number {
    let lo = 0;
    let hi = this.keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.keys[mid]! < key) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Words whose key equals `key`, and words whose key starts with it, each by rank. */
  private lookup(key: string): { exact: string[]; longer: string[] } {
    const exact: number[] = [];
    const longer: number[] = [];
    for (let i = this.lowerBound(key); i < this.keys.length && this.keys[i]!.startsWith(key); i++) {
      (this.keys[i] === key ? exact : longer).push(this.order[i]!);
    }
    const byRank = (ids: number[]) => ids.sort((a, b) => a - b).map((i) => this.words[i]!);
    return { exact: byRank(exact), longer: byRank(longer).slice(0, SHOWN) };
  }

  /**
   * Kannada words for `latin`, best first: a word chosen before for the same
   * letters, words that sound the same, the strict Baraha spelling, then longer
   * words that start the same way.
   */
  suggest(latin: string): string[] {
    const typed = latin.toLowerCase();
    if (!typed) return [];
    const key = this.k.latinKey(latin);
    const { exact, longer } = key ? this.lookup(key) : { exact: [], longer: [] };
    const strict = this.k.strict(latin);
    const known = this.rank.has(strict);
    const ranked = [
      ...(this.picks.has(typed) ? [this.picks.get(typed)!] : []),
      ...(known ? mergeByRank(exact, strict, this.rank) : [...exact, strict]),
      ...longer,
    ];
    return [...new Set(ranked)].slice(0, SHOWN);
  }

  /** Remembers that `word` was chosen for `latin`, so it comes first next time. */
  remember(latin: string, word: string): void {
    const typed = latin.toLowerCase();
    this.picks.delete(typed);
    this.picks.set(typed, word);
    while (this.picks.size > REMEMBERED) this.picks.delete(this.picks.keys().next().value!);
  }

  /** The remembered choices, oldest first, for storing. */
  remembered(): [string, string][] {
    return [...this.picks];
  }
}

/** `list` with `word` placed by its rank, when it is not in the list already. */
function mergeByRank(list: string[], word: string, rank: Map<string, number>): string[] {
  if (list.includes(word)) return list;
  const r = rank.get(word)!;
  const at = list.findIndex((w) => (rank.get(w) ?? Infinity) > r);
  return at < 0 ? [...list, word] : [...list.slice(0, at), word, ...list.slice(at)];
}

/** The words of data/words.tsv, in order of frequency. */
export function parseWords(tsv: string): string[] {
  const out: string[] = [];
  for (const line of tsv.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const tab = line.indexOf("\t");
    out.push(tab < 0 ? line : line.slice(0, tab));
  }
  return out;
}
