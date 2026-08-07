import "server-only";

/**
 * Turning poll rows into the shapes the components already read.
 *
 * The same trick as `lib/topics/rows.ts`: `Poll.id` carries the slug, because
 * that is what every route and link in the app already holds, and the real
 * primary key rides along in `uuid` for the writes that need to name a row.
 */

import { roundTo100 } from "@/lib/derive-poll";
import type {
  Poll,
  PollAudience,
  PollHistoryPoint,
  PollOption,
  PollOptionId,
  PollSplitRow,
  CategoryId,
  StatusId,
} from "@/lib/types";
import type { PlaceId } from "@/lib/places";

export interface PollCardRow {
  id: string;
  slug: string;
  question: string;
  category_id: string;
  place_id: string;
  status: string;
  summary: string;
  tags: string[] | null;
  closes_at: string | null;
  published_at: string | null;
  updated_at: string;
  total_votes: number;
  reason_count: number;
  trend_score: number;
  last_activity_at: string | null;
}

export interface PollOptionRow {
  id: string;
  slot: string;
  name: string;
  blurb: string;
  vote_count: number;
}

/** One row of `public.poll_audience`. */
export interface AudienceRow {
  dimension: string;
  segment: string;
  slot: string;
  voters: number;
}

const SLOTS: readonly PollOptionId[] = ["a", "b", "c", "d"];

function isSlot(value: string): value is PollOptionId {
  return (SLOTS as readonly string[]).includes(value);
}

/**
 * Relative time, in the vocabulary the cards already use.
 *
 * Duplicated from `lib/topics/rows.ts` rather than shared, because the two will
 * diverge: a poll that has closed reads "closed 3 days ago", which is not a
 * thing a topic ever says.
 */
export function relativeTime(iso: string | null): string {
  if (!iso) return "just now";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

/**
 * "Open until 15 Aug 2026", "Closed", or "Open-ended".
 *
 * A poll past its close date says so rather than quietly still accepting
 * votes — the database refuses them (see the insert policy on `poll_votes`),
 * and a page that does not say why would look broken instead of closed.
 */
export function closesLabel(closesAt: string | null): string {
  if (!closesAt) return "Open-ended";
  const when = new Date(closesAt);
  if (Number.isNaN(when.getTime())) return "Open-ended";
  const formatted = when.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return when.getTime() < Date.now() ? `Closed ${formatted}` : `Open until ${formatted}`;
}

export function rowsToOptions(rows: PollOptionRow[]): PollOption[] {
  return [...rows]
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .filter((row) => isSlot(row.slot))
    .map((row) => ({
      id: row.slot as PollOptionId,
      name: row.name,
      blurb: row.blurb,
      votes: row.vote_count,
    }));
}

/**
 * Audience rows into cross-tab rows.
 *
 * The database returns counts; percentages are computed here so they go through
 * the same largest-remainder rounding as the headline split. A segment whose
 * row totalled 99 next to a headline that totalled 100 would be read as an
 * error in the data rather than in the arithmetic.
 */
export function rowsToAudience(rows: AudienceRow[], optionCount: number): PollAudience {
  const build = (dimension: string): PollSplitRow[] => {
    const bySegment = new Map<string, Map<PollOptionId, number>>();
    for (const row of rows) {
      if (row.dimension !== dimension || !isSlot(row.slot)) continue;
      const counts = bySegment.get(row.segment) ?? new Map<PollOptionId, number>();
      counts.set(row.slot, (counts.get(row.slot) ?? 0) + row.voters);
      bySegment.set(row.segment, counts);
    }

    return [...bySegment.entries()]
      .map(([label, counts]) => {
        const slots = SLOTS.slice(0, optionCount);
        const voters = slots.reduce((sum, slot) => sum + (counts.get(slot) ?? 0), 0);
        const pcts = roundTo100(
          slots.map((slot) => ((counts.get(slot) ?? 0) / (voters || 1)) * 100),
        );
        const sorted = [...pcts].sort((a, b) => b - a);
        const top = sorted[0] ?? 0;
        const winners = pcts.filter((p) => p === top).length;
        return {
          label,
          // Filled in by `rescale`, which needs every segment in the dimension
          // before it can say what fraction each one is.
          share: 0,
          voters,
          pcts,
          leans: (winners > 1 ? "even" : (SLOTS[pcts.indexOf(top)] ?? "even")) as
            | PollOptionId
            | "even",
          margin: top - (sorted[1] ?? 0),
        };
      })
      .sort((a, b) => b.voters - a.voters);
  };

  const rescale = (segments: PollSplitRow[]): PollSplitRow[] => {
    // A segment's share is of the voters measured *in its own dimension*, not
    // of everyone. Someone who gave an age but no occupation is in the age
    // denominator and not the occupation one, so the two panels legitimately
    // describe different-sized audiences.
    const within = segments.reduce((sum, row) => sum + row.voters, 0) || 1;
    return segments.map((row) => ({
      ...row,
      share: Math.round((row.voters / within) * 100),
    }));
  };

  return {
    regions: rescale(build("region")),
    ageGroups: rescale(build("age")),
    occupations: rescale(build("occupation")),
  };
}

export function rowsToHistory(
  rows: { recorded_on: string; pcts: number[]; event: string | null }[],
): PollHistoryPoint[] {
  return [...rows]
    .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on))
    .map((row) => ({
      date: row.recorded_on,
      pcts: row.pcts.map(Number),
      ...(row.event ? { event: row.event } : {}),
    }));
}

export function rowToPoll(
  row: PollCardRow,
  extras: {
    about?: string;
    options: PollOption[];
    audience?: PollAudience;
    reasonCounts?: Partial<Record<PollOptionId, number>>;
    demographicOptIn?: number;
    history?: PollHistoryPoint[];
  },
): Poll {
  return {
    id: row.slug,
    uuid: row.id,
    question: row.question,
    cat: row.category_id as CategoryId,
    place: row.place_id as PlaceId,
    status: row.status as StatusId,
    summary: row.summary,
    about: extras.about ?? "",
    tags: row.tags ?? [],
    options: extras.options,
    closes: closesLabel(row.closes_at),
    ...(extras.audience ? { audience: extras.audience } : {}),
    ...(extras.reasonCounts ? { reasonCounts: extras.reasonCounts } : {}),
    ...(extras.demographicOptIn !== undefined
      ? { demographicOptIn: extras.demographicOptIn }
      : {}),
    // Absent, not empty, when nothing was ever recorded — the chart draws
    // nothing rather than a flat line through one invented point.
    ...(extras.history && extras.history.length > 0 ? { history: extras.history } : {}),
    trend: Number(row.trend_score),
    recency: row.last_activity_at
      ? Math.max(Date.now() - new Date(row.last_activity_at).getTime(), 0)
      : Number.MAX_SAFE_INTEGER,
    updated: relativeTime(row.last_activity_at ?? row.published_at ?? row.updated_at),
  };
}
