import { describe, expect, it } from "vitest";

import { decorate } from "@/lib/derive";
import { decoratePoll, POLL_COLORS } from "@/lib/derive-poll";
import { SENTIMENT_COLOR } from "@/lib/taxonomy";
import type { Poll, Topic } from "@/lib/types";

import { pollSubject, ringArcs, topicSubject } from "./subjects";

const baseTopic: Topic = {
  id: "metro-line",
  name: "Bengaluru Metro Yellow Line",
  cat: "policies",
  place: "india",
  status: "Ongoing",
  summary: "A test topic.",
  about: "",
  tags: ["metro"],
  pos: 30,
  neu: 20,
  neg: 50,
  participants: 1000,
  trend: 50,
  recency: 1,
  updated: "1h ago",
  createdAt: "2026-08-01T10:00:00Z",
  change: { metric: "participation", value: 1, direction: "up" },
};

const basePoll: Poll = {
  id: "a-or-b",
  question: "A or B?",
  cat: "sports",
  place: "worldwide",
  status: "Live",
  summary: "A test poll.",
  about: "",
  tags: [],
  options: [
    { id: "a", name: "Option A", blurb: "", votes: 600 },
    { id: "b", name: "Option B", blurb: "", votes: 400 },
  ],
  closes: "Open-ended",
  trend: 50,
  recency: 1,
  updated: "1h ago",
  createdAt: "2026-08-02T10:00:00Z",
};

describe("topicSubject", () => {
  it("carries the real distribution as segments that sum to 100", () => {
    const subject = topicSubject(decorate(baseTopic));
    expect(subject.segments.map((s) => s.pct)).toEqual([30, 20, 50]);
    expect(subject.segments.reduce((sum, s) => sum + s.pct, 0)).toBe(100);
  });

  it("states the result in the dashboard's own words", () => {
    expect(topicSubject(decorate(baseTopic)).leadLabel).toBe("50% Negative");
    expect(
      topicSubject(decorate({ ...baseTopic, pos: 45, neu: 10, neg: 45 })).leadLabel,
    ).toBe("Split 45/45");
  });

  it("tints toward the majority sentiment", () => {
    expect(topicSubject(decorate(baseTopic)).accent).toBe(SENTIMENT_COLOR.Negative);
    expect(
      topicSubject(decorate({ ...baseTopic, pos: 70, neu: 20, neg: 10 })).accent,
    ).toBe(SENTIMENT_COLOR.Positive);
  });

  it("keeps a neutral surface on an exact positive/negative tie", () => {
    const tied = topicSubject(decorate({ ...baseTopic, pos: 45, neu: 10, neg: 45 }));
    expect(tied.accent).toBeNull();
    expect(tied.segments).toHaveLength(3);
  });

  it("renders no segments, no tint and the right words with no votes", () => {
    const empty = topicSubject(
      decorate({ ...baseTopic, participants: 0, pos: 0, neu: 0, neg: 0 }),
    );
    expect(empty.unvoted).toBe(true);
    expect(empty.segments).toEqual([]);
    expect(empty.accent).toBeNull();
    expect(empty.leadLabel).toBe("No opinions yet");
    expect(empty.leadColor).toBe("var(--color-dim)");
    expect(empty.totalLabel).toBe("No opinions yet");
    expect(empty.aria).toContain("No votes recorded yet");
  });

  it("derives a stable creation key and links to the dashboard", () => {
    const subject = topicSubject(decorate(baseTopic));
    expect(subject.createdKey).toBe(Date.parse("2026-08-01T10:00:00Z"));
    expect(subject.href).toBe("/topics/metro-line");
    expect(topicSubject(decorate({ ...baseTopic, createdAt: undefined })).createdKey).toBe(0);
  });
});

