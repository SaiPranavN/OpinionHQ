/**
 * The rules that make Pro contributions part of the conversation rather than a
 * product sitting inside it.
 *
 * Three of these are worth more than the rest, because they are the ones a
 * future change could quietly break while every screen still looks right:
 * format is not an input to ranking, an embedded block cannot reach the topic's
 * numbers, and both tabs read one list.
 */

import { describe, expect, it } from "vitest";

import {
  ageMinutes,
  blockResults,
  blockTotal,
  collapsedSections,
  filterContributions,
  hasMoreToRead,
  headlineOf,
  isPro,
  isPublishable,
  orderedSections,
  qualitySignals,
  relevanceScore,
  sortContributions,
} from "@/lib/contributions";
import { PRO_CONTRIBUTIONS } from "@/lib/sample-data/contributions";
import { OPINIONS, opinionsFor } from "@/lib/sample-data/opinions";
import { allTopics } from "@/lib/topics";
import { categoryAccent } from "@/lib/taxonomy";
import type { InteractiveBlock, Opinion, ProSection } from "@/lib/types";

const standard = (over: Partial<Opinion> = {}): Opinion => ({
  id: "s1",
  topicId: "t",
  name: "A Reader",
  initials: "AR",
  vote: "Neutral",
  text: "A plain opinion.",
  time: "2 hours ago",
  helpful: 10,
  replies: 1,
  ...over,
});

const headline = (text = "A headline long enough to publish"): ProSection => ({
  id: "h",
  type: "headline",
  position: 0,
  text,
});

const pro = (over: Partial<Opinion> = {}): Opinion =>
  standard({ id: "p1", format: "pro", text: "", sections: [headline()], ...over });

/* ------------------------------------------------------------ one model */

