// The Kannada readiness scorecard: each quarter's results, copied from openkannada/kannada-readiness by
// scripts/scorecard-sync.ts, and the page's own editorial copy. Strings here are trusted HTML.
import results from "../../data/scorecard/2026-Q4.json" with { type: "json" };
import source from "../../data/scorecard/source.json" with { type: "json" };

export interface Band {
  low: number;
  label: string;
  light: string;
  dark: string;
}

export interface Source {
  label: string;
  url: string;
  ref: string;
}

export interface Task {
  order: number;
  id: string;
  title: string;
  question: string;
  score: number;
  band: string;
  basis: "measured" | "documented";
  kannada: { text: string };
  english: { text: string };
  line: string;
  method: string;
  notes?: string[];
  with_open_kannada?: string;
  sources: Source[];
}

export interface Results {
  edition: number;
  quarter: string;
  generated_at: string;
  scale: string;
  bands: Band[];
  index: { score: number; band: string; tasks: number; method: string };
  tasks: Task[];
}

export const SCORECARD = results as unknown as Results;
export const SCORECARD_SOURCE = source;

/** The tasks in their fixed order, so editions compare row by row. */
export const TASKS = [...SCORECARD.tasks].sort((a, b) => a.order - b.order);

/** The band a score falls in, counted from 1 for the lowest. */
export function bandOf(score: number, bands: Band[] = SCORECARD.bands): { band: Band; step: number } {
  let step = 0;
  bands.forEach((b, i) => {
    if (score >= b.low) step = i;
  });
  return { band: bands[step]!, step: step + 1 };
}

/**
 * A task's sources with repeats dropped. A source with no web address, such as a file in the results
 * repository, keeps its label and date without a link.
 */
export function sourcesOf(task: Task): Source[] {
  const seen = new Set<string>();
  return task.sources
    .map((s) => (/^https:\/\//.test(s.url) ? s : { ...s, url: "" }))
    .filter((s) => {
      const key = `${s.label}|${s.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** A source's check date as it is, or a commit hash cut to its first 7 characters. */
export function shortRef(ref: string): string {
  return /^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref;
}

/** The results as published beside the page: the fields the page shows, and nothing from the working notes. */
export function publicResults(r: Results = SCORECARD) {
  const { edition, quarter, generated_at, scale, bands, index } = r;
  const tasks = [...r.tasks]
    .sort((a, b) => a.order - b.order)
    .map((t) => ({
      order: t.order,
      id: t.id,
      title: t.title,
      question: t.question,
      score: t.score,
      band: t.band,
      basis: t.basis,
      kannada: { text: t.kannada.text },
      english: { text: t.english.text },
      line: t.line,
      method: t.method,
      notes: t.notes ?? [],
      ...(t.with_open_kannada ? { with_open_kannada: t.with_open_kannada } : {}),
      sources: sourcesOf(t).map((s) => ({ ...s, ref: shortRef(s.ref) })),
    }));
  return { scorecard: "Kannada readiness scorecard", edition, quarter, generated_at, scale, bands, index, tasks };
}

/** The 3 lowest-scoring tasks, lowest first, for What we build next. */
export function lowest(tasks: Task[] = TASKS, n = 3): Task[] {
  return [...tasks].sort((a, b) => a.score - b.score || a.order - b.order).slice(0, n);
}

/** "2026-Q4" as "November 2026", from when the results were generated. */
export function monthOf(iso: string = SCORECARD.generated_at): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** What Open Kannada is doing about each task, for the cards under the table; keyed by task id. */
export const NEXT: Record<string, { text: string; href: string; link: string }> = {
  "legacy-files": {
    text: "The kannadi editor and its converters turn Nudi and Baraha text into Unicode in the browser. Next is getting a converter into the tools people already use.",
    href: "/nudi-to-unicode/",
    link: "Convert a Nudi file",
  },
  "spell-check": {
    text: "Our Kannada Hunspell dictionary flags far fewer correct words than the one most systems ship. Next is sending it to LibreOffice and Firefox.",
    href: "/spell-check/",
    link: "See the spell check",
  },
  "gov-pdf-search": {
    text: "kannadi converts the legacy font codes in these PDFs once the text is copied out. Next is a fix where the PDFs are made.",
    href: "/nudi-to-unicode/",
    link: "Convert the text",
  },
  "ocr-old-book": {
    text: "Our fine-tuned Tesseract model reads old Kannada print with fewer errors than the stock model.",
    href: "/ocr/",
    link: "See the OCR model",
  },
  "ocr-print": {
    text: "Our fine-tuned Tesseract model reads Kannada print with fewer errors than the stock model.",
    href: "/ocr/",
    link: "See the OCR model",
  },
  dictation: {
    text: "Dictation needs open Kannada speech data first; Common Voice still needs sentences and readers.",
    href: "/contribute/",
    link: "Help with the data",
  },
};

export const SCORECARD_COPY = {
  answer: "In {month}, {tasks} everyday computer tasks scored <b>{score} out of 100</b> in Kannada, where 100 means as easy as in English.",
  edition: "Edition {edition}, {quarter}",
  caption: "The {tasks} tasks, with each score from 0 to 100 and what was compared in Kannada and in English",
  head: { task: "Task", score: "Score", kannada: "Kannada", english: "English" },
  basis: {
    measured: "measured",
    documented: "documented",
    legend: "<b>Measured</b> scores are rerun from code on the same text in both languages. <b>Documented</b> scores come from each vendor's own pages, rechecked every quarter.",
  },
  open: "Details",
  details: { question: "Question", method: "How it is scored", notes: "Notes", withOk: "With Open Kannada's work", sources: "Sources" },
  scale: "Score scale",
  next: { heading: "What we build next", intro: "The 3 lowest scores, and what we are doing about them." },
  measure: {
    heading: "How we measure",
    items: [
      "Every score compares Kannada with English on the same text, pages or tools.",
      "Measured tasks are rerun from code; documented ones cite each vendor's own page, rechecked each quarter.",
      "The index is the mean of the task scores, and every number has its source and check date under its row.",
    ],
    data: "Download the results as JSON",
    report: 'Found a wrong claim? Write to <a href="mailto:support@luminik.io">support@luminik.io</a> with the task and the source.',
  },
  editions: { heading: "Editions", row: "Edition {edition}, {quarter}, published {date}" },
};
