/**
 * Pure helpers over a list of polls — filtering, sorting, the suggest index.
 *
 * The fixture catalog that used to live here is gone; `lib/polls/queries.ts`
 * reads the real one from Postgres. What remains is the sorting and filtering
 * logic, which is pure and is where the tests point.
 */

import { matchesPlaceFilter, type PlaceFilterId } from "@/lib/places";
import type { SuggestItem } from "@/lib/suggest";
import type { CategoryFilterId, DecoratedPoll } from "@/lib/types";


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
  {
    category,
    sort,
    query,
    place,
  }: {
    category: CategoryFilterId;
    sort: PollSortId;
    query: string;
    /** "any" is no filter at all — see `lib/places.ts`. */
    place: PlaceFilterId;
  },
): DecoratedPoll[] {
  const q = query.trim().toLowerCase();

  const matched = polls.filter((poll) => {
    if (category !== "All" && poll.cat !== category) return false;
    if (!matchesPlaceFilter(place, poll.place)) return false;
    if (!q) return true;
    const haystack = [
      poll.question,
      poll.category.label,
      poll.placeLabel,
      poll.placeContext,
      poll.summary,
      ...poll.options.map((o) => o.name),
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


/**
 * Everything on the polls catalog worth suggesting.
 *
 * Option names are keywords rather than entries of their own: somebody typing
 * "Messi" wants the poll, not a row saying "Messi".
 */
export function pollIndex(polls: readonly DecoratedPoll[]): SuggestItem[] {
  const items: SuggestItem[] = polls.map((poll) => ({
    id: `poll-${poll.id}`,
    label: poll.question,
    kind: "poll",
    href: `/polls/${poll.id}`,
    hint: `${poll.category.label} · ${poll.placeLabel} · ${poll.totalShort}`,
    keywords: [
      poll.category.label,
      poll.placeLabel,
      ...poll.options.map((o) => o.name),
      ...poll.tags,
    ],
    weight: poll.total,
  }));

  const places = new Map<string, number>();
  for (const poll of polls) {
    places.set(poll.placeLabel, (places.get(poll.placeLabel) ?? 0) + 1);
  }
  for (const [label, count] of places) {
    items.push({
      id: `place-${label}`,
      label,
      kind: "place",
      hint: `${count} ${count === 1 ? "poll" : "polls"}`,
      weight: count,
    });
  }
  return items;
}
