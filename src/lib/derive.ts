/**
 * Presentation-layer derivations over an `Topic`.
 *
 * In production every aggregate here (sentiment shares, participation series,
 * polarization, facet tallies) is computed server-side and never trusted from
 * the client (brief §30–31). This module only turns already-computed
 * aggregates into the strings, colours and SVG geometry the UI renders.
 */

import { DEFAULT_FACET_SET, FACET_SETS } from "@/lib/facets";
import { placeContext, placeLabel } from "@/lib/places";
import {
  categoryOf,
  SENTIMENT_COLOR,
  sentimentVar,
  SPLIT_COLOR,
} from "@/lib/taxonomy";
import type {
  ArcDash,
  ChangeMetric,
  DecoratedTopic,
  Topic,
  Facet,
  FacetResult,
  FacetTally,
  MetricChange,
  Sentiment,
} from "@/lib/types";

export const POSITIVE = SENTIMENT_COLOR.Positive;
export const NEUTRAL = SENTIMENT_COLOR.Neutral;
export const NEGATIVE = SENTIMENT_COLOR.Negative;

/** Neutral accent for activity metrics that carry no verdict of their own. */
export const ACTIVITY = "#5AA9F0";
/** Used when a rise is unwelcome but not a failure. */
export const CAUTION = "#F0A83C";

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}

