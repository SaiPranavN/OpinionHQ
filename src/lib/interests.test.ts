import { describe, expect, it } from "vitest";

import {
  MIN_INTERESTS,
  hasInterests,
  interestsAreEnough,
  matchesCategoryFilter,
  readInterests,
} from "@/lib/interests";
import { filterAndSort } from "@/lib/topics";
import { CATEGORIES } from "@/lib/taxonomy";
import type { CategoryId, DecoratedTopic } from "@/lib/types";

describe("reading what came back from the database", () => {
  it("keeps ids that are real categories", () => {
    expect(readInterests(["exams", "careers"])).toEqual(["exams", "careers"]);
  });

  it("drops ids the taxonomy no longer has", () => {
    // The column is a plain text[] with no foreign key — see the migration —
    // so a renamed category leaves a dead string in somebody's row. It has to
    // vanish rather than become a filter that matches nothing.
    expect(readInterests(["exams", "cryptozoology", "careers"])).toEqual(["exams", "careers"]);
  });

  it("drops duplicates, so the chip's count is a count of categories", () => {
    expect(readInterests(["exams", "exams", "exams"])).toEqual(["exams"]);
  });

  it("returns taxonomy order regardless of the order stored", () => {
    // Two accounts that picked the same things get the same list, so nothing
    // downstream has to sort before comparing.
    const order = CATEGORIES.map((c) => c.id);
    const picked: CategoryId[] = ["careers", "entertainment", "exams"];
    const read = readInterests([...picked].reverse());
    expect(read).toEqual(order.filter((id) => picked.includes(id)));
  });

  it("survives anything that is not an array of strings", () => {
    for (const junk of [null, undefined, "exams", 7, {}, [null, 3, {}]]) {
      expect(readInterests(junk)).toEqual([]);
    }
  });
});

describe("whether the step is satisfied", () => {
  it("takes one", () => {
    expect(MIN_INTERESTS).toBe(1);
    expect(interestsAreEnough([])).toBe(false);
    expect(interestsAreEnough(["exams"])).toBe(true);
  });

  it("says a signed-out visitor has none", () => {
    expect(hasInterests(undefined)).toBe(false);
    expect(hasInterests([])).toBe(false);
    expect(hasInterests(["exams"])).toBe(true);
  });
});

describe("the catalog filter", () => {
  const mine: CategoryId[] = ["exams", "careers"];

  it("lets everything through under All", () => {
    expect(matchesCategoryFilter("All", "entertainment", mine)).toBe(true);
    expect(matchesCategoryFilter("All", "exams", [])).toBe(true);
  });

  it("keeps only the chosen categories under For you", () => {
    expect(matchesCategoryFilter("ForYou", "exams", mine)).toBe(true);
    expect(matchesCategoryFilter("ForYou", "careers", mine)).toBe(true);
    expect(matchesCategoryFilter("ForYou", "entertainment", mine)).toBe(false);
  });

  it("falls back to everything when nothing was chosen", () => {
    // Unreachable through the UI — the chip renders as "All" in that state —
    // but a stale URL or a sign-out both land here, and the honest answer to
    // "show me my categories" when there are none is the whole catalog rather
    // than an empty page.
    for (const category of CATEGORIES) {
      expect(matchesCategoryFilter("ForYou", category.id, [])).toBe(true);
      expect(matchesCategoryFilter("ForYou", category.id, undefined)).toBe(true);
    }
  });

  it("matches exactly one category under a named chip", () => {
    expect(matchesCategoryFilter("exams", "exams", mine)).toBe(true);
    // The interests are ignored entirely: a named chip means that category,
    // whether or not it is one of yours.
    expect(matchesCategoryFilter("entertainment", "entertainment", mine)).toBe(true);
    expect(matchesCategoryFilter("exams", "careers", mine)).toBe(false);
  });
});

/* ------------------------------------------------------ through the catalog */

/** Only the fields `filterAndSort` reads. */
function topic(id: string, cat: CategoryId): DecoratedTopic {
  return {
    id,
    cat,
    name: id,
    category: { id: cat, label: cat, short: cat, blurb: "" },
    place: "worldwide",
    placeLabel: "Worldwide",
    placeContext: "Worldwide",
    status: "Ongoing",
    summary: "",
    tags: [],
    trend: 1,
    writtenCount: 0,
    recency: 0,
    pos: 0,
    neg: 0,
    polarization: 0,
    participants: 0,
  } as unknown as DecoratedTopic;
}

describe("filterAndSort under For you", () => {
  const all = [
    topic("alpha", "exams"),
    topic("bravo", "careers"),
    topic("charlie", "entertainment"),
    topic("delta", "sports"),
  ];
  const base = { sort: "trending", query: "", place: "any" } as const;

  it("narrows the catalog to the chosen categories", () => {
    const rows = filterAndSort(all, {
      ...base,
      category: "ForYou",
      interests: ["exams", "careers"],
    });
    expect(rows.map((t) => t.id).sort()).toEqual(["alpha", "bravo"]);
  });

  it("shows the whole catalog when no interests were saved", () => {
    const rows = filterAndSort(all, { ...base, category: "ForYou", interests: [] });
    expect(rows).toHaveLength(all.length);
  });

  it("shows the whole catalog when interests are not passed at all", () => {
    // Every existing caller that has not been taught about interests keeps
    // working, which is what makes the parameter optional.
    const rows = filterAndSort(all, { ...base, category: "ForYou" });
    expect(rows).toHaveLength(all.length);
  });

  it("leaves All alone", () => {
    const rows = filterAndSort(all, { ...base, category: "All", interests: ["exams"] });
    expect(rows).toHaveLength(all.length);
  });

  it("still combines with a search query", () => {
    const rows = filterAndSort(all, {
      ...base,
      category: "ForYou",
      query: "alpha",
      interests: ["exams", "careers"],
    });
    expect(rows.map((t) => t.id)).toEqual(["alpha"]);
  });
});
