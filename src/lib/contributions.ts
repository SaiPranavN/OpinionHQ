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

/**
 * The shortest thing that counts as an explanation.
 *
 * A WRITTEN REASON IS NOW REQUIRED TO VOTE, on topics and on polls both, at the
 * product owner's direction. What that costs is worth stating rather than
 * discovering: every vote is now more expensive to cast, and some people who
 * would have clicked Positive and moved on will close the tab instead. The
 * split will be measured over a smaller, more deliberate sample. That is the
 * trade — fewer votes, none of them silent.
 *
 * The floor exists because "mandatory" with no length is a rule satisfied by a
 * full stop. Ten characters is about two words: low enough not to be a wall,
 * high enough that clearing it means having typed something.
 *
 * ENFORCED IN POSTGRES, not here. `cast_vote` and `vote_and_explain` both
 * refuse a shorter body, so a hand-rolled request is refused too; this constant
 * is what the composer uses to say so before the refusal. `schema-sync.test.ts`
 * holds the two numbers level.
 */
export const MIN_EXPLANATION = 10;

/** Whether this draft may be submitted with a vote. */
export function isExplained(text: string): boolean {
  return text.trim().length >= MIN_EXPLANATION;
}

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
 * A fallback, not the mechanism. Anything that came out of Postgres carries a
 * real `createdAt` and is ordered by that; this is for the one row that has no
 * timestamp yet — the copy of a reason held in the browser between writing it
 * and the page refetching.
 *
 * IT UNDERSTANDS THE ABBREVIATED FORMS, and that is a fix rather than an
 * addition. `relativeTime` in lib/topics/rows.ts has always rendered "3d ago",
 * "45m ago", "2h ago", and none of those matched — every one of them fell
 * through to `OLD`. Two things were quietly broken by that: the "Newest" sort
 * did nothing at all, because every contribution tied at ten years old, and the
 * decay in `relevanceScore` divided by a constant, so an hour-old post and a
 * month-old post ranked purely on engagement. The only strings that ever
 * matched were the long forms nothing generates.
 *
 * Anything still unrecognised sorts as old rather than as new. A string nobody
 * predicted should not be rewarded with the top of the list.
 */
const UNIT_MINUTES: Record<string, number> = {
  minute: 1,
  min: 1,
  m: 1,
  hour: 60,
  hr: 60,
  h: 60,
  day: 1440,
  d: 1440,
  week: 10080,
  w: 10080,
  month: 43800,
  mo: 43800,
  year: 525600,
  y: 525600,
};

/**
 * Longest first, because the alternation is ordered and `m` would otherwise
 * swallow the `m` of `mo` and read three months as three minutes.
 */
const UNIT_PATTERN =
  /(\d+)\s*(minutes?|mins?|months?|hours?|hrs?|weeks?|years?|days?|mo|m|h|d|w|y)\b/;

const OLD = 525_600 * 10;

export function ageMinutes(time: string): number {
  const label = time.trim().toLowerCase();
  if (!label) return OLD;
  if (label.startsWith("just now") || label === "now") return 0;
  const match = label.match(UNIT_PATTERN);
  if (!match) return OLD;
  const value = Number(match[1]);
  const unit = UNIT_MINUTES[match[2]!.replace(/s$/, "")];
  if (!Number.isFinite(value) || unit === undefined) return OLD;
  return value * unit;
}

/**
 * How old something is, preferring the timestamp over the label.
 *
 * Every row from the database has `createdAt`, which is exact; the label is
 * rounded to whole days once a post is a day old, so ordering by it ties every
 * contribution written on the same day and calls the result "Newest".
 */
export function ageOf(item: { time: string; createdAt?: string }): number {
  if (item.createdAt) {
    const ms = Date.parse(item.createdAt);
    if (Number.isFinite(ms)) return Math.max((Date.now() - ms) / 60_000, 0);
  }
  return ageMinutes(item.time);
}

/* --------------------------------------------------------------- ranking */

export type ContributionSort =
  | "relevant"
  | "upvoted"
  | "downvoted"
  | "discussed"
  | "newest"
  | "oldest";

/**
 * Every ordering the product offers, in one list.
 *
 * Shared by the opinions tab, the discussion tab and the poll reason columns,
 * so the three cannot drift into offering different answers to the same
 * question. "Most commented" rather than "Most discussed": the number under it
 * is a reply count, and naming it after what is counted is one less thing to
 * work out.
 *
 * MOST DOWNVOTED IS A REAL OPTION and not an oversight. It surfaces what the
 * room rejected, which is the half of a discussion that ranking normally
 * buries — and on a site whose whole claim is showing disagreement, an
 * ordering that can only ever show approval would be an odd omission.
 */
export const SORTS: { id: ContributionSort; label: string }[] = [
  { id: "relevant", label: "Most relevant" },
  { id: "upvoted", label: "Most upvoted" },
  { id: "downvoted", label: "Most downvoted" },
  { id: "discussed", label: "Most commented" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
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
export function relevanceScore(contribution: Sortable): number {
  const engagement = Math.max(
    contribution.helpful - (contribution.dislikes ?? 0) + (contribution.replies ?? 0) * 3,
    0,
  );
  const hours = ageOf(contribution) / 60;
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

/**
 * Ordering, for anything with likes, dislikes, replies and an age.
 *
 * Generic over the shape rather than over `Opinion`, because a poll reason is
 * the same object under a different name and the two lists had no business
 * sorting by different code. Only `relevant` needs a full contribution, so it
 * is the one branch that asks for one.
 */
export interface Sortable {
  time: string;
  createdAt?: string;
  helpful: number;
  dislikes?: number;
  replies?: number;
}

export function compareBySort<T extends Sortable>(
  sort: ContributionSort,
): (a: T, b: T) => number {
  switch (sort) {
    // No Pro boost here. The lift is applied by `sortContributions`, which is
    // the only caller that has a `format` to read — a poll reason has no format
    // and inventing one to keep the two paths symmetrical would be inventing a
    // ranking rule nobody asked for.
    case "relevant":
      return (a, b) => relevanceScore(b) - relevanceScore(a);
    case "upvoted":
      return (a, b) => b.helpful - a.helpful;
    case "downvoted":
      return (a, b) => (b.dislikes ?? 0) - (a.dislikes ?? 0);
    case "discussed":
      return (a, b) => (b.replies ?? 0) - (a.replies ?? 0);
    case "newest":
      return (a, b) => ageOf(a) - ageOf(b);
    case "oldest":
      return (a, b) => ageOf(b) - ageOf(a);
  }
}

export function sortContributions(
  list: Opinion[],
  sort: ContributionSort,
): Opinion[] {
  const copy = [...list];
  return sort === "relevant"
    ? copy.sort(byBoostedRelevance)
    : copy.sort(compareBySort(sort));
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
