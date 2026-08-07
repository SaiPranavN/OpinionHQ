/**
 * Domain types for OpinionHQ.
 *
 * These mirror the models described in docs/ProjectBrief.md §8–§15 and the
 * Prisma schema sketched in docs/OpinionHQ-Technical-Roadmap.md §2. The
 * prototype reads them from fixtures in `src/lib/sample-data`; the production
 * build will read the same shapes from Postgres.
 */

import type { PlaceId } from "@/lib/places";

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
  | "places"
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
  /**
   * Somewhere you go: a hotel, a monument, a hill station, a beach. Distinct
   * from `food`, which rates a meal — a place is judged on the whole visit,
   * and its worst dimension (crowding, upkeep, what it costs once you are
   * inside) is usually the one nobody warns you about.
   */
  | "place"
  | "general";

/**
 * Verified, editor-maintained record of a subject under discussion.
 * Never mixes with participant-generated content (brief §5.4).
 */
export interface Topic {
  /**
   * The routable identifier — what `/topics/[slug]` carries.
   *
   * In Postgres this is `topics.slug`, not the primary key. Every link, export
   * and breadcrumb in the app already reads this field, so mapping the slug onto
   * it is what let the database land without rewriting them; `uuid` below is the
   * row identity, and only code that writes needs it.
   */
  id: string;
  /** The database primary key. Absent on fixtures, which have no row. */
  uuid?: string;
  name: string;
  cat: CategoryId;
  /**
   * Where this applies. Required, and `"worldwide"` is how you say "nowhere in
   * particular" — see `lib/places.ts` for why that is a statement rather than a
   * blank.
   */
  place: PlaceId;
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
  /**
   * Of those participants, how many wrote something.
   *
   * Carried on the record rather than counted from the opinions themselves,
   * because `decorate` is a pure function of one topic and counting would mean
   * it had to reach for a table. In Postgres this is `topic_stats.written_count`,
   * maintained by trigger; in the fixtures it is filled in where the topic is
   * assembled. Absent means none.
   */
  written?: number;
  /** Server-computed trending score, 0–100 (brief §31). */
  trend: number;
  /** Lower is more recently updated; used by the "Recently updated" sort. */
  recency: number;
  updated: string;
  change: MetricChange;
}

/* --------------------------------------------------------- contributions */

/**
 * How a contribution was written.
 *
 * Absent means `standard`. That is deliberate rather than lazy: every opinion
 * written before Pro existed is a standard opinion, and a model where the old
 * records are already valid needs no migration and cannot half-migrate.
 */
export type ContributionFormat = "standard" | "pro";

/** The six section kinds a Pro contribution can be built from. */
export type ProSectionType =
  | "headline"
  | "quick_take"
  | "breakdown"
  | "key_points"
  | "interactive"
  | "final_verdict";

/** One choice inside an interactive block, with the responses already on it. */
export interface InteractiveOption {
  id: string;
  label: string;
  /** Responses recorded before this visitor. Simulated on seeded fixtures. */
  count: number;
}

export type InteractiveKind =
  | "poll"
  | "rating"
  | "rank"
  | "scenario"
  | "agree_challenge"
  | "verdict";

/**
 * The interaction embedded in one Pro contribution.
 *
 * ITS RESULTS ARE NOT THE TOPIC'S RESULTS. A block belongs to the contribution
 * that carries it and to nothing else — it never touches the topic's sentiment
 * split, its participation count, or any poll in the Polls section. One
 * contributor's embedded question is that contributor's question; folding it
 * into the topic aggregate would let anybody move the headline number by
 * wording a block to get the answer they wanted.
 */
export interface InteractiveBlock {
  id: string;
  kind: InteractiveKind;
  prompt: string;
  options: InteractiveOption[];
}

interface ProSectionBase {
  id: string;
  /** Order within the contribution. The composer rewrites these on reorder. */
  position: number;
}

/**
 * One block of a Pro contribution.
 *
 * A union rather than one shape with every field optional, so a renderer that
 * forgets a kind fails to compile instead of rendering an empty box.
 */
