import { describe, expect, it } from "vitest";

import {
  arc,
  decorate,
  participationBars,
  trendPath,
  trendPoints,
  trendValues,
} from "@/lib/derive";
import { allTopics, filterAndSort } from "@/lib/topics";
import { DEFAULT_FACET_SET, FACET_SETS } from "@/lib/facets";
import { TOPICS } from "@/lib/sample-data/topics";
import { OPINIONS } from "@/lib/sample-data/opinions";
import { TIMELINE } from "@/lib/sample-data/timeline";
import { CATEGORIES, STATUS_STYLES } from "@/lib/taxonomy";
import type { Topic } from "@/lib/types";

const base: Topic = {
  id: "test",
  name: "Test topic",
  cat: "policies",
  place: "india",
  status: "Proposed",
  summary: "A test topic.",
  about: "Longer context for the test topic.",
  tags: ["test"],
  pos: 30,
  neu: 20,
  neg: 50,
  participants: 1000,
  trend: 50,
  recency: 1,
  updated: "1h ago",
  change: { metric: "participation", value: 1, direction: "up" },
};

describe("fixture integrity", () => {
  it("every topic's sentiment sums to 100 percent", () => {
    for (const topic of TOPICS) {
      expect(topic.pos + topic.neu + topic.neg, topic.id).toBe(100);
    }
  });

  it("uses unique ids", () => {
    const ids = TOPICS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every editor-published category in the taxonomy", () => {
    for (const category of CATEGORIES) {
      // The catch-all is reserved for participant-created subjects, so it is
      // deliberately empty of fixtures.
      if (category.reserved) continue;
      const inCategory = TOPICS.filter((e) => e.cat === category.id);
      expect(inCategory.length, category.id).toBeGreaterThan(0);
    }
  });

  it("publishes nothing into the reserved catch-all category", () => {
    const reserved = CATEGORIES.filter((c) => c.reserved).map((c) => c.id);
    for (const id of reserved) {
      expect(TOPICS.filter((t) => t.cat === id), id).toHaveLength(0);
    }
  });

  it("only uses statuses that have a defined colour mapping", () => {
    for (const topic of TOPICS) {
      expect(STATUS_STYLES[topic.status], `${topic.id}: ${topic.status}`).toBeDefined();
    }
    for (const event of TIMELINE) {
      expect(STATUS_STYLES[event.status], `${event.id}: ${event.status}`).toBeDefined();
    }
  });

  it("attaches opinions and timelines to topics that exist", () => {
    const ids = new Set(TOPICS.map((e) => e.id));
    for (const opinion of OPINIONS) {
      expect(ids.has(opinion.topicId), opinion.id).toBe(true);
    }
    for (const event of TIMELINE) {
      expect(ids.has(event.topicId), event.id).toBe(true);
    }
  });

  it("gives every topic a card summary short enough to read at a glance", () => {
    for (const topic of TOPICS) {
      expect(topic.summary.length, topic.id).toBeLessThanOrEqual(160);
      expect(topic.about.length, topic.id).toBeGreaterThan(topic.summary.length);
    }
  });
});

