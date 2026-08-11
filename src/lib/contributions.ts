/**
 * Contribution logic — ordering, filtering, section shape, block arithmetic.
 *
 * Everything here is pure and works on the shared `Opinion` model, so a Pro
 * contribution and a standard opinion go through exactly the same code on
 * their way into the feed. That is the enforcement behind "one conversation":
 * there is no branch anywhere below that asks what format something is before
 * deciding how highly to rank it.
 */

import type {
  InteractiveBlock,
  Opinion,
  ProReaction,
  ProSection,
  ProSectionType,
  Sentiment,
} from "@/lib/types";

/* ------------------------------------------------------------ predicates */

export function isPro(contribution: Opinion): boolean {
  return contribution.format === "pro";
}

export function orderedSections(contribution: Opinion): ProSection[] {
  if (!contribution.sections) return [];
  return [...contribution.sections].sort((a, b) => a.position - b.position);
}

export function sectionOfType(
  contribution: Opinion,
  type: ProSectionType,
): ProSection | undefined {
  return orderedSections(contribution).find((s) => s.type === type);
}

export function headlineOf(contribution: Opinion): string {
  const section = sectionOfType(contribution, "headline");
  return section && section.type === "headline" ? section.text : "";
}

/**
 * Whether a draft can be published.
 *
 * One rule: a headline. Everything else is optional, because a contributor who
 * has one sharp paragraph should not be made to invent a breakdown and three
 * key points to be allowed to post it.
 */
export function isPublishable(sections: ProSection[]): boolean {
  const headline = sections.find((s) => s.type === "headline");
  return Boolean(headline && headline.type === "headline" && headline.text.trim().length >= 8);
}

/** Sections a contributor may add. Headline is not here — it always exists. */
export const OPTIONAL_SECTIONS: {
  type: ProSectionType;
  label: string;
  hint: string;
}[] = [
  { type: "quick_take", label: "Quick take", hint: "One or two lines. The answer, before the argument." },
  { type: "breakdown", label: "Detailed breakdown", hint: "The reasoning. Blank lines separate paragraphs." },
  { type: "key_points", label: "Key points", hint: "The things worth remembering, one per line." },
  { type: "interactive", label: "Interactive block", hint: "Ask the room something. Results stay on this post." },
  { type: "final_verdict", label: "Final verdict", hint: "Where you land, in a sentence." },
];

/* ------------------------------------------------------------------ time */

/**
 * Approximate age in minutes, parsed from the display string.
 *
 * The prototype stores "3 hours ago" rather than a timestamp, and inventing a
 * real `createdAt` for a hundred fixtures would be inventing data. Parsing the
 * label is honest about what it is: good enough to order a feed, and never
 * presented as a precise time.
 *
 * Anything unrecognised sorts as old rather than as new. A string nobody
 * predicted should not be rewarded with the top of the list.
 */
const UNIT_MINUTES: Record<string, number> = {
  minute: 1,
  min: 1,
  hour: 60,
  hr: 60,
  day: 1440,
  week: 10080,
  month: 43800,
  year: 525600,
};

const OLD = 525_600 * 10;

export function ageMinutes(time: string): number {
  const label = time.trim().toLowerCase();
  if (!label) return OLD;
  if (label.startsWith("just now") || label === "now") return 0;
  const match = label.match(/(\d+)\s*(minute|min|hour|hr|day|week|month|year)/);
  if (!match) return OLD;
  const value = Number(match[1]);
  const unit = UNIT_MINUTES[match[2]!];
  if (!Number.isFinite(value) || unit === undefined) return OLD;
  return value * unit;
}

/* --------------------------------------------------------------- ranking */

export type ContributionSort = "relevant" | "upvoted" | "discussed" | "newest";

export const SORTS: { id: ContributionSort; label: string }[] = [
  { id: "relevant", label: "Most relevant" },
  { id: "upvoted", label: "Most upvoted" },
  { id: "discussed", label: "Most discussed" },
  { id: "newest", label: "Newest" },
];

/**
 * Relevance.
 *
 * NOTE WHAT IS NOT AN INPUT: the format. A Pro subscription buys better
 * publishing tools, not a better position, and the moment ranking reads
 * `format` the feed stops being a record of what people think and becomes a
 * list of who paid. A well-argued standard opinion with real engagement
 * outranks a quiet Pro post, and a test in `derive.test.ts` holds that.
 *
 * Replies and saves are weighted above helpful marks because they cost more:
 * a helpful tap is a second, a considered reply is a minute, and saving
 * something is a statement that you expect to come back to it.
 *
 * The decay is gentle — a day-old contribution should slip, not vanish, since
 * topics here run for weeks and the best read on one is often not the newest.
 */
export function relevanceScore(contribution: Opinion): number {
  const engagement =
    contribution.helpful +
    contribution.replies * 3 +
    (contribution.saves ?? 0) * 4 +
    reactionTotal(contribution) * 2;
  const hours = ageMinutes(contribution.time) / 60;
  return engagement / Math.pow(hours + 3, 0.35);
}

export function reactionTotal(contribution: Opinion): number {
  const reactions = contribution.reactions;
  if (!reactions) return 0;
  return (Object.values(reactions) as number[]).reduce((sum, n) => sum + (n || 0), 0);
}

export function sortContributions(
  list: Opinion[],
  sort: ContributionSort,
): Opinion[] {
  const copy = [...list];
  switch (sort) {
    case "upvoted":
      return copy.sort((a, b) => b.helpful - a.helpful);
    case "discussed":
      return copy.sort((a, b) => b.replies - a.replies);
    case "newest":
      return copy.sort((a, b) => ageMinutes(a.time) - ageMinutes(b.time));
    case "relevant":
      return copy.sort((a, b) => relevanceScore(b) - relevanceScore(a));
  }
}