export type ProSection =
  | (ProSectionBase & {
      type: "headline" | "quick_take" | "breakdown" | "final_verdict";
      text: string;
    })
  | (ProSectionBase & { type: "key_points"; points: string[] })
  | (ProSectionBase & { type: "interactive"; block: InteractiveBlock });

/** Reactions available on Pro contributions only (brief §13). */
export type ProReaction = "insightful" | "useful" | "well_explained";

/**
 * A contribution to a topic — the one shared model.
 *
 * Named `Opinion` because that is what it has always been and what every
 * fixture, reply and helpful-mark already references; `format` is the only
 * thing that distinguishes a Pro contribution from a standard one. There is no
 * second table, no second feed and no second reply system, which is the whole
 * point: Opinions and Discussion are two views over this array, and a Pro post
 * is a row in it.
 */
export interface Opinion {
  id: string;
  topicId: string;
  name: string;
  initials: string;
  vote: Sentiment;
  /** The standard body. On a Pro contribution this is the summary line. */
  text: string;
  time: string;
  helpful: number;
  replies: number;
  thread?: Reply[];

  /* ---- Pro. All absent on a standard opinion. ---- */
  format?: ContributionFormat;
  /** Ordered blocks. Only a `headline` section is required to publish. */
  sections?: ProSection[];
  /** Author's role line, shown under the name on a Pro card. */
  authorLine?: string;
  /**
   * Independently verified expertise, shown *separately* from the Pro label.
   * Paying for better tools is not evidence of knowing anything, so the two
   * claims are never merged into one badge (brief §14).
   */
  verifiedLabel?: string;
  saves?: number;
  reactions?: Partial<Record<ProReaction, number>>;
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
  /**
   * Where the claim can be checked.
   *
   * Optional because a development can be sourced to a publisher that has no
   * stable link — a broadcast, a printed notice. Absent renders the name
   * without a link rather than a link that goes nowhere, which is the more
   * honest of the two: "sourced to The Hindu" is a checkable claim even when
   * this build cannot hand you the page.
   */
  srcUrl?: string;
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
/** Positional ids, in the order the author wrote the options. */
export type PollOptionId = "a" | "b" | "c" | "d";

/** A poll asks between two and four options — never one, never five. */
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 4;

export interface PollOption {
  id: PollOptionId;
  name: string;
  /** One line on what this option actually is, or the case for it. */
  blurb: string;
  votes: number;
}

/**
 * One reading of a poll's split, on one date.
 *
 * `pcts` is aligned with `poll.options` by index and sums to 100 — the same
 * contract the cross-tab rows use, so a reader comparing the two is comparing
 * like with like.
 */
export interface PollHistoryPoint {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  pcts: number[];
  /**
   * What happened around this reading, when something did. Rendered as a
   * marker on the chart. A movement with a reason attached is worth something;
   * a wiggle with no explanation is noise dressed as a finding.
   */
  event?: string;
}

export interface Poll {
  /** The slug — what every route and link in the app already carries. */
  id: string;
  /**
   * The database primary key, when this poll came from the database.
   *
   * `id` holds the slug so existing links keep working, so writes that have to
   * name a row read this instead. Absent on a poll built in a test.
   */
  uuid?: string;
  /** The choice itself, phrased as a question. */
  question: string;
  cat: CategoryId;
  /**
   * Where this applies. Part of the duplicate signature (`lib/signature.ts`):
   * the same choice put to two different electorates is two different polls.
   */
  place: PlaceId;
  status: StatusId;
  summary: string;
  about: string;
  tags: string[];
  /** Two to four, in the order they are shown. */
  options: PollOption[];
  /** Editor-set close date, or "Open-ended". */
  closes: string;
  /**
   * How the audience actually divided, per segment.
   *
   * Absent until somebody has voted. This replaced a `spread` knob that fed a
   * seeded swing: the knob controlled how divisive the *invented* cross-tabs
   * looked, which is a dial for how convincing a fabrication is. There is no
   * such dial on a measurement.
   */
  audience?: PollAudience;
  /** Written reasons per option, counted. Options with none are absent. */
  reasonCounts?: Partial<Record<PollOptionId, number>>;
  /**
   * Share of voters who supplied any demographics, as a whole percentage.
   *
   * The audience panel states this in its footnote, so it has to be counted.
   * It was `54 + (participants % 11)` — a plausible-looking number that made
   * the invention underneath it read as a methodology note.
   */
  demographicOptIn?: number;
  /**
   * How the split moved over time, oldest first.
   *
   * Optional and deliberately NOT derived. Every other aggregate in this file
   * can be computed from the current counts, but a past reading cannot —
   * inventing a plausible curve from today's numbers would put a chart of
   * measurements on screen where no measurement was ever taken. A poll with no
   * recorded history says so and draws nothing.
   */
  history?: PollHistoryPoint[];
  trend: number;
  recency: number;
  updated: string;
}

/** A participant's written reason for their pick. Polls have no threads. */
export interface PollReason {
  id: string;
  pollId: string;
  side: PollOptionId;
  name: string;
  initials: string;
  text: string;
  time: string;
  helpful: number;
}

/**
 * Real cross-tabs, measured from the votes actually cast.
 *
 * Empty arrays are meaningful and common: a poll can be too young to break
 * down, or every segment can fall under the suppression floor that
 * `public.poll_audience` applies. The panels then draw nothing — which is the
 * whole difference between "nobody has measured this" and a swing invented
 * from the headline that reconciles perfectly and describes no one.
 *
 * Shares can total less than 100. A voter placed at a country rather than
 * inside a state belongs to no region row, and saying so is more honest than
 * scaling the rows up to hide it.
 */
export interface PollAudience {
  regions: PollSplitRow[];
  ageGroups: PollSplitRow[];
  occupations: PollSplitRow[];
}

/** How one segment of the audience divided across the options. */
export interface PollSplitRow {
  label: string;
  /** This segment's share of all voters. */
  share: number;
  voters: number;
  /** Per-option percentages, aligned with `poll.options`. Sums to 100. */
  pcts: number[];
  /** The option this segment favoured, or "even" on an exact tie. */
  leans: PollOptionId | "even";
  /** Percentage points between this segment's top two. */
  margin: number;
}

/**
 * `color` is the literal fill — bars, dots, the PDF. `textColor` is the same
 * identity as a theme variable, for when the option's colour is set in type.
 */
export interface DecoratedPollOption extends PollOption {
  pct: number;
  color: string;
  textColor: string;
  votesLabel: string;
  reasonCount: number;
}

export interface DecoratedPoll extends Poll {
  category: Category;
  /** Resolved from `place`, so a card never has to import the registry. */
  placeLabel: string;
  /** "Karnataka, India" — the containing places, outermost last. */
  placeContext: string;
  /** True when nobody has voted yet — a 0/0 split is not a dead heat. */
  unvoted: boolean;
  /**
   * True when there are votes but far too few to describe. One vote is not a
   * landslide, and cross-tabs off a single voter would be fabrication.
   */
  smallSample: boolean;
  /** Decorated options in author order. */
  options: DecoratedPollOption[];
  /** The same options sorted by share, highest first. */
  ranked: DecoratedPollOption[];
  total: number;
  totalLabel: string;
  totalShort: string;
  leader: DecoratedPollOption;
  runnerUp: DecoratedPollOption;
  /** Percentage-point gap between the top two options. */
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
  /** Resolved from `place`, so a card never has to import the registry. */
  placeLabel: string;
  /** "Karnataka, India" — the containing places, outermost last. */
  placeContext: string;
  /** True when nobody has voted yet — every headline string reads differently. */
  unrated: boolean;
  dominant: Sentiment | "Split" | "Unrated";
  dominantPct: number;
  /** Literal hex. For the PDF export, which has no CSS engine. */
  dominantColor: string;
  /** The same colour as a theme variable. For anything rendered in the DOM. */
  dominantVar: string;
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
