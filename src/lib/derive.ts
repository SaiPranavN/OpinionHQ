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
import { opinionsFor } from "@/lib/sample-data/opinions";
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
  DistributionRow,
  Topic,
  Facet,
  FacetResult,
  FacetTally,
  GeoRow,
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

/** Small deterministic hash so fixture-derived numbers are stable per topic. */
function seedOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100_003;
  }
  return hash;
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

/** Chart viewBox the trend series is expressed in. */
export const TREND_VIEWBOX = { width: 800, height: 260 } as const;

/**
 * The 30-day sentiment trend as points in the 800x260 chart viewBox.
 * The curve eases from `from` to `to` with a small deterministic wobble so the
 * line reads as sampled data rather than a straight interpolation.
 *
 * Exposed as points, not just a path string, so the PDF export can redraw the
 * identical series with vector primitives instead of re-parsing SVG.
 */
export function trendPoints(from: number, to: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    // The wobble tapers to nothing at both ends, so the line starts and ends on
    // the values it claims to. It used to carry the full wobble at t=1, which
    // left the last point a couple of points off the headline share — invisible
    // until the chart became hoverable and started reading the figure out.
    const wobble = Math.sin(i * 1.7) * 1.8 * Math.sin(Math.PI * t);
    // Clamped to a real share. On a topic with a large weekly swing the eased
    // start could land outside 0–100, drawing a line below the baseline and
    // reading out "-3% negative". A share is never negative and never over 100.
    const value = Math.min(
      Math.max(from + (to - from) * (t * t * 0.55 + t * 0.45) + wobble, 0),
      100,
    );
    points.push({ x: i * 57.14, y: 240 - (value / 100) * 200 });
  }
  return points;
}

/** The series as whole-percentage values, for read-outs and axis labels. */
export function trendValues(from: number, to: number): number[] {
  return trendPoints(from, to).map((p) => Math.round(((240 - p.y) / 200) * 100));
}

export function trendPath(from: number, to: number): string {
  const points = trendPoints(from, to).map(
    (p) => `${p.x.toFixed(0)} ${p.y.toFixed(1)}`,
  );
  return `M${points.join(" L")}`;
}

/** 30 daily participation bars as percentage heights, trending upward. */
export function participationBars(seed: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 30; i++) {
    const base = 34 + Math.abs(Math.sin((i + seed) * 1.37)) * 52;
    const recentLift = i > 21 ? (i - 21) * 3.4 : 0;
    out.push(Math.min(base + recentLift, 100));
  }
  return out;
}

/* ---------------------------------------------------------- audience mix */

/**
 * Baseline region mix, roughly tracking where India's online population sits.
 * Each topic jitters these deterministically so dashboards differ from one
 * another without any region landing somewhere implausible.
 */
const REGION_BASELINE: readonly { name: string; weight: number }[] = [
  { name: "Maharashtra", weight: 18 },
  { name: "Uttar Pradesh", weight: 16 },
  { name: "Delhi NCR", weight: 15 },
  { name: "Karnataka", weight: 14 },
  { name: "Tamil Nadu", weight: 12 },
  { name: "West Bengal", weight: 10 },
];

const OTHER_REGIONS = "Other states";

/** Share reserved for regions too small to list individually. */
const OTHER_REGIONS_SHARE = 12;

function geoRows(topic: Topic): GeoRow[] {
  const seed = topic.participants % 13;

  const jittered = REGION_BASELINE.map(({ name, weight }, i) => ({
    name,
    // ±3 points, deterministic per topic and region.
    weight: Math.max(4, weight + (((i * 5 + seed) % 7) - 3)),
  })).sort((a, b) => b.weight - a.weight);

  // Rescale the named regions onto the share left over by "Other states", then
  // hand any rounding remainder to the smallest one so the column totals 100.
  const namedTarget = 100 - OTHER_REGIONS_SHARE;
  const rawTotal = jittered.reduce((sum, r) => sum + r.weight, 0);
  let assigned = 0;
  const named = jittered
    .map((region, i) => {
      if (i === jittered.length - 1) {
        return { ...region, weight: namedTarget - assigned };
      }
      const weight = Math.round((region.weight / rawTotal) * namedTarget);
      assigned += weight;
      return { ...region, weight };
    })
    // Re-sort: the remainder handed to the last region can nudge it above its
    // neighbour, and a column that is not monotonically descending reads wrong.
    .sort((a, b) => b.weight - a.weight);

  const rows = [...named, { name: OTHER_REGIONS, weight: OTHER_REGIONS_SHARE }];

  return rows.map(({ name, weight }, i) => {
    const negativeShare = Math.min(
      96,
      Math.max(3, topic.neg + ((i * 7 + seed) % 15) - 7),
    );
    return {
      label: name,
      pct: weight,
      count: Math.round((topic.participants * weight) / 100),
      negativeShare,
      lean:
        negativeShare > 55
          ? "leans negative"
          : negativeShare < 34
            ? "leans positive"
            : "mixed",
    };
  });
}

