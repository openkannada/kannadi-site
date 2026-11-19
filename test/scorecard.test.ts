import assert from "node:assert/strict";
import { test } from "node:test";

import { ALL_PAGES, PAGES, isDraft, published } from "../src/content/pages.ts";
import { NEXT, SCORECARD, TASKS, bandOf, lowest, sourcesOf } from "../src/content/scorecard.ts";
import { unreviewed } from "../src/lib/deploy.ts";

test("a score falls in the band whose range holds it", () => {
  assert.deepEqual([0, 24, 25, 49, 50, 74, 75, 94, 95, 100].map((s) => bandOf(s).step), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(bandOf(SCORECARD.index.score).band.label, SCORECARD.index.band);
  for (const t of TASKS) assert.equal(bandOf(t.score).band.label, t.band, `${t.id} is in its band`);
});

test("the tasks keep the order the editions compare on, and the index is their mean", () => {
  assert.deepEqual(TASKS.map((t) => t.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(SCORECARD.index.tasks, TASKS.length);
  assert.equal(SCORECARD.index.score, Math.round(TASKS.reduce((n, t) => n + t.score, 0) / TASKS.length));
  for (const t of TASKS) {
    for (const key of ["title", "question", "line", "method"] as const) assert.ok(t[key], `${t.id} has a ${key}`);
    assert.ok(t.score >= 0 && t.score <= 100, `${t.id} is scored 0 to 100`);
    assert.ok(["measured", "documented"].includes(t.basis), `${t.id} says how it was scored`);
  }
});

test("a source listed twice shows once, and one with no link keeps its label", () => {
  const task = { ...TASKS[0]!, sources: [{ label: "A", url: "https://a", ref: "1" }, { label: "A", url: "https://a", ref: "1" }, { label: "B", url: "", ref: "2" }, { label: "C", url: "data/c.jsonl", ref: "3" }] };
  assert.deepEqual(sourcesOf(task).map((s) => [s.label, s.url]), [["A", "https://a"], ["B", ""], ["C", ""]], "a path inside the private repository is not linked");
});

test("What we build next has words for each of the 3 lowest tasks", () => {
  const low = lowest();
  assert.equal(low.length, 3);
  assert.ok(low.every((t, i) => i === 0 || low[i - 1]!.score <= t.score), "lowest first");
  for (const t of low) assert.ok(NEXT[t.id] || t.with_open_kannada, `${t.id} has a card`);
});

test("the scorecard is held off the site until it is approved, and a build that includes it cannot deploy", () => {
  const page = ALL_PAGES.find((p) => p.slug === "scorecard")!;
  assert.equal(page.kind, "scorecard");
  assert.ok(isDraft(page));
  assert.ok(!PAGES.some((p) => p.slug === "scorecard"), "left out of the site's build");
  assert.ok(published(ALL_PAGES, true).some((p) => p.slug === "scorecard"), "kept in the drafts build CI checks");
  assert.deepEqual(unreviewed([{ slug: "scorecard", held: true }]), ["/scorecard/"]);
});
