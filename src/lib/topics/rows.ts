/**
 * Turning database rows into the domain types the UI already speaks.
 *
 * THE WHOLE POINT IS THAT NOTHING DOWNSTREAM CHANGED. `decorate` and every
 * component below it were written against `Topic`, are tested against `Topic`,
 * and keep working untouched — this module is the only place that knows a
 * `topic_cards` row exists. When the shape of a table changes, this file breaks
 * and the forty-six derivation tests do not.
 *
 * No `"use client"` and no `"server-only"`: these are pure functions over plain
 * objects, and the vote panel needs them on the client after a write.
 */

import type {
  TopicAudience,
  TopicDayReading,
  ChangeMetric,
  CategoryId,
  Facet,
  MetricChange,
  Sentiment,
  StatusId,
  Topic,
} from "@/lib/types";
import type { PlaceId } from "@/lib/places";

export interface TopicCardRow {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  place_id: string;
  status: string;
  summary: string;
  tags: string[] | null;
  published_at: string | null;
  updated_at: string;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  participants: number;
  written_count: number;
  trend_score: number | string;
  last_activity_at: string | null;
  change_metric: string | null;
  change_value: number | string | null;
  change_direction: string | null;
  suggested_by_name?: string | null;
}

/**
 * Three counts into three whole percentages that sum to exactly 100.
 *
 * Largest remainder, not `Math.round` on each. Rounding independently gives 33 /
 * 33 / 33 for an even split and 34 / 33 / 34 for another — bars that do not fill
 * their track, and a headline that says 34% about something measured at a third.
 * Every share in this product is read as a claim, so they have to add up.
 *
 * Zero participants stays 0/0/0 rather than becoming 34/33/33 of nothing:
 * `decorate` reads `participants === 0` to know it must say "no votes yet", and
 * inventing a split here would put a chart on that page.
 */
export function sharesOf(
  positive: number,
  neutral: number,
  negative: number,
): { pos: number; neu: number; neg: number } {
  const total = positive + neutral + negative;
  if (total === 0) return { pos: 0, neu: 0, neg: 0 };

  const exact = [
    { key: "pos" as const, value: (positive / total) * 100 },
    { key: "neu" as const, value: (neutral / total) * 100 },
    { key: "neg" as const, value: (negative / total) * 100 },
  ];

  const floored = exact.map((e) => ({ ...e, whole: Math.floor(e.value) }));
  let remainder = 100 - floored.reduce((sum, e) => sum + e.whole, 0);

  // Hand the leftover points to the largest fractional parts first.
  const byFraction = [...floored].sort(
    (a, b) => b.value - b.whole - (a.value - a.whole),
  );
  for (const entry of byFraction) {
    if (remainder <= 0) break;
    entry.whole += 1;
    remainder -= 1;
  }

  const out = { pos: 0, neu: 0, neg: 0 };
  for (const entry of floored) out[entry.key] = entry.whole;
  return out;
}

/**
 * "40m ago". Coarse on purpose — a dashboard that says "37 minutes ago" invites
 * a precision the underlying measurement does not have.
 */
