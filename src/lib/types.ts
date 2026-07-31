/**
 * Domain types for OpinionHQ.
 *
 * These mirror the models described in docs/ProjectBrief.md §8–§15 and the
 * Prisma schema sketched in docs/OpinionHQ-Technical-Roadmap.md §2. The
 * prototype reads them from fixtures in `src/lib/sample-data`; the production
 * build will read the same shapes from Postgres.
 */

export type Sentiment = "Positive" | "Neutral" | "Negative";

/** The finalized OpinionHQ topic taxonomy. */
export type CategoryId =
  | "entertainment"
  | "brands"
  | "sports"
  | "technology"
  | "events"
  | "national-politics"
  | "policies"
  | "politicians"
  | "colleges"
  | "exams"
  | "careers"
  | "food"
  | "controversies"
  // Catch-all for subjects that genuinely fit nothing above. Reserved for
  // participant-created topics and polls; editors do not publish into it.
  | "other";

export type CategoryFilterId = "All" | CategoryId;

export interface Category {
  id: CategoryId;
  label: string;
  /** Short label used where horizontal room is tight (chips, ticker). */
  short: string;
  blurb: string;
  /**
   * True for the catch-all: no editor-published fixtures live here, and it is
   * only reachable by someone creating a topic or poll that fits nothing else.
   */
  reserved?: boolean;
}

export type SortId =
  | "trending"
  | "discussed"
  | "recent"
  | "positive"
  | "negative"
  | "polarizing"
  | "participation";

/** Lifecycle labels an editor can set on a topic (brief §10). */
export type StatusId =
  | "Proposed"
  | "Upcoming"
  | "Ongoing"
  | "Live"
  | "Announced"
  | "Under Investigation"
  | "Disputed"
  | "Confirmed"
  | "Resolved"
  | "Completed"
  | "Cancelled"
  | "Delayed"
  | "Inactive";

/**
 * What the 7-day change actually measures. Kept explicit so a card never shows
 * a bare arrow: "up" on negative sentiment and "up" on participation mean very
 * different things and must not share a colour.
 */
export type ChangeMetric =
  | "negative-sentiment"
  | "positive-sentiment"
  | "participation"
  | "discussion"
  | "trending";

export interface MetricChange {
  metric: ChangeMetric;
  /** Magnitude in percent; direction is carried separately. */
  value: number;
  direction: "up" | "down";
}

/**
 * Which set of category-specific opinion dimensions a topic asks. Defined
 * here rather than in `facets.ts` so the data layer does not depend on it.
 */
export type FacetSetId =
  | "film"
  | "series"
  | "brand"
  | "sports"
  | "gadget"
  | "platform"
  | "event"
  | "national-politics"
  | "policy"
  | "politician"
  | "college"
  | "exam"
  | "career"
  | "controversy"
  | "food"
  | "general";

/**
 * Verified, editor-maintained record of a subject under discussion.
 * Never mixes with participant-generated content (brief §5.4).
 */
export interface Topic {
  id: string;
  name: string;
  cat: CategoryId;
  status: StatusId;
  /**
   * Aspects written for this specific topic — the questions worth asking about
   * *this* film or *this* exam, not just its category. Falls back to the
   * category's generic set when absent (see `facetSet`).
   */
  aspects?: Facet[];
  /** Category-level fallback question set, used when `aspects` is absent. */
  facetSet?: FacetSetId;
  /** Set on topics created in-app by a participant rather than by an editor. */
  createdBy?: string;
  createdAt?: string;
  /** One or two lines for the card: what it is and why people are talking. */
  summary: string;
  /** Longer editor-written context shown under the name on the dashboard. */
  about: string;
  /** Free-text tags, searchable alongside name/category/summary. */
  tags: string[];
  /** Sentiment shares as whole percentages. Always sums to 100. */
  pos: number;
  neu: number;
  neg: number;
  participants: number;
  /** Server-computed trending score, 0–100 (brief §31). */
  trend: number;
  /** Lower is more recently updated; used by the "Recently updated" sort. */
  recency: number;
  updated: string;
  change: MetricChange;
}

/** A participant's written explanation attached to their vote (brief §8.2). */
export interface Opinion {
  id: string;
  topicId: string;
  name: string;
  initials: string;
  vote: Sentiment;
  text: string;
  time: string;
  helpful: number;
  replies: number;
  thread?: Reply[];
}

/** A single-level reply under a written opinion (brief §9). */
export interface Reply {
  name: string;
  initials: string;
  text: string;
  time: string;
}

/** An editor-published, sourced development (brief §11). */
export interface TimelineEvent {
  id: string;
  topicId: string;
  date: string;
  title: string;
  desc: string;
  /** Human-readable publisher name for the source reference. */
  src: string;
  status: StatusId;
}

/**
 * Chart annotation placing a verified development onto the sentiment trend.
 * `left` is the horizontal position along the 30-day axis; the vertical row is
 * assigned by the renderer so markers never collide.
 */
export interface TrendMarker {
  left: string;
  label: string;
}

/** Editor-written status context shown beside the topic status badge. */
export interface TopicContext {
  updated: string;
  explain: string;
  markers: TrendMarker[];
}

/* ----------------------------------------------------------------- aspects */

