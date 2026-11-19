// Kannada words for loosely typed English letters ("namaskara" gives ನಮಸ್ಕಾರ):
// words that sound alike share a phonetic key, and commoner words rank first.

export interface SuggestKannadi {
  phoneticKey: (word: string) => string;
  latinKey: (latin: string) => string;
  strict: (latin: string) => string;
}

export const SHOWN = 5;
/** A longer word counts as half as common for every this many extra letters in its key. */
const LENGTH_HALVES = 3;
const CONSONANT_END = /[bcdfghjklmnpqrstvwxyz]$/;
/** Up to this many key letters, a word that sounds the same leads only when at most RARER times rarer than the best longer word. */
const PREFIX = 2;
const RARER = 16;

interface Scored {
  word: string;
  score: number;
}
const CHUNK = 2000;
const REMEMBERED = 500;

export class Suggester {
  private readonly k: SuggestKannadi;
  /** Words in order of frequency; a word's index is its rank. */
  private readonly words: string[];
  private readonly rank = new Map<string, number>();
  /** Word indexes sorted by key, and their keys, for exact and prefix lookups. */
  private readonly order: number[];
  private readonly keys: string[];
  private readonly picks: Map<string, string>;

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

  /**
   * Words whose key is `key`, by rank, and the best of the words whose key starts with it. Each has a score: its rank,
   * doubled for every few letters its key has beyond `key`, so a long form does not crowd out a short common word.
   */
  private lookup(key: string): { exact: Scored[]; longer: Scored[] } {
    const exact: Scored[] = [];
    // Kept sorted by score while scanning: a 1-letter key can match thousands.
    const longer: Scored[] = [];
    for (let i = this.lowerBound(key); i < this.keys.length && this.keys[i]!.startsWith(key); i++) {
      const id = this.order[i]!;
      const extra = this.keys[i]!.length - key.length;
      const scored = { word: this.words[id]!, score: (id + 1) * 2 ** (extra / LENGTH_HALVES) };
      const list = extra ? longer : exact;
      if (list.length < SHOWN || scored.score < list[SHOWN - 1]!.score) {
        const at = list.findIndex((l) => l.score > scored.score);
        list.splice(at < 0 ? list.length : at, 0, scored);
        list.length = Math.min(list.length, SHOWN);
      }
    }
    return { exact, longer };
  }

  /**
   * Kannada words for `latin`, best first: a word chosen before for the same letters; words that sound the same,
   * unless 1 or 2 letters were typed and they are far rarer than the best longer word, with the strict Baraha spelling by its rank, or after them when it
   * is not a known word; then the other words by score, with the spelling with a final a 2 words in when no known
   * word sounds the same.
   */
  suggest(latin: string): string[] {
    const typed = latin.toLowerCase();
    if (!typed) return [];
    const key = this.k.latinKey(latin);
    const { exact, longer } = key ? this.lookup(key) : { exact: [], longer: [] };
    // 1 or 2 letters are the start of a word, where a rare letter that sounds the same should not lead.
    const limit = key.length > PREFIX ? Infinity : RARER * (longer[0]?.score ?? Infinity);
    const lead = exact.filter((e) => e.score <= limit).map((e) => e.word);
    const rest = [...exact.filter((e) => e.score > limit), ...longer].sort((a, b) => a.score - b.score).map((e) => e.word);
    const strict = this.k.strict(latin);
    const known = this.rank.has(strict);
    // "til" is often ತಿಲ, not ತಿಲ್: a word typed without its final a.
    const withA = !known && !exact.length && typed.length >= 3 && CONSONANT_END.test(typed) ? [this.k.strict(`${latin}a`)] : [];
    const ranked = [
      ...(this.picks.has(typed) ? [this.picks.get(typed)!] : []),
      ...(known ? mergeByRank(lead, strict, this.rank) : [...lead, strict]),
      ...rest.slice(0, 2),
      ...withA,
      ...rest.slice(2),
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
