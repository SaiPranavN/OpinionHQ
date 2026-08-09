import { describe, expect, it } from "vitest";

import { decoratePoll, isUsablePoll, roundTo100 } from "@/lib/derive-poll";
import {
} from "@/lib/derive-history";
import { filterAndSortPolls, type PollSortId } from "@/lib/polls";
import {
  TEST_POLLS,
  testDecoratedPolls,
} from "@/lib/test-support/fixtures";
import { type Poll } from "@/lib/types";

const base: Poll = {
  id: "test-poll",
  question: "A or B?",
  cat: "sports",
  place: "worldwide",
  status: "Live",
  summary: "A test poll.",
  about: "Longer context for the test poll.",
  tags: ["test"],
  options: [
    { id: "a", name: "Option A", blurb: "The first one.", votes: 600 },
    { id: "b", name: "Option B", blurb: "The second one.", votes: 400 },
  ],
  closes: "Open-ended",
  trend: 50,
  recency: 1,
  updated: "1h ago",
};

/** Three- and four-option polls, for everything that used to assume two. */
const three: Poll = {
  ...base,
  id: "test-three",
  question: "A, B or C?",
  options: [
    { id: "a", name: "Option A", blurb: "First.", votes: 500 },
    { id: "b", name: "Option B", blurb: "Second.", votes: 300 },
    { id: "c", name: "Option C", blurb: "Third.", votes: 200 },
  ],
};

const four: Poll = {
  ...base,
  id: "test-four",
  question: "A, B, C or D?",
  options: [
    { id: "a", name: "Option A", blurb: "First.", votes: 400 },
    { id: "b", name: "Option B", blurb: "Second.", votes: 300 },
    { id: "c", name: "Option C", blurb: "Third.", votes: 200 },
    { id: "d", name: "Option D", blurb: "Fourth.", votes: 100 },
  ],
};

describe("roundTo100", () => {
  it("always totals exactly 100", () => {
    const cases = [
      [33.333, 33.333, 33.333],
      [16.666, 16.666, 16.666, 50.002],
      [0.4, 99.6],
      [25, 25, 25, 25],
    ];
    for (const values of cases) {
      expect(roundTo100(values).reduce((a, b) => a + b, 0), values.join("/")).toBe(100);
    }
  });

  it("gives the spare point to the largest remainder", () => {
    // Naive rounding would produce 33/33/33 and lose a point.
    expect(roundTo100([33.4, 33.3, 33.3])).toEqual([34, 33, 33]);
  });
});

