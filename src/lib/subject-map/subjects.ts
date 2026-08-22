/**
 * The one shape the subject map draws.
 *
 * A topic and a poll are different instruments — a sentiment distribution is
 * not a race between named options, and nothing here may blur that. What they
 * share is being a circle on a map: a title, a place in the spiral, arcs
 * around a circumference, a link to a dashboard. This module flattens each
 * into that shape *without* losing the distinction: the arcs carry their own
 * labels and colours, the empty state carries its own words, and no poll
 * option is ever described in sentiment vocabulary.
 *
 * Pure functions over decorated rows, so the mapping is testable and the
 * components never reach into `DecoratedTopic` or `DecoratedPoll` themselves.
 */

import { SENTIMENT_COLOR } from "@/lib/taxonomy";
import { formatNumber } from "@/lib/derive";
import type { CategoryId, DecoratedPoll, DecoratedTopic, StatusId } from "@/lib/types";

export interface RingSegment {
  key: string;
  /** "Positive", or the poll option's name. Never invented. */
  label: string;
  /** Whole percentage of the circumference. The segments sum to 100. */
  pct: number;
  /** Literal colour — data colours stay put across themes (see globals.css). */
  color: string;
  /** The same identity as a theme variable, for text. */
  textColor: string;
}

export interface MapSubject {
  id: string;
  kind: "topic" | "poll";
  title: string;
  cat: CategoryId;
  categoryLabel: string;
  categoryShort: string;
  status: StatusId;
  placeLabel: string;
  summary: string;
  href: string;
  /** Creation time in ms since epoch; 0 when unknown (sorts oldest). */
  createdKey: number;
  /** Real participant / vote count. */
  total: number;
  totalLabel: string;
  /** True when nobody has voted — no arcs, no ring, no percentages. */
  unvoted: boolean;
  /**
   * The single result line a circle can afford: "68% Positive" for a topic,
   * "62% Weekly episodes" for a poll, and the empty-state wording when there
   * is nothing to report. One line rather than a legend, because a circle has
   * least room exactly where a multi-row legend needs most.
   */
  leadLabel: string;
  /** Theme variable for `leadLabel`. Muted when there is nothing to lead. */
  leadColor: string;
  /** Arcs in drawing order. Empty exactly when `unvoted`. */
  segments: RingSegment[];
  /**
   * The surface accent: a literal colour when one side genuinely leads, null
   * on a tie or with no votes — a neutral dark circle is the honest tint for
   * a result that has not picked a side.
   */
  accent: string | null;
  /** One line a screen reader gets: title, category, status, distribution. */
  aria: string;
  /** "Open dashboard" / "Cast your vote". */
  actionLabel: string;
}

const parseCreated = (iso?: string): number => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

/* ------------------------------------------------------------------ topics */

const SENTIMENT_TEXT_VAR = {
  Positive: "var(--color-positive)",
  Neutral: "var(--color-neutral)",
  Negative: "var(--color-negative)",
} as const;

export function topicSubject(topic: DecoratedTopic): MapSubject {
  const segments: RingSegment[] = topic.unrated
    ? []
    : (
        [
          { key: "pos", label: "Positive", pct: topic.pos, color: SENTIMENT_COLOR.Positive, textColor: SENTIMENT_TEXT_VAR.Positive },
          { key: "neu", label: "Neutral", pct: topic.neu, color: SENTIMENT_COLOR.Neutral, textColor: SENTIMENT_TEXT_VAR.Neutral },
          { key: "neg", label: "Negative", pct: topic.neg, color: SENTIMENT_COLOR.Negative, textColor: SENTIMENT_TEXT_VAR.Negative },
        ] as RingSegment[]
      ).filter((s) => s.pct > 0);

  // A tint only when one sentiment genuinely leads. "Split" and "Unrated" are
  // already the derivation's words for "no majority", so they are trusted here
  // rather than re-deciding from the counts.
  const accent =
    topic.dominant === "Positive"
      ? SENTIMENT_COLOR.Positive
      : topic.dominant === "Negative"
        ? SENTIMENT_COLOR.Negative
        : topic.dominant === "Neutral"
          ? SENTIMENT_COLOR.Neutral
          : null;

  return {
    id: topic.id,
    kind: "topic",
    title: topic.name,
    cat: topic.cat,
    categoryLabel: topic.category.label,
    categoryShort: topic.category.short,
    status: topic.status,
    placeLabel: topic.placeLabel,
    summary: topic.summary,
    href: `/topics/${topic.id}`,
    createdKey: parseCreated(topic.createdAt),
    total: topic.participants,
    totalLabel: topic.unrated
      ? "No opinions yet"
      : `${formatNumber(topic.participants)} ${topic.participants === 1 ? "participant" : "participants"}`,
    unvoted: topic.unrated,
    // `headlineMetric` is already the derivation's own phrasing — "68%
    // Negative", "Split 45/45", "No votes yet" — so the map states the result
    // in exactly the words the dashboard does rather than inventing a second
    // vocabulary for the same measurement.
    leadLabel: topic.unrated ? "No opinions yet" : topic.headlineMetric,
    leadColor: topic.unrated ? "var(--color-dim)" : topic.dominantVar,
    segments,
    accent,
    aria: `${topic.name} — ${topic.category.label}, ${topic.status}. ${topic.sentimentLabel}.`,
    actionLabel: "Open dashboard",
  };
}

