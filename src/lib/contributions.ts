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
 * Relevance — how much a contribution has earned its place.
 *
 * Engagement only. Format is deliberately not in this number, because this is
 * the measure of what readers actually did with a post, and it stays that way
 * so `sortContributions` can apply the Pro boost separately and visibly rather
 * than baking it into a score that reads like a neutral measurement.
 *
 * Replies are weighted above likes because they cost more: a like is a second
 * and a considered reply is a minute.
 *
 * DISLIKES SUBTRACT, and only down to zero. A contribution people actively
 * disagree with should not climb on the strength of the argument it started —
 * but it should not be pushed below one nobody read at all, which is what an
 * uncapped negative would do.
 *
 * The decay is gentle — a day-old contribution should slip, not vanish, since
 * topics here run for weeks and the best read on one is often not the newest.
 */
export function relevanceScore(contribution: Opinion): number {
  const engagement = Math.max(
    contribution.helpful - (contribution.dislikes ?? 0) + contribution.replies * 3,
    0,
  );
  const hours = ageMinutes(contribution.time) / 60;
  return engagement / Math.pow(hours + 3, 0.35);
}

/**
 * PRO CONTRIBUTIONS SORT ABOVE STANDARD ONES IN THE DEFAULT FEED.
 *
 * This reverses what this file used to say, and the previous rule was argued
 * for at length, so here is the change and its cost stated plainly rather than
 * quietly deleted:
 *
 *   Until now, ranking never read `format`. The reasoning was that the moment
 *   it does, the feed stops being a record of what people think and becomes a
 *   list of who paid. That reasoning has not become wrong. It has been
 *   overruled as a product decision, because Pro has to be visibly worth
 *   subscribing to and placement is what people are buying.
 *
 * WHAT IT COSTS, so nobody has to discover it in production: a brand-new Pro
 * contribution with no engagement at all now sits above the best-argued
 * standard opinion on the page. On a busy topic with many members, the
 * community's strongest reply can end up below a stack of quiet Pro posts.
 *
 * TO SOFTEN IT, change `PRO_FIRST` to false and multiply the score instead —
 * `relevanceScore(c) * (isPro(c) ? 2.5 : 1)` gives Pro a real lift that a
 * genuinely popular standard opinion can still beat. That is one line here and
 * nothing anywhere else, which is the reason the boost lives in the sort rather
 * than inside `relevanceScore`.
 *
 * The explicit sorts are untouched. Somebody who asks for "most upvoted" is
 * asking a factual question and gets a factual answer.
 */
export const PRO_FIRST = true;

/** Pro first, then by what readers did with it. */
function byBoostedRelevance(a: Opinion, b: Opinion): number {
  if (PRO_FIRST) {
    const tier = Number(isPro(b)) - Number(isPro(a));
    if (tier !== 0) return tier;
  }
  return relevanceScore(b) - relevanceScore(a);
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
      return copy.sort(byBoostedRelevance);
  }
}

/**
 * The same boost, for replies under a contribution.
 *
 * Replies carry no `format` of their own — a reply is a reply — so the lift
 * follows the person: a reply written by a Pro member rises within its thread.
 * Threading is preserved regardless, since reordering across depth levels would
 * detach answers from what they answer.
 */
export function sortReplies<T extends { proAuthor?: boolean; likes?: number }>(
  replies: T[],
): T[] {
  return [...replies].sort((a, b) => {
    if (PRO_FIRST) {
      const tier = Number(Boolean(b.proAuthor)) - Number(Boolean(a.proAuthor));
      if (tier !== 0) return tier;
    }
    return (b.likes ?? 0) - (a.likes ?? 0);
  });
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
  downvotes: number;
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
    downvotes: contribution.dislikes ?? 0,
    meaningfulReplies: replies.filter(
      (r) => r.text.trim().length >= MEANINGFUL_REPLY_CHARS,
    ).length,
    blockParticipation,
    reports,
  };
}
