/**
 * The categories an account said it wanted to read, and what a catalog does
 * with them.
 *
 * ONE PLACE, BECAUSE TWO CATALOGS ASK THE SAME QUESTION. Topics and polls each
 * filter their own rows and each render the same leading chip, and the last
 * time those two answered a shared question separately — what a category chip
 * counts — they disagreed for weeks. The rule for "For you" is written once
 * here and imported by both.
 *
 * WHAT IT IS NOT. Nothing in this file feeds a chart. An interest is a reading
 * preference: it decides which rows a person is shown first, never which rows
 * exist, never what a result says, and never who is counted in a breakdown.
 * The cross-tabs are built from `profile_private`'s demographics, and interests
 * are deliberately not among them — what somebody chooses to read is not a
 * property of the opinion they cast.
 */

import { CATEGORIES } from "@/lib/taxonomy";
import type { CategoryFilterId, CategoryId } from "@/lib/types";

const VALID: ReadonlySet<string> = new Set(CATEGORIES.map((category) => category.id));

/**
 * Whatever came back from the database, as category ids and nothing else.
 *
 * The column is a plain `text[]` — see the migration for why it is not a join
 * table — so an id that no longer exists in the taxonomy can be sitting in
 * somebody's row after a category is renamed. Dropping it here means a stale
 * value shows one fewer chip rather than a filter that silently matches
 * nothing. Duplicates are dropped for the same reason: the count shown next to
 * the chip is a count of categories, not of array entries.
 */
export function readInterests(raw: unknown): CategoryId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<CategoryId>();
  for (const value of raw) {
    if (typeof value === "string" && VALID.has(value)) seen.add(value as CategoryId);
  }
  // Taxonomy order, not the order they were stored in, so two accounts with the
  // same interests produce the same chips in the same places.
  return CATEGORIES.filter((category) => seen.has(category.id)).map((c) => c.id);
}

/**
 * How many categories somebody has to pick before the step will let them past.
 *
 * One, not three. The step exists so the catalog can open on something the
 * reader chose, and one category is enough for that to be true — demanding
 * more would be inventing a preference on their behalf, which is the exact
 * failure the site's rule about invented figures is about. There is no upper
 * bound worth enforcing: somebody who picks all fifteen has said "show me
 * everything", which is a real answer.
 */
export const MIN_INTERESTS = 1;

export function interestsAreEnough(interests: readonly CategoryId[]): boolean {
  return interests.length >= MIN_INTERESTS;
}

/**
 * Whether the leading chip can honestly say "For you".
 *
 * False for a signed-out visitor and for an account created before the step
 * existed. Both see "All" instead — see `CategoryFilterId` for why the empty
 * list falls back to showing everything rather than to showing nothing.
 */
export function hasInterests(interests: readonly CategoryId[] | undefined): boolean {
  return (interests?.length ?? 0) > 0;
}

/**
 * The one rule a catalog filter needs: does this row belong under this chip?
 *
 * `ForYou` with nothing chosen is the same as `All`, deliberately. It is
 * unreachable through the UI — the chip renders as "All" in that state — but a
 * `?category=` in a URL, or a sign-out with the filter already set, both land
 * here, and the honest answer to "show me my categories" when there are none is
 * the whole catalog rather than an empty page.
 */
export function matchesCategoryFilter(
  filter: CategoryFilterId,
  category: CategoryId,
  interests: readonly CategoryId[] = [],
): boolean {
  if (filter === "All") return true;
  if (filter === "ForYou") {
    return interests.length === 0 || interests.includes(category);
  }
  return filter === category;
}
