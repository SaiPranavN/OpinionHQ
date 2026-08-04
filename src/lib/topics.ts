/**
 * Read model for topics. The prototype resolves these from fixtures; the
 * production build swaps the bodies for Prisma queries without changing the
 * signatures the UI depends on.
 */

import { decorate } from "@/lib/derive";
import { matchesPlaceFilter, type PlaceFilterId } from "@/lib/places";
import { TOPICS } from "@/lib/sample-data/topics";
import type { SuggestItem } from "@/lib/suggest";
import type { CategoryFilterId, DecoratedTopic, SortId } from "@/lib/types";

const DECORATED: DecoratedTopic[] = TOPICS.map(decorate);

export function allTopics(): DecoratedTopic[] {
  return DECORATED;
}

export function getTopic(id: string): DecoratedTopic | undefined {
  return DECORATED.find((e) => e.id === id);
}

/** Top topics by trending score, used by the "Hot right now" strip. */
export function hotTopics(limit = 6): DecoratedTopic[] {
  return [...DECORATED].sort((a, b) => b.trend - a.trend).slice(0, limit);
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

export const TOTAL_TOPICS = DECORATED.length;

export const TOTAL_VOTES = DECORATED.reduce((sum, e) => sum + e.participants, 0);

export function topicCountByCategory(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const topic of DECORATED) {
    counts.set(topic.cat, (counts.get(topic.cat) ?? 0) + 1);
  }
  return counts;
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