export function relativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return "not yet";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "not yet";

  const seconds = Math.max(Math.round((now - then) / 1000), 0);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`;
}

const CHANGE_METRICS = new Set<ChangeMetric>([
  "negative-sentiment",
  "positive-sentiment",
  "participation",
  "discussion",
  "trending",
]);

/**
 * The 7-day change, or a stated absence of one.
 *
 * Null columns mean the job that computes it has not run — which is the case
 * for every topic right now. Zero with a direction is how `decorate` is already
 * told "no trend to report": it renders no arrow rather than a flat one.
 */
function changeOf(row: TopicCardRow): MetricChange {
  const metric = row.change_metric as ChangeMetric | null;
  if (!metric || !CHANGE_METRICS.has(metric) || row.change_value === null) {
    return { metric: "participation", value: 0, direction: "up" };
  }
  return {
    metric,
    value: Number(row.change_value),
    direction: row.change_direction === "down" ? "down" : "up",
  };
}

export function rowToTopic(
  row: TopicCardRow,
  extras: {
    about?: string;
    aspects?: Facet[];
    audience?: TopicAudience;
    demographicOptIn?: number;
    facetTallies?: Record<string, Record<string, number>>;
    series?: TopicDayReading[];
  } = {},
): Topic {
  const shares = sharesOf(row.positive_count, row.neutral_count, row.negative_count);

  return {
    // The slug, because that is what every link in the app already reads.
    id: row.slug,
    uuid: row.id,
    name: row.name,
    ...(row.suggested_by_name ? { suggestedBy: row.suggested_by_name } : {}),
    cat: row.category_id as CategoryId,
    place: row.place_id as PlaceId,
    status: row.status as StatusId,
    summary: row.summary,
    about: extras.about ?? "",
    tags: row.tags ?? [],
    aspects: extras.aspects,
    // Absent rather than empty when nothing was measured, so `decorate` can
    // tell "no data" from "measured and zero".
    ...(extras.audience ? { audience: extras.audience } : {}),
    ...(extras.demographicOptIn !== undefined
      ? { demographicOptIn: extras.demographicOptIn }
      : {}),
    ...(extras.facetTallies ? { facetTallies: extras.facetTallies } : {}),
    ...(extras.series ? { series: extras.series } : {}),
    ...shares,
    // Publication is what "creation" means to a reader — an unpublished draft
    // has no age anyone can see. The subject map sorts its spiral on this.
    ...(row.published_at ? { createdAt: row.published_at } : {}),
    participants: row.participants,
    written: row.written_count,
    trend: Number(row.trend_score),
    // Lower is more recently touched. Derived from the timestamp rather than
    // stored, so it cannot drift from the activity it claims to describe.
    recency: row.last_activity_at
      ? Math.max(Date.now() - new Date(row.last_activity_at).getTime(), 0)
      : Number.MAX_SAFE_INTEGER,
    updated: relativeTime(row.last_activity_at ?? row.published_at ?? row.updated_at),
    change: changeOf(row),
  };
}

/* ------------------------------------------------------------------ aspects */

export interface AspectRow {
  id: string;
  key: string;
  label: string;
  prompt: string;
  position: number;
  topic_aspect_options: {
    id: string;
    key: string;
    label: string;
    tone: string;
    position: number;
  }[];
}

/**
 * Aspects, in author order.
 *
 * `Facet.id` carries the database id rather than the authored key, because the
 * vote panel posts an `aspect_id` and an `option_id` — and a response keyed on a
 * label would break the moment an editor reworded a question.
 */
export function rowsToFacets(rows: AspectRow[]): Facet[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.id,
      label: row.label,
      prompt: row.prompt,
      options: [...(row.topic_aspect_options ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          id: option.id,
          label: option.label,
          tone: option.tone as Sentiment,
        })),
    }));
}

/* --------------------------------------------------------------- audience */

/** One row of `public.topic_audience`. */
export interface AudienceRow {
  dimension: string;
  segment: string;
  vote: string;
  responses: number;
}

/**
 * Audience rows into the panels' shapes.
 *
 * The database returns counts per (segment, sentiment); shares and the negative
 * lean are computed here so they go through the same rounding as everything
 * else on the page. A segment absent from the rows was withheld by the
 * suppression floor and simply does not appear — there is no "other" bucket,
 * because inventing one would put the withheld people somewhere.
 */
export function rowsToAudience(rows: AudienceRow[]): TopicAudience {
  const build = (dimension: string) => {
    const bySegment = new Map<string, { total: number; negative: number }>();
    for (const row of rows) {
      if (row.dimension !== dimension) continue;
      const entry = bySegment.get(row.segment) ?? { total: 0, negative: 0 };
      entry.total += row.responses;
      if (row.vote === "Negative") entry.negative += row.responses;
      bySegment.set(row.segment, entry);
    }
    const measured = [...bySegment.values()].reduce((sum, e) => sum + e.total, 0) || 1;
    return [...bySegment.entries()]
      .map(([label, entry]) => ({
        label,
        pct: Math.round((entry.total / measured) * 100),
        count: entry.total,
        negativeShare: Math.round((entry.negative / entry.total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    geo: build("region").map((row) => ({
      ...row,
      lean:
        row.negativeShare > 55
          ? ("leans negative" as const)
          : row.negativeShare < 34
            ? ("leans positive" as const)
            : ("mixed" as const),
    })),
    ageGroups: build("age").map(({ label, pct, count }) => ({ label, pct, count })),
    occupations: build("occupation").map(({ label, pct, count }) => ({ label, pct, count })),
    genders: build("gender").map(({ label, pct, count }) => ({ label, pct, count })),
  };
}