const AGE_GROUPS = ["17–20", "21–24", "25–30", "31 and over"] as const;
const OCCUPATIONS = [
  "Student",
  "Working professional",
  "Parent or guardian",
  "Educator",
] as const;

function distribution(
  labels: readonly string[],
  weights: readonly number[],
  total: number,
): DistributionRow[] {
  return labels.map((label, i) => {
    const pct = weights[i] ?? 0;
    return { label, pct, count: Math.round((total * pct) / 100) };
  });
}

/** Audience skew differs sharply by topic type; students dominate education. */
function demographics(topic: Topic) {
  const educational = ["exams", "colleges", "careers"].includes(topic.cat);
  const civic = ["policies", "national-politics", "politicians", "controversies"].includes(
    topic.cat,
  );
  const age = educational ? [46, 31, 15, 8] : civic ? [18, 27, 29, 26] : [22, 34, 27, 17];
  const role = educational ? [68, 19, 9, 4] : civic ? [31, 44, 17, 8] : [29, 52, 13, 6];
  return {
    ageGroups: distribution(AGE_GROUPS, age, topic.participants),
    occupations: distribution(OCCUPATIONS, role, topic.participants),
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
 * Facet answers track the topic's overall mood but are not identical to it —
 * a film can be loved for its visuals and disliked for its writing. Each option
 * starts from its tone's headline share and is jittered deterministically.
 */
function facetResults(topic: Topic): FacetResult[] {
  const seed = seedOf(topic.id);

  // Derived tallies stand in for server aggregates on editor-published fixture
  // topics. They must never be applied to a topic a participant created in
  // this browser: there is no server counting anyone's answers, so a jittered
  // "92% said None given" off a single response would be pure invention.
  if (topic.participants === 0 || topic.createdBy) {
    return facetsFor(topic).map((facet) => {
      const tallies: FacetTally[] = facet.options.map((option) => ({
        ...option,
        pct: 0,
        count: 0,
      }));
      return { facet, tallies, responses: 0, leading: tallies[0]! };
    });
  }

  return facetsFor(topic).map((facet, f) => {
    const raw = facet.options.map((option, i) => {
      const base =
        option.tone === "Positive"
          ? topic.pos
          : option.tone === "Negative"
            ? topic.neg
            : topic.neu;
      const jitter = ((seed + f * 17 + i * 29) % 27) - 13;
      return Math.max(4, base + jitter);
    });

    const rawTotal = raw.reduce((sum, v) => sum + v, 0);
    let assigned = 0;
    const pcts = raw.map((value, i) =>
      i === raw.length - 1
        ? 100 - assigned
        : (() => {
            const pct = Math.round((value / rawTotal) * 100);
            assigned += pct;
            return pct;
          })(),
    );

    // Not everyone answers every facet; later questions get fewer responses.
    const responseRate = 0.52 + ((seed + f * 11) % 26) / 100;
    const responses = Math.round(topic.participants * responseRate);

    const tallies: FacetTally[] = facet.options.map((option, i) => {
      const pct = pcts[i] ?? 0;
      return {
        ...option,
        pct,
        count: Math.round((responses * pct) / 100),
      };
    });

    const leading = tallies.reduce((best, t) => (t.pct > best.pct ? t : best), tallies[0]!);

    return { facet, tallies, responses, leading };
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
  const writtenCount = opinionsFor(topic.id).length;
  const demo = demographics(topic);

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
    negPath: trendPath(Math.max(topic.neg - 34, 6), topic.neg),
    posPath: trendPath(Math.min(topic.pos + 22, 94), topic.pos),
    participationBars: participationBars(topic.participants % 7),
    geo: geoRows(topic),
    ageGroups: demo.ageGroups,
    occupations: demo.occupations,
    demographicOptIn: 54 + (topic.participants % 11),
    facets: facetResults(topic),
  };
}