describe("aspects", () => {
  it("gives every topic aspects written for it, not just its category", () => {
    for (const topic of TOPICS) {
      expect(topic.aspects, topic.id).toBeDefined();
      expect(topic.aspects!.length, topic.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("never reuses one topic's aspect set on another", () => {
    const seen = new Map<string, string>();
    for (const topic of TOPICS) {
      const signature = topic.aspects!.map((a) => a.label).join("|");
      const owner = seen.get(signature);
      expect(owner, `${topic.id} duplicates ${owner}`).toBeUndefined();
      seen.set(signature, topic.id);
    }
  });

  it("asks every aspect as a question with three distinct answers", () => {
    for (const topic of TOPICS) {
      for (const aspect of topic.aspects!) {
        expect(aspect.prompt.endsWith("?"), `${topic.id}/${aspect.id}`).toBe(true);
        expect(aspect.label.length, `${topic.id}/${aspect.id}`).toBeGreaterThan(2);
        const labels = aspect.options.map((o) => o.label);
        expect(new Set(labels).size, `${topic.id}/${aspect.id}`).toBe(3);
        for (const label of labels) {
          expect(label.length, `${topic.id}/${aspect.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("uses unique aspect ids within an topic", () => {
    for (const topic of TOPICS) {
      const ids = topic.aspects!.map((a) => a.id);
      expect(new Set(ids).size, topic.id).toBe(ids.length);
    }
  });

  it("prefers an topic's own aspects over the category fallback", () => {
    const withOwn = decorate({
      ...base,
      aspects: [
        {
          id: "only",
          label: "Only question",
          prompt: "Is this the only question?",
          options: [
            { id: "pos", label: "Yes", tone: "Positive" },
            { id: "neu", label: "Maybe", tone: "Neutral" },
            { id: "neg", label: "No", tone: "Negative" },
          ],
        },
      ],
    });
    expect(withOwn.facets).toHaveLength(1);
    expect(withOwn.facets[0]!.facet.label).toBe("Only question");

    // Without its own aspects it falls back to the category set.
    expect(decorate(base).facets.length).toBeGreaterThan(1);
  });
});

describe("category fallback sets", () => {
  it("defines a facet set for every category", () => {
    for (const category of CATEGORIES) {
      const setId = DEFAULT_FACET_SET[category.id];
      expect(FACET_SETS[setId], category.id).toBeDefined();
      expect(FACET_SETS[setId]!.length, category.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("gives every facet exactly one option per sentiment tone", () => {
    for (const facets of Object.values(FACET_SETS)) {
      for (const facet of facets) {
        const tones = facet.options.map((o) => o.tone).sort();
        expect(tones, facet.id).toEqual(["Negative", "Neutral", "Positive"]);
      }
    }
  });

  it("produces tallies that total 100 percent for every topic", () => {
    for (const topic of TOPICS) {
      for (const result of decorate(topic).facets) {
        const total = result.tallies.reduce((sum, t) => sum + t.pct, 0);
        expect(total, `${topic.id}/${result.facet.id}`).toBe(100);
      }
    }
  });

  it("marks the largest tally as leading", () => {
    for (const result of decorate(base).facets) {
      const max = Math.max(...result.tallies.map((t) => t.pct));
      expect(result.leading.pct).toBe(max);
    }
  });
});

describe("decorate", () => {
  it("states the headline metric in words rather than an icon", () => {
    expect(decorate(base).headlineMetric).toBe("50% Negative");
    expect(decorate({ ...base, pos: 66, neu: 20, neg: 14 }).headlineMetric).toBe(
      "66% Positive",
    );
  });

  it("reports an even positive/negative split rather than picking a side", () => {
    const d = decorate({ ...base, pos: 41, neu: 18, neg: 41 });
    expect(d.dominant).toBe("Split");
    expect(d.headlineMetric).toBe("Split 41/41");
  });

  it("treats neutral as dominant when it leads", () => {
    const d = decorate({ ...base, pos: 20, neu: 60, neg: 20 });
    expect(d.dominant).toBe("Neutral");
    expect(d.dominantPct).toBe(60);
  });

  it("scores polarization highest when the poles are equal and large", () => {
    expect(decorate({ ...base, pos: 50, neu: 0, neg: 50 }).polarization).toBe(100);
    expect(decorate({ ...base, pos: 5, neu: 0, neg: 95 }).polarization).toBe(10);
  });

  it("derives head counts from the share and the participant total", () => {
    const d = decorate(base);
    expect(d.posCount).toBe(300);
    expect(d.neuCount).toBe(200);
    expect(d.negCount).toBe(500);
  });

  it("says so plainly when no written opinions exist", () => {
    expect(decorate(base).writtenLine).toBe("no written opinions yet");
  });
});

describe("topics nobody has voted on", () => {
  const fresh = { ...base, pos: 0, neu: 0, neg: 0, participants: 0 };

  it("reports no result rather than inventing one", () => {
    const d = decorate(fresh);
    expect(d.unrated).toBe(true);
    expect(d.dominant).toBe("Unrated");
    expect(d.headlineMetric).toBe("No votes yet");
    expect(d.participantsLabel).toBe("Be the first to vote");
    expect(d.changeLabel).toBe("No activity recorded yet");
  });

  it("still shows the questions, with empty tallies", () => {
    const d = decorate(fresh);
    expect(d.facets.length).toBeGreaterThan(0);
    for (const result of d.facets) {
      expect(result.responses).toBe(0);
      expect(result.tallies.every((t) => t.pct === 0)).toBe(true);
    }
  });

  it("does not treat a 0/0 split as an even split", () => {
    expect(decorate(fresh).headlineMetric).not.toContain("Split");
  });

  it("declines to report a weekly trend from a single vote", () => {
    const oneVote = decorate({
      ...base,
      pos: 0,
      neu: 0,
      neg: 100,
      participants: 1,
      // Even if the stored change claims a jump, one vote is not a trend.
      change: { metric: "participation", value: 100, direction: "up" },
    });
    expect(oneVote.unrated).toBe(false);
    expect(oneVote.headlineMetric).toBe("100% Negative");
    expect(oneVote.changeLabel).toBe("Not enough history for a weekly trend");
    expect(oneVote.participantsLabel).toBe("1 participant");
    // No arrow either — it would point at a movement that was never measured.
    expect(oneVote.changeArrow).toBe("");
  });

  it("never derives aspect tallies for a participant-created topic", () => {
    // Derived tallies stand in for server aggregates. On an topic created in
    // the browser there is no server, so inventing shares would be fabrication.
    const mine = decorate({
      ...base,
      participants: 1,
      pos: 0,
      neu: 0,
      neg: 100,
      createdBy: "Someone",
    });
    for (const result of mine.facets) {
      expect(result.responses).toBe(0);
      expect(result.tallies.every((t) => t.pct === 0)).toBe(true);
    }
  });

  it("still derives tallies for editor-published topics", () => {
    const fixture = decorate({ ...base, participants: 5000 });
    expect(fixture.facets[0]!.responses).toBeGreaterThan(0);
  });
});

describe("seven-day change", () => {
  it("spells out what moved rather than showing a bare percentage", () => {
    const negUp = decorate({
      ...base,
      change: { metric: "negative-sentiment", value: 14.2, direction: "up" },
    });
    expect(negUp.changeLabel).toBe("Negative sentiment up 14.2% this week");
  });

  it("colours a rise in negative sentiment as bad, not good", () => {
    const negUp = decorate({
      ...base,
      change: { metric: "negative-sentiment", value: 10, direction: "up" },
    });
    const negDown = decorate({
      ...base,
      change: { metric: "negative-sentiment", value: 10, direction: "down" },
    });
    expect(negUp.changeColor).toBe("#E5484D");
    expect(negDown.changeColor).toBe("#1DB954");
    // Both point in opposite directions but neither shares the other's colour.
    expect(negUp.changeArrow).toBe("▲");
    expect(negDown.changeArrow).toBe("▼");
  });

  it("uses a neutral accent for activity metrics that carry no verdict", () => {
    const participation = decorate({
      ...base,
      change: { metric: "participation", value: 31.8, direction: "up" },
    });
    expect(participation.changeColor).toBe("#5AA9F0");
    expect(participation.changeLabel).toBe("Participation up 31.8% this week");
  });
});

describe("audience breakdowns", () => {
  it("keeps every geographic column at exactly 100 percent", () => {
    for (const topic of TOPICS) {
      const total = decorate(topic).geo.reduce((sum, row) => sum + row.pct, 0);
      expect(total, topic.id).toBe(100);
    }
  });

  it("lists named regions above the residual bucket", () => {
    for (const topic of TOPICS) {
      const geo = decorate(topic).geo;
      expect(geo.at(-1)!.label, topic.id).toBe("Other states");
      const named = geo.slice(0, -1).map((r) => r.pct);
      expect([...named].sort((a, b) => b - a), topic.id).toEqual(named);
    }
  });
});

describe("chart geometry", () => {
  it("keeps donut segments within the circumference", () => {
    const { dash } = arc(50, 0);
    const [filled, gap] = dash.split(" ").map(Number);
    // Each half is rounded to 1dp, so the sum can drift by up to 0.1.
    expect(filled! + gap!).toBeCloseTo(2 * Math.PI * 80, 0);
  });

  it("never emits a negative dash length for a zero share", () => {
    expect(arc(0, 0).dash.startsWith("0.0 ")).toBe(true);
  });

  it("spans the full chart width", () => {
    const path = trendPath(40, 80);
    expect(path.startsWith("M0 ")).toBe(true);
    expect(path).toContain("800 ");
  });

  it("produces 30 participation bars inside 0-100", () => {
    const bars = participationBars(3);
    expect(bars).toHaveLength(30);
    for (const bar of bars) {
      expect(bar).toBeGreaterThanOrEqual(0);
      expect(bar).toBeLessThanOrEqual(100);
    }
  });
});

describe("catalog filtering", () => {
  const decorated = TOPICS.map(decorate);

  it("matches on name, category label, status, summary and tags", () => {
    const byStatus = filterAndSort(decorated, {
      category: "All",
      sort: "trending",
      query: "under investigation",
      place: "any",
    });
    expect(byStatus.map((e) => e.id)).toContain("neet");

    const byTag = filterAndSort(decorated, {
      category: "All",
      sort: "trending",
      query: "signalling",
      place: "any",
    });
    expect(byTag.map((e) => e.id)).toContain("blrmetro");
  });

  it("intersects category and query rather than unioning them", () => {
    const results = filterAndSort(decorated, {
      category: "sports",
      sort: "trending",
      query: "metro",
      place: "any",
    });
    expect(results).toHaveLength(0);
  });

  it("orders by the selected sort key", () => {
    const check = (sort: Parameters<typeof filterAndSort>[1]["sort"]) =>
      filterAndSort(decorated, { category: "All", sort, query: "", place: "any" });

    expect(check("trending")[0]!.trend).toBeGreaterThanOrEqual(check("trending")[1]!.trend);
    expect(check("positive")[0]!.pos).toBeGreaterThanOrEqual(check("positive")[1]!.pos);
    expect(check("negative")[0]!.neg).toBeGreaterThanOrEqual(check("negative")[1]!.neg);
    expect(check("recent")[0]!.recency).toBeLessThanOrEqual(check("recent")[1]!.recency);
    expect(check("participation")[0]!.participants).toBeGreaterThanOrEqual(
      check("participation")[1]!.participants,
    );
    expect(check("polarizing")[0]!.polarization).toBeGreaterThanOrEqual(
      check("polarizing")[1]!.polarization,
    );
  });

  it("leaves the source list untouched", () => {
    const before = decorated.map((e) => e.id);
    filterAndSort(decorated, { category: "All", sort: "polarizing", query: "", place: "any" });
    expect(decorated.map((e) => e.id)).toEqual(before);
  });
});

describe("trend series", () => {
  it("never plots a share below zero or above a hundred", () => {
    // A topic with a large weekly swing used to ease from a negative start,
    // which drew the line under the baseline and read out "-3% negative".
    for (const [from, to] of [
      [-20, 13],
      [110, 68],
      [0, 100],
      [50, 50],
    ] as const) {
      for (const value of trendValues(from, to)) {
        expect(value, `${from}→${to}`).toBeGreaterThanOrEqual(0);
        expect(value, `${from}→${to}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("stays inside the plot area for every fixture topic", () => {
    for (const topic of allTopics()) {
      if (topic.unrated) continue;
      const series = [
        ...trendPoints(topic.neg - topic.change.value, topic.neg),
        ...trendPoints(topic.pos + topic.change.value, topic.pos),
      ];
      for (const point of series) {
        expect(point.y, topic.id).toBeGreaterThanOrEqual(40);
        expect(point.y, topic.id).toBeLessThanOrEqual(240);
      }
    }
  });

  it("starts and ends on the values it claims", () => {
    // The wobble tapers to nothing at both ends, so the right edge of the chart
    // agrees with the headline share sitting next to it.
    const series = trendValues(30, 68);
    expect(series[0]).toBe(30);
    expect(series.at(-1)).toBe(68);
  });

  it("keeps the wobble in the middle, where it belongs", () => {
    const flat = trendValues(50, 50);
    expect(flat[0]).toBe(50);
    expect(flat.at(-1)).toBe(50);
    expect(flat.some((v) => v !== 50)).toBe(true);
  });

  it("ends every fixture topic's line on its stated share", () => {
    for (const topic of allTopics()) {
      if (topic.unrated) continue;
      expect(
        trendValues(topic.neg - topic.change.value, topic.neg).at(-1),
        topic.id,
      ).toBe(topic.neg);
      expect(
        trendValues(topic.pos + topic.change.value, topic.pos).at(-1),
        topic.id,
      ).toBe(topic.pos);
    }
  });
});