/** Compact form for tight spaces: 27,410 → "27.4K". */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 100_000).toFixed(1)}L`;
}

export function sentimentColor(sentiment: Sentiment): string {
  return SENTIMENT_COLOR[sentiment];
}

export function sentimentIcon(sentiment: Sentiment): string {
  return sentiment === "Positive" ? "▲" : sentiment === "Negative" ? "▼" : "●";
}

/* ------------------------------------------------------------ 7-day change */

const CHANGE_COPY: Record<ChangeMetric, (dir: "up" | "down", v: string) => string> = {
  "negative-sentiment": (dir, v) => `Negative sentiment ${dir} ${v}% this week`,
  "positive-sentiment": (dir, v) => `Positive sentiment ${dir} ${v}% this week`,
  participation: (dir, v) => `Participation ${dir} ${v}% this week`,
  discussion: (dir, v) => `Discussion activity ${dir} ${v}% in 7 days`,
  trending: (dir, v) => `Trending score ${dir} ${v}% this week`,
};

/**
 * Colour follows meaning, not direction: rising negative sentiment is red even
 * though the arrow points up, and rising participation is a neutral accent
 * because more people voting is neither good news nor bad.
 */
function changeColor(change: MetricChange): string {
  switch (change.metric) {
    case "negative-sentiment":
      return change.direction === "up" ? NEGATIVE : POSITIVE;
    case "positive-sentiment":
      return change.direction === "up" ? POSITIVE : CAUTION;
    default:
      return ACTIVITY;
  }
}

export function changeLabel(change: MetricChange): string {
  return CHANGE_COPY[change.metric](change.direction, change.value.toFixed(1));
}

/* --------------------------------------------------------- chart geometry */

/** Circumference of the r=80 donut used by the sentiment chart. */
const CIRCUMFERENCE = 2 * Math.PI * 80;

/** A 3px visual gap keeps adjacent donut segments readable. */
const SEGMENT_GAP = 3;

export function arc(pct: number, precedingPct: number): ArcDash {
  const filled = Math.max((pct / 100) * CIRCUMFERENCE - SEGMENT_GAP, 0);
  return {
    dash: `${filled.toFixed(1)} ${(CIRCUMFERENCE - filled).toFixed(1)}`,
    offset: (-((precedingPct / 100) * CIRCUMFERENCE)).toFixed(1),
  };
}

/* ---------------------------------------------------------------- facets */

/**
 * Aspects written for this topic, falling back to the category set only when
 * nobody has written topic-specific questions yet.
 */
export function facetsFor(topic: Topic): Facet[] {
  if (topic.aspects && topic.aspects.length > 0) return topic.aspects;
  const setId = topic.facetSet ?? DEFAULT_FACET_SET[topic.cat];
  return FACET_SETS[setId] ?? [];
}

/**
 * What people actually answered, per aspect.
 *
 * COUNTED, NOT DERIVED. This used to start each option from its tone's share of
 * the topic's headline sentiment and jitter it — so a film "loved for its
 * visuals and disliked for its writing" got a plausible spread that was really
 * just the overall mood wearing four different hats. It also invented a
 * response rate (`0.52 + seed % 26 / 100`) so later questions appeared to have
 * fewer answers, which is true of real discussions and was not true of this
 * data.
 *
 * The guard that existed — zero participants, or a locally-created topic —
 * covered the two cases where the invention was most obviously wrong and left
 * it running everywhere else.
 *
 * Absent tallies now mean zero, and zero renders as an unanswered question.
 */
function facetResults(topic: Topic): FacetResult[] {
  const tallies = topic.facetTallies ?? {};

  return facetsFor(topic).map((facet) => {
    const counts = tallies[facet.id] ?? {};
    const responses = Object.values(counts).reduce((sum, n) => sum + n, 0);

    const rows: FacetTally[] = facet.options.map((option) => ({
      ...option,
      count: counts[option.id] ?? 0,
      pct: 0,
    }));

    if (responses > 0) {
      // Largest remainder, so the column totals exactly 100 — the same
      // arithmetic the sentiment split uses, since a reader comparing the two
      // is comparing like with like.
      const exact = rows.map((row) => (row.count / responses) * 100);
      const floors = exact.map((v) => Math.floor(v));
      let remainder = 100 - floors.reduce((sum, v) => sum + v, 0);
      const order = exact
        .map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((x, y) => y.frac - x.frac);
      for (const { i } of order) {
        if (remainder <= 0) break;
        floors[i] = floors[i]! + 1;
        remainder -= 1;
      }
      rows.forEach((row, i) => {
        row.pct = floors[i] ?? 0;
      });
    }

    const leading = rows.reduce((best, t) => (t.count > best.count ? t : best), rows[0]!);
    return { facet, tallies: rows, responses, leading };
  });
}

/* -------------------------------------------------------------- decorate */

export function decorate(topic: Topic): DecoratedTopic {
  // A just-created topic has no aggregate to describe. Everything downstream
  // reads the same fields, so the empty case is handled once, here.
  const unrated = topic.participants === 0;
  // One vote is a data point, not a week-over-week trend.
  const noTrend = topic.participants < 2 || topic.change.value === 0;
  const isSplit = !unrated && topic.pos === topic.neg && topic.pos >= topic.neu;

  const dominantSentiment: Sentiment =
    topic.neg >= topic.pos && topic.neg >= topic.neu
      ? "Negative"
      : topic.pos >= topic.neu
        ? "Positive"
        : "Neutral";

  const dominant = unrated ? "Unrated" : isSplit ? "Split" : dominantSentiment;
  const dominantPct = isSplit
    ? topic.pos
    : dominantSentiment === "Negative"
      ? topic.neg
      : dominantSentiment === "Positive"
        ? topic.pos
        : topic.neu;
  const dominantColor =
    unrated || isSplit ? SPLIT_COLOR : sentimentColor(dominantSentiment);
  // The same colour as a theme variable. The PDF exports need the literal
  // above (jsPDF cannot resolve a var()); anything rendering it as text in the
  // browser needs this one, or the headline is unreadable on a light page.
  const dominantVar =
    unrated || isSplit ? "var(--color-soft)" : sentimentVar(dominantSentiment);

  // 2 × min(pos, neg): peaks at 100 when the two poles are equal and large.
  const polarization = topic.pos + topic.neg - Math.abs(topic.pos - topic.neg);
  const writtenCount = topic.written ?? 0;

  return {
    ...topic,
    category: categoryOf(topic.cat),
    placeLabel: placeLabel(topic.place),
    placeContext: placeContext(topic.place),
    dominant,
    dominantPct,
    dominantColor,
    dominantVar,
    unrated,
    headlineMetric: unrated
      ? "No votes yet"
      : isSplit
        ? `Split ${topic.pos}/${topic.neg}`
        : `${dominantPct}% ${dominantSentiment}`,
    sentimentLabel: unrated
      ? "No votes recorded yet"
      : `Positive ${topic.pos}% · Neutral ${topic.neu}% · Negative ${topic.neg}%`,
    participantsLabel: unrated
      ? "Be the first to vote"
      : `${formatNumber(topic.participants)} ${topic.participants === 1 ? "participant" : "participants"}`,
    participantsShort: unrated
      ? "Be the first to vote"
      : `${formatCompact(topic.participants)} participants`,
    sampleLabel: unrated
      ? "with no votes recorded yet"
      : `of ${formatNumber(topic.participants)} OpinionHQ participants`,
    barsLabel: unrated
      ? "No sentiment recorded yet"
      : `Sentiment: ${topic.pos} percent positive, ${topic.neu} percent neutral, ${topic.neg} percent negative, of ${formatNumber(topic.participants)} participants`,
    changeLabel: unrated
      ? "No activity recorded yet"
      : noTrend
        ? "Not enough history for a weekly trend"
        : changeLabel(topic.change),
    changeColor: unrated || noTrend ? "#8F8C86" : changeColor(topic.change),
    // Empty when there is no trend to point at — an arrow would claim one.
    changeArrow: unrated || noTrend ? "" : topic.change.direction === "up" ? "▲" : "▼",
    polarization,
    polarizationWord:
      polarization > 70
        ? "Highly divided"
        : polarization > 45
          ? "Moderately divided"
          : "Broad agreement",
    posCount: Math.round((topic.participants * topic.pos) / 100),
    neuCount: Math.round((topic.participants * topic.neu) / 100),
    negCount: Math.round((topic.participants * topic.neg) / 100),
    writtenCount,
    writtenLine:
      writtenCount > 0
        ? `${formatNumber(writtenCount)} written ${writtenCount === 1 ? "opinion" : "opinions"}`
        : "no written opinions yet",
    negArc: arc(topic.neg, 0),
    neuArc: arc(topic.neu, topic.neg),
    posArc: arc(topic.pos, topic.neg + topic.neu),
    // Measured, or nothing at all. See the note on `TopicAudience`.
    geo: topic.audience?.geo ?? [],
    ageGroups: topic.audience?.ageGroups ?? [],
    occupations: topic.audience?.occupations ?? [],
    demographicOptIn: topic.demographicOptIn ?? 0,
    facets: facetResults(topic),
  };
}
