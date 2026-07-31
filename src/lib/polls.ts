/**
 * Read model for polls. Fixture-backed in the prototype; the signatures are
 * what the Prisma-backed versions will keep.
 */

import { decoratePoll } from "@/lib/derive-poll";
import { POLLS } from "@/lib/sample-data/polls";
import type { CategoryFilterId, DecoratedPoll } from "@/lib/types";

const DECORATED: DecoratedPoll[] = POLLS.map(decoratePoll);

export function allPolls(): DecoratedPoll[] {
  return DECORATED;
}

export function getPoll(id: string): DecoratedPoll | undefined {
  return DECORATED.find((p) => p.id === id);
}

export function hotPolls(limit = 4): DecoratedPoll[] {
  return [...DECORATED].sort((a, b) => b.trend - a.trend).slice(0, limit);
}

export type PollSortId = "trending" | "closest" | "voted" | "recent";

export const POLL_SORTS: readonly { id: PollSortId; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "closest", label: "Closest race" },
  { id: "voted", label: "Most voted" },
  { id: "recent", label: "Recently updated" },
] as const;

export function pollSortLabel(id: PollSortId): string {
  return POLL_SORTS.find((s) => s.id === id)?.label ?? "Trending";
}

export function filterAndSortPolls(
  polls: DecoratedPoll[],
  { category, sort, query }: { category: CategoryFilterId; sort: PollSortId; query: string },
): DecoratedPoll[] {
  const q = query.trim().toLowerCase();

  const matched = polls.filter((poll) => {
    if (category !== "All" && poll.cat !== category) return false;
    if (!q) return true;
    const haystack = [
      poll.question,
      poll.category.label,
      poll.summary,
      poll.a.name,
      poll.b.name,
      ...poll.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  return [...matched].sort((x, y) => {
    switch (sort) {
      case "closest":
        return x.margin - y.margin || y.total - x.total;
      case "voted":
        return y.total - x.total;
      case "recent":
        return x.recency - y.recency || y.trend - x.trend;
      case "trending":
      default:
        return y.trend - x.trend;
    }
  });
}

export const TOTAL_POLLS = DECORATED.length;

export const TOTAL_POLL_VOTES = DECORATED.reduce((sum, p) => sum + p.total, 0);

export function pollCountByCategory(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const poll of DECORATED) {
    counts.set(poll.cat, (counts.get(poll.cat) ?? 0) + 1);
  }
  return counts;
}