describe("pollSubject", () => {
  it("uses the named options with their stable colours — never sentiment", () => {
    const subject = pollSubject(decoratePoll(basePoll));
    expect(subject.segments.map((s) => s.label)).toEqual(["Option A", "Option B"]);
    expect(subject.segments.map((s) => s.color)).toEqual([POLL_COLORS[0], POLL_COLORS[1]]);
    expect(subject.aria).not.toMatch(/positive|negative|neutral/i);
  });

  it("supports three and four options", () => {
    const four = pollSubject(
      decoratePoll({
        ...basePoll,
        options: [
          { id: "a", name: "A", blurb: "", votes: 400 },
          { id: "b", name: "B", blurb: "", votes: 300 },
          { id: "c", name: "C", blurb: "", votes: 200 },
          { id: "d", name: "D", blurb: "", votes: 100 },
        ],
      }),
    );
    expect(four.segments).toHaveLength(4);
    expect(four.segments.reduce((sum, s) => sum + s.pct, 0)).toBe(100);
  });

  it("tints toward the leader, but not on a tie and not with no votes", () => {
    expect(pollSubject(decoratePoll(basePoll)).accent).toBe(POLL_COLORS[0]);

    const tied = pollSubject(
      decoratePoll({
        ...basePoll,
        options: [
          { id: "a", name: "A", blurb: "", votes: 500 },
          { id: "b", name: "B", blurb: "", votes: 500 },
        ],
      }),
    );
    expect(tied.accent).toBeNull();

    const empty = pollSubject(
      decoratePoll({
        ...basePoll,
        options: [
          { id: "a", name: "A", blurb: "", votes: 0 },
          { id: "b", name: "B", blurb: "", votes: 0 },
        ],
      }),
    );
    expect(empty.accent).toBeNull();
    expect(empty.unvoted).toBe(true);
    expect(empty.segments).toEqual([]);
    expect(empty.leadLabel).toBe("No votes yet");
  });

  it("states the leader by name, and says so when there is no leader", () => {
    const led = pollSubject(decoratePoll(basePoll));
    expect(led.leadLabel).toBe("60% Option A");
    expect(led.leadLabel).not.toMatch(/positive|negative|neutral/i);

    const tied = pollSubject(
      decoratePoll({
        ...basePoll,
        options: [
          { id: "a", name: "A", blurb: "", votes: 500 },
          { id: "b", name: "B", blurb: "", votes: 500 },
        ],
      }),
    );
    expect(tied.leadLabel).toBe("Dead heat");
    expect(tied.leadColor).toBe("var(--color-dim)");
  });

  it("drops zero-vote options from the ring rather than drawing empty arcs", () => {
    const oneSided = pollSubject(
      decoratePoll({
        ...basePoll,
        options: [
          { id: "a", name: "A", blurb: "", votes: 10 },
          { id: "b", name: "B", blurb: "", votes: 0 },
        ],
      }),
    );
    expect(oneSided.segments).toHaveLength(1);
    expect(oneSided.segments[0]!.pct).toBe(100);
  });
});

describe("ringArcs", () => {
  const segment = (key: string, pct: number) => ({
    key,
    label: key,
    pct,
    color: "#fff",
    textColor: "#fff",
  });

  it("returns nothing for no votes — no invented distribution", () => {
    expect(ringArcs([])).toEqual([]);
  });

  it("draws a single 100% segment as a complete, gapless circle", () => {
    const arcs = ringArcs([segment("only", 100)]);
    expect(arcs).toHaveLength(1);
    expect(arcs[0]!.dash).toBe("100 0");
    expect(arcs[0]!.offset).toBe(0);
  });

  it("arc lengths track the percentages and stay in order from the top", () => {
    const arcs = ringArcs([segment("a", 50), segment("b", 30), segment("c", 20)]);
    const lengths = arcs.map((a) => Number(a.dash.split(" ")[0]));
    expect(lengths[0]).toBeGreaterThan(lengths[1]!);
    expect(lengths[1]).toBeGreaterThan(lengths[2]!);
    // Offsets advance by the full percentage of everything before them.
    expect(arcs[0]!.offset).toBeCloseTo(-1.25, 2);
    expect(arcs[1]!.offset).toBeCloseTo(-51.25, 2);
    expect(arcs[2]!.offset).toBeCloseTo(-81.25, 2);
  });

  it("keeps a sliver visible for a 1% option", () => {
    const arcs = ringArcs([segment("a", 99), segment("b", 1)]);
    const tiny = Number(arcs[1]!.dash.split(" ")[0]);
    expect(tiny).toBeGreaterThan(0);
    expect(arcs[1]!.rounded).toBe(false);
  });
});
