/**
 * How a catalog of topics is filtered, sorted and indexed.
 *
 * PURE, AND NO LONGER A READ MODEL. It used to hold the fixtures and hand them
 * out; the rows now come from Postgres through `lib/topics/queries.ts`, and
 * everything here takes the list as an argument instead of owning it. That is
 * what let the database land without touching the catalog UI: these functions
 * are the definition of what the catalog *means* by "trending" or "most
 * discussed", they are tested as such, and they will keep that job when the
 * filters eventually move into SQL for scale.
 */

import { matchesPlaceFilter, type PlaceFilterId } from "@/lib/places";
import type { SuggestItem } from "@/lib/suggest";
import type { CategoryFilterId, DecoratedTopic, SortId } from "@/lib/types";

/** Top topics by trending score, used by the "Hot right now" strip. */
export function hotTopics(topics: readonly DecoratedTopic[], limit = 6): DecoratedTopic[] {
  return [...topics].sort((a, b) => b.trend - a.trend).slice(0, limit);
}

export interface CatalogFilters {
  category: CategoryFilterId;
  sort: SortId;
  query: string;
  /** "any" is no filter at all — see `lib/places.ts`. */
  place: PlaceFilterId;
}

export function filterAndSort(
  topics: DecoratedTopic[],
  { category, sort, query, place }: CatalogFilters,
): DecoratedTopic[] {
  const q = query.trim().toLowerCase();

  const matched = topics.filter((e) => {
    if (category !== "All" && e.cat !== category) return false;
    if (!matchesPlaceFilter(place, e.place)) return false;
    if (!q) return true;
    // Name, category label, place, tags, status and summary are all searchable.
    const haystack = [
      e.name,
      e.category.label,
      e.placeLabel,
      e.placeContext,
      e.status,
      e.summary,
      ...e.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  return [...matched].sort((a, b) => {
    switch (sort) {
      case "discussed":
        return b.writtenCount - a.writtenCount || b.trend - a.trend;
      case "recent":
        return a.recency - b.recency || b.trend - a.trend;
      case "positive":
        return b.pos - a.pos || b.participants - a.participants;
      case "negative":
        return b.neg - a.neg || b.participants - a.participants;
      case "polarizing":
        return b.polarization - a.polarization || b.participants - a.participants;
      case "participation":
        return b.participants - a.participants;
      case "trending":
      default:
        return b.trend - a.trend;
    }
  });
}

export function topicCountByCategory(
  topics: readonly DecoratedTopic[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const topic of topics) {
    counts.set(topic.cat, (counts.get(topic.cat) ?? 0) + 1);
  }
  return counts;
}

/**
 * The two figures the landing page puts its name to.
 *
 * They were constants derived from the fixture array — which meant the home
 * page told every visitor how many topics and votes the platform had, and the
 * numbers described a file. Counted from whatever list is passed now, so an
 * empty database says nothing rather than something untrue.
 */
export function catalogTotals(topics: readonly DecoratedTopic[]): {
  topics: number;
  votes: number;
} {
  return {
    topics: topics.length,
    votes: topics.reduce((sum, t) => sum + t.participants, 0),
  };
}

/**
 * Everything on the topics catalog worth suggesting.
 *
 * Topics carry an `href` so picking one goes straight there — a suggestion that
 * only fills the box in makes you press Enter to reach the thing you already
 * named. Categories, places and tags have none, because they are queries rather
 * than destinations.
 */
export function topicIndex(topics: readonly DecoratedTopic[]): SuggestItem[] {
  const items: SuggestItem[] = topics.map((topic) => ({
    id: `topic-${topic.id}`,
    label: topic.name,
    kind: "topic",
    href: `/topics/${topic.id}`,
    hint: `${topic.category.label} · ${topic.placeLabel} · ${topic.participantsShort}`,
    keywords: [topic.category.label, topic.placeLabel, topic.status, ...topic.tags],
    weight: topic.participants,
  }));

  const places = new Map<string, number>();
  const tags = new Map<string, number>();
  for (const topic of topics) {
    places.set(topic.placeLabel, (places.get(topic.placeLabel) ?? 0) + 1);
    for (const tag of topic.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
  }

  for (const [label, count] of places) {
    items.push({
      id: `place-${label}`,
      label,
      kind: "place",
      hint: `${count} ${count === 1 ? "topic" : "topics"}`,
      weight: count,
    });
  }
  for (const [label, count] of tags) {
    if (count < 2) continue;
    items.push({ id: `tag-${label}`, label, kind: "tag", hint: `${count} topics`, weight: count });
  }
  return items;
}