/* --------------------------------------------------------------- filters */

/**
 * "Rich" is a filter, never a tab.
 *
 * Somebody who wants to read only the worked-through posts can ask for them,
 * and that is a legitimate reading mode. Giving them a permanent tab of their
 * own would be the same thing as ranking them higher, one level up — the
 * conversation would split, and the standard opinions would become the
 * leftovers.
 */
export type ContributionFilter = "All" | Sentiment | "Rich";

export const FILTERS: ContributionFilter[] = [
  "All",
  "Positive",
  "Neutral",
  "Negative",
  "Rich",
];

export function filterContributions(
  list: Opinion[],
  filter: ContributionFilter,
): Opinion[] {
  if (filter === "All") return list;
  if (filter === "Rich") return list.filter(isPro);
  return list.filter((o) => o.vote === filter);
}

export function filterLabel(filter: ContributionFilter): string {
  return filter === "Rich" ? "Rich contributions" : filter;
}

/* ------------------------------------------------------------- collapsed */

/** Key points shown before "Read full contribution". */
export const COLLAPSED_KEY_POINTS = 3;

/**
 * What the Opinions tab shows before the card is expanded.
 *
 * Headline, quick take, a few key points, the interactive block and the
 * verdict — the shape of the argument without its full weight. The breakdown
 * is what gets held back, because it is the one section that can run for
 * paragraphs and a feed where every third card is an essay is a feed nobody
 * scrolls.
 *
 * The block stays in the collapsed view deliberately: it is the part a reader
 * can act on in one tap, and burying it behind "read more" would make it
 * decoration.
 */
export function collapsedSections(sections: ProSection[]): {
  shown: ProSection[];
  hiddenSections: number;
  hiddenPoints: number;
} {
  const ordered = [...sections].sort((a, b) => a.position - b.position);
  let hiddenSections = 0;
  let hiddenPoints = 0;

  const shown = ordered.flatMap<ProSection>((section) => {
    if (section.type === "breakdown") {
      hiddenSections += 1;
      return [];
    }
    if (section.type === "key_points" && section.points.length > COLLAPSED_KEY_POINTS) {
      hiddenPoints += section.points.length - COLLAPSED_KEY_POINTS;
      return [{ ...section, points: section.points.slice(0, COLLAPSED_KEY_POINTS) }];
    }
    return [section];
  });

  return { shown, hiddenSections, hiddenPoints };
}

/** Whether collapsing this contribution actually hides anything. */
export function hasMoreToRead(sections: ProSection[]): boolean {
  const { hiddenSections, hiddenPoints } = collapsedSections(sections);
  return hiddenSections > 0 || hiddenPoints > 0;
}

/* ------------------------------------------------------- interactive blocks */

export const BLOCK_KIND_LABEL: Record<InteractiveBlock["kind"], string> = {
  poll: "Poll",
  rating: "Rating",
  rank: "Rank the factors",
  scenario: "Scenario choice",
  agree_challenge: "Agree or challenge",
  verdict: "Community verdict",
};

/**
 * Block results, with the viewer's own response folded in at display time.
 *
 * Held apart from the stored counts for the same reason votes are everywhere
 * else in this build: a seeded number is somebody else's, and one of them is
 * never you.
 */
export function blockResults(
  block: InteractiveBlock,
  myChoice: string | undefined,
): { id: string; label: string; count: number; pct: number; mine: boolean }[] {
  const counts = block.options.map((option) => ({
    ...option,
    count: Math.max(option.count, 0) + (myChoice === option.id ? 1 : 0),
    mine: myChoice === option.id,
  }));
  const total = counts.reduce((sum, o) => sum + o.count, 0);
  return counts.map((option) => ({
    id: option.id,
    label: option.label,
    count: option.count,
    pct: total === 0 ? 0 : Math.round((option.count / total) * 100),
    mine: option.mine,
  }));
}

export function blockTotal(
  block: InteractiveBlock,
  myChoice: string | undefined,
): number {
  return blockResults(block, myChoice).reduce((sum, o) => sum + o.count, 0);
}

/* ------------------------------------------------------- quality signals */

/**
 * The signals a future creator-reward system would read (brief §15).
 *
 * Deliberately computed here and deliberately not rendered anywhere. Keeping
 * the calculation out of the card means the day somebody wires payouts to it,
 * they change one function rather than auditing a component tree — and it
 * means nothing here can quietly start being displayed as a score.
 *
 * Volume is absent by construction. There is no `posts` field, because the one
 * thing you must never pay for is posting.
 */
export interface QualitySignals {
  contributionId: string;
  upvotes: number;
  saves: number;
  reactions: Partial<Record<ProReaction, number>>;
  meaningfulReplies: number;
  blockParticipation: number;
  reports: number;
}

/** A reply short enough to be a "+1" is not a discussion. */
const MEANINGFUL_REPLY_CHARS = 40;

export function qualitySignals(
  contribution: Opinion,
  replies: { text: string }[],
  blockParticipation: number,
  reports: number,
): QualitySignals {
  return {
    contributionId: contribution.id,
    upvotes: contribution.helpful,
    saves: contribution.saves ?? 0,
    reactions: contribution.reactions ?? {},
    meaningfulReplies: replies.filter(
      (r) => r.text.trim().length >= MEANINGFUL_REPLY_CHARS,
    ).length,
    blockParticipation,
    reports,
  };
}