describe("decoratePoll", () => {
  it("splits every poll to exactly 100 percent", () => {
    for (const poll of [...TEST_POLLS, three, four]) {
      const d = decoratePoll(poll);
      expect(
        d.options.reduce((sum, o) => sum + o.pct, 0),
        poll.id,
      ).toBe(100);
    }
  });

  it("names the leader and states the margin in words", () => {
    const d = decoratePoll(base);
    expect(d.options[0]!.pct).toBe(60);
    expect(d.leader.name).toBe("Option A");
    expect(d.runnerUp.name).toBe("Option B");
    expect(d.margin).toBe(20);
    expect(d.marginLabel).toBe("Option A leads by 20 points");
    expect(d.verdict).toBe("Clear lead");
  });

  it("measures the margin against the runner-up, not the whole field", () => {
    // A 50/30/20 poll is a 20-point lead over second place, not a 30-point one.
    const d = decoratePoll(three);
    expect(d.leader.name).toBe("Option A");
    expect(d.runnerUp.name).toBe("Option B");
    expect(d.margin).toBe(20);
    expect(d.verdict).toBe("Clear front-runner");
  });

  it("keeps the options in author order and ranks separately", () => {
    const shuffled = decoratePoll({
      ...three,
      options: [
        { id: "a", name: "Option A", blurb: "First.", votes: 100 },
        { id: "b", name: "Option B", blurb: "Second.", votes: 700 },
        { id: "c", name: "Option C", blurb: "Third.", votes: 200 },
      ],
    });
    expect(shuffled.options.map((o) => o.id)).toEqual(["a", "b", "c"]);
    expect(shuffled.ranked.map((o) => o.id)).toEqual(["b", "c", "a"]);
    expect(shuffled.leader.id).toBe("b");
  });

  it("reports no result on a poll nobody has voted on", () => {
    // The composer publishes polls in exactly this state, and an even share
    // must not read as a dead heat.
    const fresh = decoratePoll({
      ...four,
      options: four.options.map((o) => ({ ...o, votes: 0 })),
    });
    expect(fresh.unvoted).toBe(true);
    expect(fresh.total).toBe(0);
    expect(fresh.verdict).toBe("No votes yet");
    expect(fresh.marginLabel).toBe("Be the first to vote");
    expect(fresh.splitLabel).toBe("No votes recorded yet");
  });

  it("declines to call a verdict or cross-tab from a handful of votes", () => {
    const tiny = decoratePoll({
      ...three,
      options: [
        { id: "a", name: "Option A", blurb: "First.", votes: 1 },
        { id: "b", name: "Option B", blurb: "Second.", votes: 0 },
        { id: "c", name: "Option C", blurb: "Third.", votes: 0 },
      ],
    });
    expect(tiny.smallSample).toBe(true);
    expect(tiny.verdict).toBe("Too few votes to call");
    expect(tiny.marginLabel).toBe("Option A ahead on 1 vote");
    expect(tiny.regions).toEqual([]);
    expect(tiny.ageGroups).toEqual([]);
    expect(tiny.occupations).toEqual([]);
    expect(tiny.contrarian).toBeNull();
  });

  it("calls a dead heat a dead heat rather than picking a winner", () => {
    const d = decoratePoll({
      ...base,
      options: [
        { id: "a", name: "Option A", blurb: "First.", votes: 500 },
        { id: "b", name: "Option B", blurb: "Second.", votes: 500 },
      ],
    });
    expect(d.margin).toBe(0);
    expect(d.marginLabel).toBe("Dead even");
    expect(d.verdict).toBe("Too close to call");
  });

  it("names every option in the accessible split label", () => {
    const d = decoratePoll(four);
    for (const option of d.options) {
      expect(d.splitLabel).toContain(option.name);
    }
  });
});

/**
 * These replaced a set of tests that checked the *invented* cross-tabs were
 * convincing — that every segment row totalled 100, that the segments
 * reconciled with the headline, that a `spread` knob made a question look more
 * divisive. All of that was true of the fabrication and none of it made it a
 * measurement. What matters now is the opposite property: that nothing appears
 * unless it was counted.
 */
describe("decoratePoll cross-tabs", () => {
  const measured = {
    regions: [
      { label: "Karnataka", share: 60, voters: 60, pcts: [70, 30], leans: "a" as const, margin: 40 },
      { label: "Kerala", share: 40, voters: 40, pcts: [45, 55], leans: "b" as const, margin: 10 },
    ],
    ageGroups: [],
    occupations: [],
  };

  it("draws nothing when nothing was measured", () => {
    const d = decoratePoll(base);
    expect(d.regions).toEqual([]);
    expect(d.ageGroups).toEqual([]);
    expect(d.occupations).toEqual([]);
    expect(d.contrarian).toBeNull();
    // Not a plausible-looking share. The panel quoting this is not drawn.
    expect(d.demographicOptIn).toBe(0);
  });

  it("passes measured segments through untouched", () => {
    const d = decoratePoll({ ...base, audience: measured, demographicOptIn: 73 });
    expect(d.regions).toEqual(measured.regions);
    expect(d.demographicOptIn).toBe(73);
  });

  it("withholds measured segments on a poll too small to break down", () => {
    // The database suppresses small *segments*; this is the second floor, on
    // the poll as a whole. Four voters cross-tabbed is a story about four
    // people told as though it were about a region.
    const d = decoratePoll({
      ...base,
      options: [
        { id: "a", name: "Option A", blurb: "First.", votes: 3 },
        { id: "b", name: "Option B", blurb: "Second.", votes: 1 },
      ],
      audience: measured,
    });
    expect(d.smallSample).toBe(true);
    expect(d.regions).toEqual([]);
  });

  it("finds the contrarian segment among measured rows only", () => {
    const d = decoratePoll({ ...base, audience: measured });
    // A leads overall; Kerala went to B.
    expect(d.leader.id).toBe("a");
    expect(d.contrarian?.label).toBe("Kerala");
    expect(d.contrarian?.leans).toBe("b");
  });

  it("counts written reasons per option rather than assuming any", () => {
    const d = decoratePoll({ ...base, reasonCounts: { a: 4, b: 2 } });
    expect(d.options.find((o) => o.id === "a")?.reasonCount).toBe(4);
    expect(d.options.find((o) => o.id === "b")?.reasonCount).toBe(2);
    expect(d.reasonCount).toBe(6);

    const none = decoratePoll(base);
    expect(none.reasonCount).toBe(0);
    expect(none.options.every((o) => o.reasonCount === 0)).toBe(true);
  });
});