/**
 * Aspects — the sub-opinions under the headline vote.
 *
 * A plain up/neutral/down vote says very little about a film or an exam, so
 * every topic carries a handful of one-click questions of its own. Editors
 * (and, later, an extraction agent) write them per topic; the category set is
 * only a fallback (brief §8.1 extension).
 */
export interface FacetOption {
  id: string;
  label: string;
  /** How this answer rolls into the overall sentiment aggregate. */
  tone: Sentiment;
}

export interface Facet {
  id: string;
  label: string;
  prompt: string;
  options: FacetOption[];
}

export interface FacetTally extends FacetOption {
  pct: number;
  count: number;
}

export interface FacetResult {
  facet: Facet;
  tallies: FacetTally[];
  responses: number;
  /** The option with the largest share. */
  leading: FacetTally;
}

/* -------------------------------------------------------------------- polls */

/**
 * Polling — the second product mode.
 *
 * A topic asks "how do you feel about this?" and answers on a sentiment
 * scale. A poll asks "which of these two?" and forces a choice. The two never
 * share an aggregate: a head-to-head split is not a sentiment distribution.
 */
export type PollSideId = "a" | "b";

export interface PollSide {
  id: PollSideId;
  name: string;
  /** One line on what this option actually is, or the case for it. */
  blurb: string;
  votes: number;
}

export interface Poll {
  id: string;
  /** The head-to-head itself, phrased as a question. */
  question: string;
  cat: CategoryId;
  status: StatusId;
  summary: string;
  about: string;
  tags: string[];
  a: PollSide;
  b: PollSide;
  /** Editor-set close date, or "Open-ended". */
  closes: string;
  /**
   * How far individual segments swing from the headline split, in percentage
   * points. Some questions divide the country (chai vs coffee); others get the
   * same answer from everyone. Defaults to a moderate spread.
   */
  spread?: number;
  /**
   * Pins the A-side share for named regions, as whole percentages.
   *
   * Derived swings are fine when nobody knows the real pattern, but on some
   * questions the geography is common knowledge — a South Indian reader seeing
   * "Tamil Nadu: 94% chai" would rightly stop trusting every other number on
   * the page. Editors override those rows explicitly.
   */
  regionOverrides?: Record<string, number>;
  trend: number;
  recency: number;
  updated: string;
}

/** A participant's written reason for their pick. Polls have no threads. */
export interface PollReason {
  id: string;
  pollId: string;
  side: PollSideId;
  name: string;
  initials: string;
  text: string;
  time: string;
  helpful: number;
}

/** How one segment of the audience split between the two options. */
export interface PollSplitRow {
  label: string;
  /** This segment's share of all voters. */
  share: number;
  voters: number;
  aPct: number;
  bPct: number;
  leans: PollSideId | "even";
}

export interface DecoratedPollSide extends PollSide {
  pct: number;
  color: string;
  votesLabel: string;
  reasonCount: number;
}

export interface DecoratedPoll extends Poll {
  category: Category;
  /** True when nobody has voted yet — a 0/0 split is not a dead heat. */
  unvoted: boolean;
  /**
   * True when there are votes but far too few to describe. One vote is not a
   * landslide, and cross-tabs off a single voter would be fabrication.
   */
  smallSample: boolean;
  sides: [DecoratedPollSide, DecoratedPollSide];
  total: number;
  totalLabel: string;
  totalShort: string;
  leader: DecoratedPollSide;
  trailer: DecoratedPollSide;
  /** Percentage-point gap between the two options. */
  margin: number;
  marginLabel: string;
  /** "Too close to call" … "Landslide". */
  verdict: string;
  /** Accessible one-line description of the split bar. */
  splitLabel: string;
  regions: PollSplitRow[];
  ageGroups: PollSplitRow[];
  occupations: PollSplitRow[];
  /** The segment that disagrees most with the overall result. */
  contrarian: PollSplitRow | null;
  reasonCount: number;
  demographicOptIn: number;
}

/* -------------------------------------------------------------- aggregates */

export interface DistributionRow {
  label: string;
  pct: number;
  count: number;
}

export interface GeoRow extends DistributionRow {
  /** Negative share within this region, as a whole percentage. */
  negativeShare: number;
  lean: "leans negative" | "leans positive" | "mixed";
}

export interface ArcDash {
  dash: string;
  offset: string;
}

/** A topic plus every value derived from it for presentation. */
export interface DecoratedTopic extends Topic {
  category: Category;
  /** True when nobody has voted yet — every headline string reads differently. */
  unrated: boolean;
  dominant: Sentiment | "Split" | "Unrated";
  dominantPct: number;
  dominantColor: string;
  /** e.g. "78% Negative" — readable without an icon. */
  headlineMetric: string;
  sentimentLabel: string;
  participantsLabel: string;
  participantsShort: string;
  sampleLabel: string;
  barsLabel: string;
  changeLabel: string;
  changeColor: string;
  changeArrow: string;
  /** 0–100. Higher means the split between positive and negative is tighter. */
  polarization: number;
  polarizationWord: string;
  posCount: number;
  neuCount: number;
  negCount: number;
  writtenCount: number;
  writtenLine: string;
  negArc: ArcDash;
  neuArc: ArcDash;
  posArc: ArcDash;
  negPath: string;
  posPath: string;
  participationBars: number[];
  geo: GeoRow[];
  ageGroups: DistributionRow[];
  occupations: DistributionRow[];
  demographicOptIn: number;
  facets: FacetResult[];
}
