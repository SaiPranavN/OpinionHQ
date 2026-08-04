import { describe, expect, it } from "vitest";

import { decoratePoll, isUsablePoll, roundTo100 } from "@/lib/derive-poll";
import {
  decorateHistory,
  HISTORY_VIEWBOX,
  movementLabel,
  readingTotal,
} from "@/lib/derive-history";
import { allPolls, filterAndSortPolls, type PollSortId } from "@/lib/polls";
import { POLL_REASONS } from "@/lib/sample-data/poll-reasons";
import { POLLS } from "@/lib/sample-data/polls";
import { STATUS_STYLES } from "@/lib/taxonomy";
import { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, type Poll } from "@/lib/types";

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

describe("poll fixtures", () => {
  it("uses unique ids", () => {
    const ids = POLLS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses statuses with a defined colour mapping", () => {
    for (const poll of POLLS) {
      expect(STATUS_STYLES[poll.status], poll.id).toBeDefined();
    }
  });

  it("asks between two and four distinct, named, voted-on options", () => {
    for (const poll of POLLS) {
      expect(poll.question.endsWith("?"), poll.id).toBe(true);
      expect(poll.options.length, poll.id).toBeGreaterThanOrEqual(MIN_POLL_OPTIONS);
      expect(poll.options.length, poll.id).toBeLessThanOrEqual(MAX_POLL_OPTIONS);
      const names = poll.options.map((o) => o.name.toLowerCase());
      expect(new Set(names).size, poll.id).toBe(names.length);
      for (const option of poll.options) {
        expect(option.votes, `${poll.id}/${option.id}`).toBeGreaterThan(0);
        expect(option.blurb.length, `${poll.id}/${option.id}`).toBeGreaterThan(10);
      }
    }
  });

  it("assigns option ids positionally, with no gaps", () => {
    const order = ["a", "b", "c", "d"];
    for (const poll of POLLS) {
      expect(poll.options.map((o) => o.id), poll.id).toEqual(
        order.slice(0, poll.options.length),
      );
    }
  });

  it("covers every option in a pinned region override", () => {
    for (const poll of POLLS) {
      for (const [region, pcts] of Object.entries(poll.regionOverrides ?? {})) {
        expect(pcts.length, `${poll.id}/${region}`).toBe(poll.options.length);
        expect(
          pcts.reduce((a, b) => a + b, 0),
          `${poll.id}/${region}`,
        ).toBe(100);
      }
    }
  });

  it("ships at least one poll with more than two options", () => {
    expect(POLLS.some((p) => p.options.length > 2)).toBe(true);
  });

  it("attaches reasons to polls that exist, on an option that exists", () => {
    const byId = new Map(POLLS.map((p) => [p.id, p]));
    for (const reason of POLL_REASONS) {
      const poll = byId.get(reason.pollId);
      expect(poll, reason.id).toBeDefined();
      expect(poll!.options.map((o) => o.id), reason.id).toContain(reason.side);
    }
  });

  it("gives every option of every poll at least one written reason", () => {
    for (const poll of allPolls()) {
      for (const option of poll.options) {
        expect(option.reasonCount, `${poll.id}/${option.id}`).toBeGreaterThan(0);
      }
    }
  });
});

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
    for (const poll of [...POLLS, three, four]) {
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

  it("keeps every cross-tab row at exactly 100 percent across all options", () => {
    for (const poll of [...POLLS, three, four]) {
      const d = decoratePoll(poll);
      for (const row of [...d.regions, ...d.ageGroups, ...d.occupations]) {
        expect(
          row.pcts.reduce((a, b) => a + b, 0),
          `${poll.id}/${row.label}`,
        ).toBe(100);
        expect(row.pcts.length, `${poll.id}/${row.label}`).toBe(poll.options.length);
      }
    }
  });

  it("reconciles the cross-tabs with the headline split", () => {
    // Segments that quietly contradicted the top-line number would make the
    // whole breakdown untrustworthy.
    for (const poll of [...POLLS, three, four]) {
      const d = decoratePoll(poll);
      for (const rows of [d.regions, d.ageGroups, d.occupations]) {
        const shareTotal = rows.reduce((sum, r) => sum + r.share, 0);
        d.options.forEach((option, k) => {
          const weighted =
            rows.reduce((sum, r) => sum + r.pcts[k]! * r.share, 0) / shareTotal;
          expect(
            Math.abs(weighted - option.pct),
            `${poll.id}/${option.id}`,
          ).toBeLessThan(4);
        });
      }
    }
  });

  it("respects the poll's spread — a divisive question swings more by segment", () => {
    const spreadOf = (spread: number) => {
      const rows = decoratePoll({ ...base, spread }).regions.map((r) => r.pcts[0]!);
      return Math.max(...rows) - Math.min(...rows);
    };
    expect(spreadOf(30)).toBeGreaterThan(spreadOf(6));
  });

  it("surfaces a segment that went against the overall winner", () => {
    const chai = allPolls().find((p) => p.id === "chai-coffee")!;
    expect(chai.contrarian).not.toBeNull();
    expect(chai.contrarian!.leans).not.toBe(chai.leader.id);
  });

  it("honours pinned regional patterns over the derived swing", () => {
    // Filter-coffee country must not be reported as overwhelmingly pro-chai;
    // a reader who knows the geography would discount every other number.
    const chai = allPolls().find((p) => p.id === "chai-coffee")!;
    const tn = chai.regions.find((r) => r.label === "Tamil Nadu")!;
    const ka = chai.regions.find((r) => r.label === "Karnataka")!;
    const up = chai.regions.find((r) => r.label === "Uttar Pradesh")!;
    expect(tn.pcts[0]).toBe(18);
    expect(ka.leans).toBe("b");
    expect(up.leans).toBe("a");
    // Chai still wins overall, so the South is genuinely against the grain.
    expect(chai.leader.name).toBe("Chai");
  });

  it("names every option in the accessible split label", () => {
    const d = decoratePoll(four);
    for (const option of d.options) {
      expect(d.splitLabel).toContain(option.name);
    }
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
  const polls = allPolls();

  it("matches on question, option names and tags", () => {
    const byOption = filterAndSortPolls(polls, {
      category: "All",
      sort: "trending",
      query: "pixel",
      place: "any",
    });
    expect(byOption.map((p) => p.id)).toContain("iphone-pixel");

    const byTag = filterAndSortPolls(polls, {
      category: "All",
      sort: "trending",
      query: "goat debate",
      place: "any",
    });
    expect(byTag.map((p) => p.id)).toContain("messi-ronaldo");
  });

  it("searches names on a third and fourth option too", () => {
    const results = filterAndSortPolls(polls, {
      category: "All",
      sort: "trending",
      query: "javascript",
      place: "any",
    });
    expect(results.map((p) => p.id)).toContain("first-language");
  });

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

describe("poll history", () => {
  const withHistory = allPolls().filter((p) => p.history && p.history.length > 0);

  it("ships history on several polls, including every approval poll", () => {
    expect(withHistory.length).toBeGreaterThanOrEqual(8);
    for (const poll of allPolls().filter((p) => p.cat === "politicians")) {
      expect(poll.history, poll.id).toBeDefined();
      expect(poll.history!.length, poll.id).toBeGreaterThanOrEqual(6);
    }
  });

  it("gives every reading one share per option, totalling 100", () => {
    for (const poll of withHistory) {
      for (const reading of poll.history!) {
        expect(reading.pcts.length, `${poll.id} ${reading.date}`).toBe(
          poll.options.length,
        );
        expect(readingTotal(reading), `${poll.id} ${reading.date}`).toBe(100);
      }
    }
  });

  it("records readings in chronological order", () => {
    // The chart plots them by index. Out-of-order fixtures would draw a line
    // that travels backwards in time and looks like a data error nobody made.
    for (const poll of withHistory) {
      const dates = poll.history!.map((r) => r.date);
      expect(dates, poll.id).toEqual([...dates].sort());
    }
  });

  it("draws nothing rather than inventing a curve when nothing was recorded", () => {
    // The rule the whole module exists for: a past reading is data or it is
    // fiction, and there is no third option.
    const bare = allPolls().find((p) => !p.history)!;
    expect(decorateHistory(bare)).toBeNull();
  });

  it("refuses to plot a single reading", () => {
    const poll = withHistory[0]!;
    const one = { ...poll, history: [poll.history![0]!] };
    expect(decorateHistory(one)).toBeNull();
  });

  it("puts the last reading's share on each series", () => {
    const poll = withHistory.find((p) => p.id === "approval-modi")!;
    const history = decorateHistory(poll)!;
    const final = poll.history![poll.history!.length - 1]!;
    for (const [i, series] of history.series.entries()) {
      expect(series.last).toBe(final.pcts[i]);
    }
  });

  it("reports movement against the first reading", () => {
    const poll = withHistory.find((p) => p.id === "theatre-ott")!;
    const history = decorateHistory(poll)!;
    const first = poll.history![0]!;
    const last = poll.history![poll.history!.length - 1]!;
    for (const [i, series] of history.series.entries()) {
      expect(series.change).toBe(last.pcts[i]! - first.pcts[i]!);
    }
  });

  it("scales the axis to the data so a stable series is not magnified", () => {
    // An approval poll living between 53% and 61% must not be stretched to
    // fill a 0–100 frame; equally a flat line must not be blown up into drama.
    const poll = withHistory.find((p) => p.id === "approval-stalin")!;
    const history = decorateHistory(poll)!;
    expect(history.ceiling).toBeLessThanOrEqual(100);
    expect(history.ceiling).toBeGreaterThan(61);
  });

  it("keeps every plotted point inside the viewBox", () => {
    for (const poll of withHistory) {
      const history = decorateHistory(poll)!;
      for (const series of history.series) {
        for (const point of series.points) {
          expect(point.x, poll.id).toBeGreaterThanOrEqual(0);
          expect(point.x, poll.id).toBeLessThanOrEqual(HISTORY_VIEWBOX.width);
          expect(point.y, poll.id).toBeGreaterThanOrEqual(0);
          expect(point.y, poll.id).toBeLessThanOrEqual(HISTORY_VIEWBOX.height);
        }
      }
    }
  });

  it("emits paths with no NaN", () => {
    for (const poll of withHistory) {
      const history = decorateHistory(poll)!;
      for (const series of history.series) {
        expect(series.path.startsWith("M"), poll.id).toBe(true);
        expect(series.path, poll.id).not.toContain("NaN");
      }
    }
  });

  it("says 'no change' rather than 'up 0 points'", () => {
    expect(movementLabel(0)).toBe("No change");
    expect(movementLabel(4)).toBe("Up 4 points");
    expect(movementLabel(-1)).toBe("Down 1 point");
  });
});

describe("approval polls about named people", () => {
  const approval = allPolls().filter((p) => p.cat === "politicians");

  it("asks a straight approve/disapprove", () => {
    for (const poll of approval) {
      expect(poll.options.map((o) => o.name), poll.id).toEqual([
        "Approve",
        "Disapprove",
      ]);
    }
  });

  it("covers more than one political side", () => {
    // A set of approval polls covering one party would be a statement in
    // itself, whatever the numbers said.
    expect(approval.length).toBeGreaterThanOrEqual(4);
  });

  it("attaches only procedural events, never an allegation", () => {
    // The numbers are invented; claims about real named people must not be.
    // This is a blunt instrument, and that is the point — it fails loudly if
    // somebody later writes an event that sounds like a news story.
    const forbidden =
      /scandal|arrest|corrupt|probe|raid|charge|fraud|allegation|accused|resign|jail|indict/i;
    for (const poll of approval) {
      for (const reading of poll.history ?? []) {
        if (!reading.event) continue;
        expect(forbidden.test(reading.event), `${poll.id}: ${reading.event}`).toBe(
          false,
        );
      }
    }
  });
});
