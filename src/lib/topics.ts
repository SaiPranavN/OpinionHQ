/**
 * Read model for topics. The prototype resolves these from fixtures; the
 * production build swaps the bodies for Prisma queries without changing the
 * signatures the UI depends on.
 */

import { decorate } from "@/lib/derive";
import { TOPICS } from "@/lib/sample-data/topics";
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
}

export function filterAndSort(
  topics: DecoratedTopic[],
  { category, sort, query }: CatalogFilters,
): DecoratedTopic[] {
  const q = query.trim().toLowerCase();

  const matched = topics.filter((e) => {
    if (category !== "All" && e.cat !== category) return false;
    if (!q) return true;
    // Name, category label, tags, status and summary are all searchable.
    const haystack = [e.name, e.category.label, e.status, e.summary, ...e.tags]
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