describe("isUsablePoll", () => {
  it("accepts polls of every supported width", () => {
    for (const poll of [base, three, four]) {
      expect(isUsablePoll(poll)).toBe(true);
    }
  });

  it("rejects a poll stored in the old two-sided shape", () => {
    // What localStorage still holds from before options replaced { a, b }.
    // Decorating one of these reduces over `undefined` and takes down the
    // whole catalog, so it must never reach `decoratePoll`.
    const legacy = {
      id: "legacy",
      question: "A or B?",
      cat: "sports",
      a: { id: "a", name: "Option A", blurb: "First.", votes: 600 },
      b: { id: "b", name: "Option B", blurb: "Second.", votes: 400 },
    };
    expect(isUsablePoll(legacy)).toBe(false);
  });

  it("rejects records that would decorate into nonsense", () => {
    expect(isUsablePoll(null)).toBe(false);
    expect(isUsablePoll(undefined)).toBe(false);
    expect(isUsablePoll("a poll")).toBe(false);
    expect(isUsablePoll({ options: [] })).toBe(false);
    expect(isUsablePoll({ ...base, options: base.options.slice(0, 1) })).toBe(false);
    expect(
      isUsablePoll({
        ...base,
        options: [...four.options, { id: "e", name: "Fifth", blurb: "", votes: 1 }],
      }),
    ).toBe(false);
    expect(
      isUsablePoll({ ...base, options: [{ id: "a", name: "A" }, { id: "b", name: "B" }] }),
    ).toBe(false);
  });

  it("lets a good poll through when a bad one sits next to it", () => {
    // The point of the guard: one stale record costs its author that poll,
    // not everyone else theirs.
    const stored: unknown[] = [{ id: "legacy", question: "A or B?" }, base, three];
    const usable = stored.filter(isUsablePoll);
    expect(usable).toHaveLength(2);
    expect(() => usable.map(decoratePoll)).not.toThrow();
  });
});

describe("poll filtering", () => {
  const polls = testDecoratedPolls();

  it("intersects category and query", () => {
    const results = filterAndSortPolls(polls, {
      category: "exams",
      sort: "trending",
      query: "coffee",
      place: "any",
    });
    expect(results).toHaveLength(0);
  });

  it("orders by the selected sort key", () => {
    const check = (sort: PollSortId) =>
      filterAndSortPolls(polls, { category: "All", sort, query: "", place: "any" });

    expect(check("trending")[0]!.trend).toBeGreaterThanOrEqual(check("trending")[1]!.trend);
    expect(check("closest")[0]!.margin).toBeLessThanOrEqual(check("closest")[1]!.margin);
    expect(check("voted")[0]!.total).toBeGreaterThanOrEqual(check("voted")[1]!.total);
    expect(check("recent")[0]!.recency).toBeLessThanOrEqual(check("recent")[1]!.recency);
  });

  it("leaves the source list untouched", () => {
    const before = polls.map((p) => p.id);
    filterAndSortPolls(polls, { category: "All", sort: "closest", query: "", place: "any" });
    expect(polls.map((p) => p.id)).toEqual(before);
  });
});

/* --------------------------------------------------------------- history */

