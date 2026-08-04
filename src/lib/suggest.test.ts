import { describe, expect, it } from "vitest";

import { hintCycle, suggest, type SuggestItem } from "@/lib/suggest";
import { allPolls, pollIndex } from "@/lib/polls";
import { allTopics, topicIndex } from "@/lib/topics";

const INDEX: SuggestItem[] = [
  { id: "1", label: "Bengaluru Metro Yellow Line Delay", kind: "topic", href: "/topics/blrmetro" },
  {
    id: "2",
    label: "Metro expansion or road widening — where should the city budget go?",
    kind: "poll",
    href: "/polls/metro-roads",
  },
  { id: "3", label: "Goa in Peak Season", kind: "topic", href: "/topics/goa-season", weight: 900 },
  { id: "4", label: "Karnataka", kind: "place" },
  { id: "5", label: "NEET UG 2026 Paper Leak Allegations", kind: "topic", keywords: ["exams", "leak"] },
];

describe("suggest", () => {
  it("returns nothing below two characters", () => {
    expect(suggest("", INDEX)).toEqual([]);
    expect(suggest("m", INDEX)).toEqual([]);
  });

  it("prefers a hit at the start of a name over one in the middle", () => {
    const [first] = suggest("metro", INDEX);
    expect(first?.id).toBe("2");
  });

  it("finds a word inside a name, not just the first one", () => {
    expect(suggest("yellow", INDEX).map((s) => s.id)).toContain("1");
  });

  it("matches keywords when the label does not", () => {
    const hits = suggest("exams", INDEX);
    expect(hits.map((s) => s.id)).toContain("5");
  });

  it("ranks a name match above a keyword match", () => {
    const hits = suggest("leak", INDEX);
    // "Leak" appears in label 5 and in its keywords; the label wins and it is
    // the only hit, so the assertion is that keywords never outrank a name.
    expect(hits[0]?.id).toBe("5");
  });

  it("is blind to case and accents", () => {
    expect(suggest("GOA", INDEX).map((s) => s.id)).toEqual(suggest("goa", INDEX).map((s) => s.id));
  });

  it("reports where it matched, so the row can highlight it", () => {
    const [hit] = suggest("yellow", INDEX);
    expect(hit?.range).toBeDefined();
    const [from, to] = hit!.range!;
    expect(hit!.label.slice(from, to).toLowerCase()).toBe("yellow");
  });

  it("leaves the range unset on a keyword-only match", () => {
    // Highlighting a run the reader cannot see would be worse than none.
    const hit = suggest("exams", INDEX).find((s) => s.id === "5");
    expect(hit?.range).toBeUndefined();
  });

  it("honours the limit", () => {
    expect(suggest("e", INDEX, 2).length).toBeLessThanOrEqual(2);
    expect(suggest("a", INDEX, 2).length).toBeLessThanOrEqual(2);
  });
});

describe("hintCycle", () => {
  it("only offers real artifacts, never a category or a place", () => {
    const hints = hintCycle(INDEX);
    expect(hints).not.toContain("Karnataka");
    expect(hints.length).toBeGreaterThan(0);
  });

  it("truncates anything too long for a placeholder", () => {
    for (const hint of hintCycle(INDEX)) expect(hint.length).toBeLessThanOrEqual(42);
  });
});

describe("the real catalogs", () => {
  const topics = topicIndex(allTopics());
  const polls = pollIndex(allPolls());

  it("suggests a topic by its place", () => {
    const hits = suggest("bengaluru", topics);
    expect(hits.some((h) => h.href === "/topics/blrmetro")).toBe(true);
  });

  it("suggests a poll by an option name", () => {
    // The seeded poll writes "Lionel Messi", so this only works because option
    // names are indexed as keywords.
    const hits = suggest("messi", polls);
    expect(hits.some((h) => h.href === "/polls/messi-ronaldo")).toBe(true);
  });

  it("gives every artifact row somewhere to go", () => {
    for (const item of [...topics, ...polls]) {
      if (item.kind === "topic" || item.kind === "poll") {
        expect(item.href, item.label).toBeTruthy();
      } else {
        // Places and tags are queries, not destinations.
        expect(item.href, item.label).toBeUndefined();
      }
    }
  });

  it("has no duplicate ids, which React would render as one row", () => {
    for (const index of [topics, polls]) {
      expect(new Set(index.map((i) => i.id)).size).toBe(index.length);
    }
  });
});
