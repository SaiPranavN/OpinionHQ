import { describe, expect, it } from "vitest";

import { decoratePoll } from "@/lib/derive-poll";
import { allPolls, filterAndSortPolls, type PollSortId } from "@/lib/polls";
import { POLL_REASONS } from "@/lib/sample-data/poll-reasons";
import { POLLS } from "@/lib/sample-data/polls";
import { STATUS_STYLES } from "@/lib/taxonomy";
import type { Poll } from "@/lib/types";

const base: Poll = {
  id: "test-poll",
  question: "A or B?",
  cat: "sports",
  status: "Live",
  summary: "A test poll.",
  about: "Longer context for the test poll.",
  tags: ["test"],
  a: { id: "a", name: "Option A", blurb: "The first one.", votes: 600 },
  b: { id: "b", name: "Option B", blurb: "The second one.", votes: 400 },
  closes: "Open-ended",
  trend: 50,
  recency: 1,
  updated: "1h ago",
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

  it("phrases every poll as a question with two distinct named options", () => {
    for (const poll of POLLS) {
      expect(poll.question.endsWith("?"), poll.id).toBe(true);
      expect(poll.a.name, poll.id).not.toBe(poll.b.name);
      expect(poll.a.votes, poll.id).toBeGreaterThan(0);
      expect(poll.b.votes, poll.id).toBeGreaterThan(0);
    }
  });

  it("attaches reasons to polls that exist, on a real side", () => {
    const ids = new Set(POLLS.map((p) => p.id));
    for (const reason of POLL_REASONS) {
      expect(ids.has(reason.pollId), reason.id).toBe(true);
      expect(["a", "b"]).toContain(reason.side);
    }
  });

  it("gives both sides of every poll at least one written reason", () => {
    for (const poll of allPolls()) {
      expect(poll.sides[0].reasonCount, `${poll.id} side a`).toBeGreaterThan(0);
      expect(poll.sides[1].reasonCount, `${poll.id} side b`).toBeGreaterThan(0);
    }
  });
});

describe("decoratePoll", () => {
  it("splits the two sides to exactly 100 percent", () => {
    for (const poll of POLLS) {
      const d = decoratePoll(poll);
      expect(d.sides[0].pct + d.sides[1].pct, poll.id).toBe(100);
    }
  });

  it("names the leader and states the margin in words", () => {
    const d = decoratePoll(base);
    expect(d.sides[0].pct).toBe(60);
    expect(d.leader.name).toBe("Option A");
    expect(d.trailer.name).toBe("Option B");
    expect(d.margin).toBe(20);
    expect(d.marginLabel).toBe("Option A leads by 20 points");
    expect(d.verdict).toBe("Clear lead");
  });

  it("reports no result on a poll nobody has voted on", () => {
    // The composer publishes polls in exactly this state, and a 0/0 split must
    // not read as a dead heat.
    const fresh = decoratePoll({
      ...base,
      a: { ...base.a, votes: 0 },
      b: { ...base.b, votes: 0 },
    });
    expect(fresh.unvoted).toBe(true);
    expect(fresh.total).toBe(0);
    expect(fresh.verdict).toBe("No votes yet");
    expect(fresh.marginLabel).toBe("Be the first to vote");
    expect(fresh.splitLabel).toBe("No votes recorded yet");
  });

  it("declines to call a verdict or cross-tab from a handful of votes", () => {
    // One vote is not a landslide, and a regional breakdown of one voter would
    // be invention rather than a placeholder.
    const tiny = decoratePoll({
      ...base,
      a: { ...base.a, votes: 1 },
      b: { ...base.b, votes: 0 },
    });
    expect(tiny.smallSample).toBe(true);
    expect(tiny.verdict).toBe("Too few votes to call");
    expect(tiny.marginLabel).toBe("Option A ahead on 1 vote");
    expect(tiny.regions).toEqual([]);
    expect(tiny.ageGroups).toEqual([]);
    expect(tiny.occupations).toEqual([]);
    expect(tiny.contrarian).toBeNull();
  });

  it("cross-tabs every fixture poll, which is comfortably above the threshold", () => {
    for (const poll of allPolls()) {
      expect(poll.smallSample, poll.id).toBe(false);
      expect(poll.regions.length, poll.id).toBeGreaterThan(0);
    }
  });

  it("calls a dead heat a dead heat rather than picking a winner", () => {
    const d = decoratePoll({
      ...base,
      a: { ...base.a, votes: 500 },
      b: { ...base.b, votes: 500 },
    });
    expect(d.margin).toBe(0);
    expect(d.marginLabel).toBe("Dead even");
    expect(d.verdict).toBe("Too close to call");
  });

  it("keeps every cross-tab row at 100 percent across both sides", () => {
    for (const poll of POLLS) {
      const d = decoratePoll(poll);
      for (const row of [...d.regions, ...d.ageGroups, ...d.occupations]) {
        expect(row.aPct + row.bPct, `${poll.id}/${row.label}`).toBe(100);
      }
    }
  });

  it("reconciles the cross-tabs with the headline split", () => {
    // Segments that quietly contradicted the top-line number would make the
    // whole breakdown untrustworthy.
    for (const poll of POLLS) {
      const d = decoratePoll(poll);
      for (const rows of [d.regions, d.ageGroups, d.occupations]) {
        const shareTotal = rows.reduce((sum, r) => sum + r.share, 0);
        const weighted =
          rows.reduce((sum, r) => sum + r.aPct * r.share, 0) / shareTotal;
        expect(Math.abs(weighted - d.sides[0].pct), poll.id).toBeLessThan(3);
      }
    }
  });

  it("respects the poll's spread — a divisive question swings more by segment", () => {
    const spreadOf = (spread: number) => {
      const rows = decoratePoll({ ...base, spread }).regions.map((r) => r.aPct);
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
    expect(tn.aPct).toBe(18);
    expect(ka.leans).toBe("b");
    expect(up.leans).toBe("a");
    // Chai still wins overall, so the South is genuinely against the grain.
    expect(chai.leader.name).toBe("Chai");
  });
});

describe("poll filtering", () => {
  const polls = allPolls();

  it("matches on question, option names and tags", () => {
    const byOption = filterAndSortPolls(polls, {
      category: "All",
      sort: "trending",
      query: "pixel",
    });
    expect(byOption.map((p) => p.id)).toContain("iphone-pixel");

    const byTag = filterAndSortPolls(polls, {
      category: "All",
      sort: "trending",
      query: "goat debate",
    });
    expect(byTag.map((p) => p.id)).toContain("messi-ronaldo");
  });

  it("intersects category and query", () => {
    const results = filterAndSortPolls(polls, {
      category: "exams",
      sort: "trending",
      query: "coffee",
    });
    expect(results).toHaveLength(0);
  });

  it("orders by the selected sort key", () => {
    const check = (sort: PollSortId) =>
      filterAndSortPolls(polls, { category: "All", sort, query: "" });

    expect(check("trending")[0]!.trend).toBeGreaterThanOrEqual(check("trending")[1]!.trend);
    expect(check("closest")[0]!.margin).toBeLessThanOrEqual(check("closest")[1]!.margin);
    expect(check("voted")[0]!.total).toBeGreaterThanOrEqual(check("voted")[1]!.total);
    expect(check("recent")[0]!.recency).toBeLessThanOrEqual(check("recent")[1]!.recency);
  });

  it("leaves the source list untouched", () => {
    const before = polls.map((p) => p.id);
    filterAndSortPolls(polls, { category: "All", sort: "closest", query: "" });
    expect(polls.map((p) => p.id)).toEqual(before);
  });
});