/* ------------------------------------------------------------------- polls */

export function pollSubject(poll: DecoratedPoll): MapSubject {
  const segments: RingSegment[] = poll.unvoted
    ? []
    : poll.options
        .map((option) => ({
          key: option.id,
          label: option.name,
          pct: option.pct,
          color: option.color,
          textColor: option.textColor,
        }))
        .filter((s) => s.pct > 0);

  // The leading option may tint the surface — but only when it actually
  // leads. An exact tie or an empty poll keeps a neutral dark circle, because
  // implying a leader is inventing one.
  const tied = !poll.unvoted && poll.margin === 0;
  const accent = poll.unvoted || tied ? null : poll.leader.color;

  const distribution = poll.unvoted
    ? "No votes yet"
    : poll.splitLabel;

  return {
    id: poll.id,
    kind: "poll",
    title: poll.question,
    cat: poll.cat,
    categoryLabel: poll.category.label,
    categoryShort: poll.category.short,
    status: poll.status,
    placeLabel: poll.placeLabel,
    summary: poll.summary,
    href: `/polls/${poll.id}`,
    createdKey: parseCreated(poll.createdAt),
    total: poll.total,
    totalLabel: poll.unvoted
      ? "No votes yet"
      : `${formatNumber(poll.total)} ${poll.total === 1 ? "vote" : "votes"}`,
    unvoted: poll.unvoted,
    // The leading option BY NAME — never "positive", never a sentiment word.
    // A dead heat says so rather than picking whichever option was authored
    // first and calling it the leader.
    leadLabel: poll.unvoted
      ? "No votes yet"
      : tied
        ? "Dead heat"
        : `${poll.leader.pct}% ${poll.leader.name}`,
    leadColor: poll.unvoted || tied ? "var(--color-dim)" : poll.leader.textColor,
    segments,
    accent,
    aria: `${poll.question} — ${poll.category.label}, ${poll.status}. ${distribution}.`,
    actionLabel: "Cast your vote",
  };
}

/* -------------------------------------------------------------- ring arcs */

export interface RingArc extends RingSegment {
  /** SVG stroke-dasharray over a pathLength of 100. */
  dash: string;
  /** SVG stroke-dashoffset over the same normalised length. */
  offset: number;
  /** Whether this arc is long enough to wear rounded caps. */
  rounded: boolean;
}

/** Gap between adjacent arcs, in hundredths of the circumference. */
const ARC_GAP = 2.5;

/**
 * Turns segments into dash geometry over a normalised circumference of 100,
 * starting at 12 o'clock (the SVG rotates -90° for that). One segment fills
 * the whole ring gapless — a unanimous result is a complete circle, not a
 * circle with a notch cut from it.
 */
export function ringArcs(segments: readonly RingSegment[]): RingArc[] {
  if (segments.length === 0) return [];
  if (segments.length === 1) {
    const only = segments[0]!;
    return [{ ...only, dash: "100 0", offset: 0, rounded: false }];
  }

  // Every arc gives up half a gap at each end; tiny arcs are floored at a
  // sliver rather than removed, so a 1% option still visibly exists.
  let cursor = 0;
  return segments.map((segment) => {
    const raw = segment.pct - ARC_GAP;
    const filled = Math.max(raw, 0.75);
    const start = cursor + ARC_GAP / 2;
    cursor += segment.pct;
    return {
      ...segment,
      dash: `${filled.toFixed(2)} ${(100 - filled).toFixed(2)}`,
      offset: -Number(start.toFixed(2)),
      rounded: filled >= 6,
    };
  });
}
