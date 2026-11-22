// Text offsets and ProseMirror document positions: the text is the paragraphs joined by "\n", so an offset counts 1
// for each line break where a position counts 2 for a paragraph boundary. The index is built once per document.
import type { Node as PmNode } from "prosemirror-model";

interface Index {
  text: string;
  /** For each paragraph, the text offset and the document position where its text starts. */
  offsets: number[];
  positions: number[];
}

// Built once per document, since every edit makes a new one; the text is read several times per keystroke.
const indexes = new WeakMap<PmNode, Index>();

function indexOf(doc: PmNode): Index {
  let index = indexes.get(doc);
  if (index) return index;
  const offsets: number[] = [];
  const positions: number[] = [];
  const lines: string[] = [];
  let at = 0;
  doc.forEach((p, pos) => {
    offsets.push(at);
    positions.push(pos + 1);
    lines.push(p.textContent);
    at += p.content.size + 1;
  });
  index = { text: lines.join("\n"), offsets, positions };
  indexes.set(doc, index);
  return index;
}

/** The text of a document, its paragraphs joined by "\n". */
export function textOf(doc: PmNode): string {
  return indexOf(doc).text;
}

/** The last index in a sorted list whose value is at most `value`. */
function floor(list: number[], value: number): number {
  let lo = 0;
  let hi = list.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (list[mid]! <= value) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Document position of text offset `at`. */
export function posOf(doc: PmNode, at: number): number {
  const { offsets, positions } = indexOf(doc);
  const i = floor(offsets, Math.max(0, at));
  return positions[i]! + Math.min(Math.max(0, at) - offsets[i]!, doc.child(i).content.size);
}

/** Text offset of document position `pos`. */
export function offsetOfPos(doc: PmNode, pos: number): number {
  const { offsets, positions } = indexOf(doc);
  // A position just before a paragraph's opening belongs to that paragraph's start, not the previous one's end.
  const i = floor(positions, pos + 1);
  return offsets[i]! + Math.max(0, Math.min(pos - positions[i]!, doc.child(i).content.size));
}