describe("one contribution model", () => {
  it("treats a record with no format as a standard opinion", () => {
    // Every opinion written before Pro existed has no `format`. Reading the
    // absence as "standard" is what makes the model need no migration.
    expect(isPro(standard())).toBe(false);
    expect(isPro(pro())).toBe(true);
  });

  it("puts standard and Pro fixtures in the same list", () => {
    // Not two accessors, one. A caller asking for the opinions on a topic
    // cannot be handed half of them.
    const kalki = opinionsFor("kalki2");
    expect(kalki.some(isPro)).toBe(true);
    expect(kalki.some((o) => !isPro(o))).toBe(true);
    for (const contribution of PRO_CONTRIBUTIONS) {
      expect(OPINIONS.some((o) => o.id === contribution.id), contribution.id).toBe(true);
    }
  });

  it("gives every seeded contribution a unique id across both formats", () => {
    // Replies and helpful marks are keyed by this id. A collision would join
    // two people's threads together.
    const ids = OPINIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("attaches every seeded Pro contribution to a real topic", () => {
    const topics = new Set(allTopics().map((t) => t.id));
    for (const contribution of PRO_CONTRIBUTIONS) {
      expect(topics.has(contribution.topicId), contribution.id).toBe(true);
    }
  });
});

/* -------------------------------------------------------------- sections */

describe("pro sections", () => {
  it("requires a headline and nothing else", () => {
    expect(isPublishable([headline()])).toBe(true);
    expect(isPublishable([])).toBe(false);
    expect(isPublishable([headline("short")])).toBe(false);
  });

  it("orders sections by position rather than by array order", () => {
    const out = orderedSections(
      pro({
        sections: [
          { id: "b", type: "final_verdict", position: 2, text: "Last" },
          headline(),
          { id: "a", type: "quick_take", position: 1, text: "Middle" },
        ],
      }),
    );
    expect(out.map((s) => s.position)).toEqual([0, 1, 2]);
  });

  it("reads the headline off the section rather than off the body", () => {
    expect(headlineOf(pro())).toBe("A headline long enough to publish");
    // A standard opinion has no headline, and must not borrow one.
    expect(headlineOf(standard())).toBe("");
  });

  it("holds back the breakdown and the tail of the key points when collapsed", () => {
    const sections: ProSection[] = [
      headline(),
      { id: "b", type: "breakdown", position: 1, text: "Long reasoning." },
      {
        id: "k",
        type: "key_points",
        position: 2,
        points: ["one", "two", "three", "four", "five"],
      },
    ];
    const { shown, hiddenSections, hiddenPoints } = collapsedSections(sections);
    expect(shown.some((s) => s.type === "breakdown")).toBe(false);
    expect(hiddenSections).toBe(1);
    expect(hiddenPoints).toBe(2);
    expect(hasMoreToRead(sections)).toBe(true);
  });

  it("keeps the interactive block in the collapsed view", () => {
    // It is the one part a reader can act on in a single tap. Behind "read
    // more" it would be decoration.
    const block: InteractiveBlock = {
      id: "b1",
      kind: "poll",
      prompt: "Which?",
      options: [{ id: "a", label: "A", count: 1 }],
    };
    const { shown } = collapsedSections([
      headline(),
      { id: "i", type: "interactive", position: 1, block },
    ]);
    expect(shown.some((s) => s.type === "interactive")).toBe(true);
  });

  it("offers no 'read full contribution' when nothing is held back", () => {
    expect(hasMoreToRead([headline()])).toBe(false);
  });
});

/* --------------------------------------------------------------- ranking */

describe("ranking is blind to format", () => {
  it("puts a well-received standard opinion above a quiet Pro one", () => {
    // THE RULE THE WHOLE FEATURE TURNS ON. Pro buys better publishing tools,
    // not a better position. The day this test fails, the feed has stopped
    // being a record of what people think and become a list of who paid.
    const loud = standard({ helpful: 900, replies: 40 });
    const quiet = pro({ helpful: 12, replies: 0 });
    expect(relevanceScore(loud)).toBeGreaterThan(relevanceScore(quiet));
    expect(sortContributions([quiet, loud], "relevant")[0]!.id).toBe(loud.id);
  });

  it("scores two identical contributions identically whatever their format", () => {
    const a = standard({ id: "a", helpful: 50, replies: 4, saves: 2 });
    const b = pro({ id: "b", helpful: 50, replies: 4, saves: 2 });
    expect(relevanceScore(a)).toBe(relevanceScore(b));
  });

  it("ships fixtures that demonstrate the rule rather than assert it", () => {
    // A seeded set where every Pro post outranks everything would let the rule
    // hold in code and fail on screen.
    const contribution = PRO_CONTRIBUTIONS.find((c) => c.topicId === "iphone18")!;
    const feed = sortContributions(opinionsFor("iphone18"), "relevant");
    expect(feed[0]!.id).not.toBe(contribution.id);
  });

  it("orders by upvotes, replies and age when asked to", () => {
    const a = standard({ id: "a", helpful: 5, replies: 9, time: "3 days ago" });
    const b = standard({ id: "b", helpful: 90, replies: 1, time: "20 minutes ago" });
    expect(sortContributions([a, b], "upvoted")[0]!.id).toBe("b");
    expect(sortContributions([a, b], "discussed")[0]!.id).toBe("a");
    expect(sortContributions([a, b], "newest")[0]!.id).toBe("b");
  });

  it("reads the age out of the display string the fixtures actually use", () => {
    expect(ageMinutes("Just now")).toBe(0);
    expect(ageMinutes("20 minutes ago")).toBe(20);
    expect(ageMinutes("3 hours ago")).toBe(180);
    expect(ageMinutes("2 days ago")).toBe(2880);
    expect(ageMinutes("2 weeks ago")).toBe(20160);
  });

  it("sorts an unparseable time as old rather than as new", () => {
    // A string nobody predicted should not be rewarded with the top of the feed.
    expect(ageMinutes("whenever")).toBeGreaterThan(ageMinutes("2 weeks ago"));
  });

  it("parses every time string in the fixtures", () => {
    const unknown = ageMinutes("whenever");
    for (const contribution of OPINIONS) {
      expect(ageMinutes(contribution.time), contribution.time).toBeLessThan(unknown);
    }
  });
});

/* --------------------------------------------------------------- filters */

describe("rich is a filter, not a tab", () => {
  it("narrows the same list rather than splitting it", () => {
    const list = [standard({ id: "a" }), pro({ id: "b" })];
    expect(filterContributions(list, "All")).toHaveLength(2);
    expect(filterContributions(list, "Rich").map((o) => o.id)).toEqual(["b"]);
  });

  it("filters Pro contributions by sentiment like anything else", () => {
    const list = [
      pro({ id: "b", vote: "Negative" }),
      standard({ id: "a", vote: "Positive" }),
    ];
    expect(filterContributions(list, "Negative").map((o) => o.id)).toEqual(["b"]);
  });
});

/* ---------------------------------------------------- interactive blocks */

describe("embedded interactions stay on their contribution", () => {
  const block: InteractiveBlock = {
    id: "b1",
    kind: "poll",
    prompt: "Which half?",
    options: [
      { id: "first", label: "First", count: 30 },
      { id: "second", label: "Second", count: 10 },
    ],
  };

  it("adds the viewer's answer at display time without writing it into the fixture", () => {
    const before = blockResults(block, undefined);
    expect(before.map((o) => o.count)).toEqual([30, 10]);
    const after = blockResults(block, "second");
    expect(after.map((o) => o.count)).toEqual([30, 11]);
    // The stored block is untouched — the same reason votes work this way
    // everywhere else in this build.
    expect(block.options.map((o) => o.count)).toEqual([30, 10]);
  });

  it("computes shares that add up", () => {
    const results = blockResults(block, undefined);
    expect(results.reduce((sum, o) => sum + o.pct, 0)).toBe(100);
    expect(blockTotal(block, "first")).toBe(41);
  });

  it("reports no share rather than dividing by zero on an unanswered block", () => {
    const empty: InteractiveBlock = {
      id: "b2",
      kind: "rating",
      prompt: "How well?",
      options: [{ id: "a", label: "1", count: 0 }],
    };
    expect(blockResults(empty, undefined)[0]!.pct).toBe(0);
    expect(blockTotal(empty, undefined)).toBe(0);
  });

  it("gives every seeded block a prompt and at least two options", () => {
    // A one-option block measures nothing, and an unlabelled one asks nothing.
    for (const contribution of PRO_CONTRIBUTIONS) {
      for (const section of orderedSections(contribution)) {
        if (section.type !== "interactive") continue;
        expect(section.block.prompt.length, contribution.id).toBeGreaterThan(8);
        expect(section.block.options.length, contribution.id).toBeGreaterThanOrEqual(2);
        for (const option of section.block.options) {
          expect(option.label.length, option.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps block ids unique inside a contribution", () => {
    // Responses are keyed `contributionId:blockId`. A repeat would make two
    // blocks share one answer.
    for (const contribution of PRO_CONTRIBUTIONS) {
      const ids = orderedSections(contribution)
        .filter((s) => s.type === "interactive")
        .map((s) => (s.type === "interactive" ? s.block.id : ""));
      expect(new Set(ids).size, contribution.id).toBe(ids.length);
    }
  });

  it("carries no field that could reach the topic's numbers", () => {
    // Structural, not behavioural: an InteractiveBlock has a prompt and some
    // options, and nothing that names a topic, a poll or a sentiment. There is
    // no field here for a future aggregate to read by mistake.
    for (const contribution of PRO_CONTRIBUTIONS) {
      for (const section of orderedSections(contribution)) {
        if (section.type !== "interactive") continue;
        expect(Object.keys(section.block).sort()).toEqual([
          "id",
          "kind",
          "options",
          "prompt",
        ]);
      }
    }
  });
});

/* ------------------------------------------------------- quality signals */

describe("quality signals", () => {
  it("counts a considered reply and ignores a '+1'", () => {
    const signals = qualitySignals(
      pro({ helpful: 20, saves: 3 }),
      [{ text: "agreed" }, { text: "This misses the service-network point entirely, which is the one that decides it." }],
      12,
      0,
    );
    expect(signals.meaningfulReplies).toBe(1);
    expect(signals.upvotes).toBe(20);
    expect(signals.saves).toBe(3);
    expect(signals.blockParticipation).toBe(12);
  });

  it("has no field for posting volume", () => {
    // The one thing a reward system must never pay for. Absent by
    // construction rather than by policy.
    const signals = qualitySignals(pro(), [], 0, 0);
    expect(Object.keys(signals)).not.toContain("posts");
    expect(Object.keys(signals)).not.toContain("contributions");
  });
});

/* ----------------------------------------------------------------- accent */

describe("category accents", () => {
  it("gives every category an accent", () => {
    for (const topic of allTopics()) {
      expect(categoryAccent(topic.cat), topic.cat).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
