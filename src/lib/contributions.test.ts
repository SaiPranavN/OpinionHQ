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
  compareBySort,
  isExplained,
  MIN_EXPLANATION,
  SORTS,
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
import { TEST_PRO_CONTRIBUTIONS } from "@/lib/test-support/fixtures";
import { TEST_OPINIONS } from "@/lib/test-support/fixtures";
import { testTopics } from "@/lib/test-support/fixtures";
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

  it("gives every seeded contribution a unique id across both formats", () => {
    // Replies and helpful marks are keyed by this id. A collision would join
    // two people's threads together.
    const ids = TEST_OPINIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("attaches every seeded Pro contribution to a real topic", () => {
    const topics = new Set(testTopics().map((t) => t.id));
    for (const contribution of TEST_PRO_CONTRIBUTIONS) {
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

describe("ranking", () => {
  it("puts a quiet Pro contribution above a well-received standard one", () => {
    // THIS TEST IS THE REVERSE OF WHAT IT USED TO ASSERT, and the inversion is
    // the product decision, not a regression: Pro buys placement now. The cost
    // is exactly what this case demonstrates — 900 helpful marks and 40 replies
    // lose to a Pro post nobody has engaged with — and it is written as the
    // assertion so that anybody who dislikes it can see the trade in one place
    // and flip `PRO_FIRST`.
    const loud = standard({ helpful: 900, replies: 40 });
    const quiet = pro({ helpful: 12, replies: 0 });
    expect(sortContributions([loud, quiet], "relevant")[0]!.id).toBe(quiet.id);
  });

  it("keeps relevanceScore itself a pure engagement measure", () => {
    // The boost is applied in the sort, never folded into the score. A score
    // that silently included it would look like a measurement of what readers
    // did and would not be one.
    const a = standard({ id: "a", helpful: 50, replies: 4, dislikes: 2 });
    const b = pro({ id: "b", helpful: 50, replies: 4, dislikes: 2 });
    expect(relevanceScore(a)).toBe(relevanceScore(b));
  });

  it("ranks Pro against Pro on engagement alone", () => {
    const busy = pro({ id: "busy", helpful: 200, replies: 10 });
    const idle = pro({ id: "idle", helpful: 1, replies: 0 });
    expect(sortContributions([idle, busy], "relevant")[0]!.id).toBe("busy");
  });

  it("leaves the explicit sorts factual", () => {
    // Somebody who asks for "most upvoted" is asking a question of fact and
    // gets an answer of fact, whoever is paying.
    const loud = standard({ id: "loud", helpful: 900, replies: 40 });
    const quiet = pro({ id: "quiet", helpful: 12, replies: 0 });
    expect(sortContributions([quiet, loud], "upvoted")[0]!.id).toBe("loud");
    expect(sortContributions([quiet, loud], "discussed")[0]!.id).toBe("loud");
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
    for (const contribution of TEST_PRO_CONTRIBUTIONS) {
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
    for (const contribution of TEST_PRO_CONTRIBUTIONS) {
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
    for (const contribution of TEST_PRO_CONTRIBUTIONS) {
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
      pro({ helpful: 20, dislikes: 3 }),
      [{ text: "agreed" }, { text: "This misses the service-network point entirely, which is the one that decides it." }],
      12,
      0,
    );
    expect(signals.meaningfulReplies).toBe(1);
    expect(signals.upvotes).toBe(20);
    expect(signals.downvotes).toBe(3);
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
    for (const topic of testTopics()) {
      expect(categoryAccent(topic.cat), topic.cat).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

/* ------------------------------------------------------------ the new sorts */

describe("the abbreviated ages the product actually renders", () => {
  /**
   * `relativeTime` has always produced "3d ago", "45m ago", "2h ago" — and
   * none of them parsed. Every contribution tied at ten years old, which
   * silently broke two things: "Newest" ordered nothing, and the decay in
   * `relevanceScore` divided by a constant. The long forms below were the only
   * ones that ever worked, and nothing generates them.
   */
  it("reads the short forms", () => {
    expect(ageMinutes("45m ago")).toBe(45);
    expect(ageMinutes("2h ago")).toBe(120);
    expect(ageMinutes("3d ago")).toBe(4320);
    expect(ageMinutes("2w ago")).toBe(20160);
    expect(ageMinutes("3mo ago")).toBe(131400);
    expect(ageMinutes("1y ago")).toBe(525600);
  });

  it("does not read months as minutes", () => {
    // The whole reason the alternation is ordered longest-first.
    expect(ageMinutes("3mo ago")).toBeGreaterThan(ageMinutes("3m ago"));
    expect(ageMinutes("3 months ago")).toBe(ageMinutes("3mo ago"));
  });

  it("still reads the long forms, and still distrusts nonsense", () => {
    expect(ageMinutes("20 minutes ago")).toBe(20);
    expect(ageMinutes("2 days ago")).toBe(2880);
    expect(ageMinutes("whenever")).toBeGreaterThan(ageMinutes("1y ago"));
  });
});

describe("ordering", () => {
  const at = (minutesAgo: number) =>
    new Date(Date.now() - minutesAgo * 60_000).toISOString();

  it("prefers the exact timestamp over the rounded label", () => {
    // Both render "3d ago", so the label alone cannot separate them.
    const morning = standard({ id: "morning", time: "3d ago", createdAt: at(4400) });
    const evening = standard({ id: "evening", time: "3d ago", createdAt: at(4320) });
    expect(sortContributions([morning, evening], "newest")[0]!.id).toBe("evening");
    expect(sortContributions([morning, evening], "oldest")[0]!.id).toBe("morning");
  });

  it("orders by downvotes, which no ordering used to expose", () => {
    const liked = standard({ id: "liked", helpful: 40, dislikes: 1 });
    const rejected = standard({ id: "rejected", helpful: 2, dislikes: 30 });
    expect(sortContributions([liked, rejected], "downvoted")[0]!.id).toBe("rejected");
    expect(sortContributions([liked, rejected], "upvoted")[0]!.id).toBe("liked");
  });

  it("treats a missing dislike count as none rather than as unknown", () => {
    const none = standard({ id: "none" });
    const some = standard({ id: "some", dislikes: 3 });
    expect(sortContributions([none, some], "downvoted")[0]!.id).toBe("some");
  });

  it("newest and oldest are exact reverses", () => {
    const list = [
      standard({ id: "a", createdAt: at(10) }),
      standard({ id: "b", createdAt: at(500) }),
      standard({ id: "c", createdAt: at(90) }),
    ];
    expect(sortContributions(list, "newest").map((o) => o.id)).toEqual(
      [...sortContributions(list, "oldest")].reverse().map((o) => o.id),
    );
  });

  it("offers a comparator for every label it advertises", () => {
    // A label with no comparator is a dropdown entry that silently does
    // nothing, which is exactly what "Newest" was before the age fix.
    const list = [
      standard({ id: "a", helpful: 3, dislikes: 1, replies: 5, createdAt: at(10) }),
      standard({ id: "b", helpful: 9, dislikes: 4, replies: 0, createdAt: at(900) }),
    ];
    for (const option of SORTS) {
      expect(sortContributions(list, option.id), option.label).toHaveLength(2);
    }
  });

  it("sorts a poll reason with the same code as an opinion", () => {
    // `compareBySort` is generic so the two lists cannot drift. A reason has no
    // `format`, so it never carries the Pro boost.
    const reasons = [
      { id: "quiet", time: "1h ago", helpful: 1, dislikes: 0, replies: 0 },
      { id: "loud", time: "1h ago", helpful: 20, dislikes: 0, replies: 0 },
    ];
    expect([...reasons].sort(compareBySort("upvoted"))[0]!.id).toBe("loud");
  });
});

describe("a vote needs a reason", () => {
  it("refuses what is not an explanation", () => {
    expect(isExplained("")).toBe(false);
    expect(isExplained(".")).toBe(false);
    expect(isExplained("   \n  ")).toBe(false);
    // Whitespace does not count towards the floor.
    expect(isExplained(" ".repeat(MIN_EXPLANATION))).toBe(false);
  });

  it("accepts something somebody actually typed", () => {
    expect(isExplained("Too expensive for what it is")).toBe(true);
    expect(isExplained("a".repeat(MIN_EXPLANATION))).toBe(true);
  });
});
