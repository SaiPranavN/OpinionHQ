import { describe, expect, it } from "vitest";

import {
  PLACES,
  coversPlace,
  getPlace,
  matchesPlaceFilter,
  occupiedPlaces,
  placeChain,
  placeContext,
  placeCounts,
  placeOptions,
  type PlaceId,
} from "@/lib/places";
import { TEST_POLLS } from "@/lib/test-support/fixtures";
import { TEST_TOPICS } from "@/lib/test-support/fixtures";

describe("the registry", () => {
  it("has exactly one root", () => {
    const roots = PLACES.filter((p) => p.parent === undefined);
    expect(roots.map((r) => r.id)).toEqual(["worldwide"]);
  });

  it("gives every place a parent that exists", () => {
    const ids = new Set(PLACES.map((p) => p.id));
    for (const place of PLACES) {
      if (place.parent) expect(ids.has(place.parent), place.id).toBe(true);
    }
  });

  it("has no duplicate ids", () => {
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
  });

  it("nests levels correctly — a city's parent is a state, a state's is a country", () => {
    const order = { world: 0, country: 1, state: 2, city: 3 };
    for (const place of PLACES) {
      if (!place.parent) continue;
      expect(order[getPlace(place.parent).level], place.id).toBe(order[place.level] - 1);
    }
  });
});

describe("placeChain", () => {
  it("walks outwards from the place itself", () => {
    expect(placeChain("bengaluru").map((p) => p.id)).toEqual([
      "bengaluru",
      "karnataka",
      "india",
      "worldwide",
    ]);
  });

  it("stops at the root", () => {
    expect(placeChain("worldwide").map((p) => p.id)).toEqual(["worldwide"]);
  });

  it("reads as context without repeating the place", () => {
    expect(placeContext("trichy")).toBe("Tamil Nadu, India, Worldwide");
    expect(placeContext("worldwide")).toBe("");
  });
});

describe("coversPlace", () => {
  it("lets a state cover its cities", () => {
    expect(coversPlace("karnataka", "bengaluru")).toBe(true);
    expect(coversPlace("india", "bengaluru")).toBe(true);
  });

  it("does not let a city stand in for its state", () => {
    // Someone who filtered to Bengaluru asked about Bengaluru. A Karnataka-wide
    // question is not a Bengaluru question just because the city is in it.
    expect(coversPlace("bengaluru", "karnataka")).toBe(false);
  });

  it("keeps sibling states apart", () => {
    expect(coversPlace("kerala", "bengaluru")).toBe(false);
    expect(coversPlace("karnataka", "chennai")).toBe(false);
  });

  it("does not widen India to include worldwide artifacts", () => {
    // The rule that stops a place filter quietly returning things that are not
    // about that place. "Messi or Ronaldo?" is not an Indian question.
    expect(coversPlace("india", "worldwide")).toBe(false);
    expect(coversPlace("worldwide", "india")).toBe(true);
  });
});

describe("matchesPlaceFilter", () => {
  it("passes everything when no place is chosen", () => {
    for (const place of PLACES) {
      expect(matchesPlaceFilter("any", place.id)).toBe(true);
    }
  });
});

describe("picker", () => {
  it("lists each parent immediately before its children", () => {
    const options = placeOptions();
    const karnataka = options.findIndex((o) => o.id === "karnataka");
    const bengaluru = options.findIndex((o) => o.id === "bengaluru");
    expect(karnataka).toBeGreaterThanOrEqual(0);
    expect(bengaluru).toBe(karnataka + 1);
  });

  it("indents by depth", () => {
    const byId = new Map(placeOptions().map((o) => [o.id, o]));
    expect(byId.get("worldwide")?.depth).toBe(0);
    expect(byId.get("india")?.depth).toBe(1);
    expect(byId.get("karnataka")?.depth).toBe(2);
    expect(byId.get("bengaluru")?.depth).toBe(3);
  });

  it("includes every registry entry exactly once", () => {
    expect(placeOptions().map((o) => o.id).sort()).toEqual(
      PLACES.map((p) => p.id).sort(),
    );
  });
});

describe("occupancy", () => {
  it("keeps empty ancestors so a wider filter stays reachable", () => {
    const live = occupiedPlaces(["bengaluru"]);
    expect([...live].sort()).toEqual(["bengaluru", "india", "karnataka", "worldwide"]);
  });

  it("counts an artifact once at every level containing it", () => {
    const counts = placeCounts(["bengaluru", "mumbai", "worldwide"]);
    expect(counts.get("bengaluru")).toBe(1);
    expect(counts.get("karnataka")).toBe(1);
    expect(counts.get("india")).toBe(2);
    expect(counts.get("worldwide")).toBe(3);
  });
});

describe("fixtures", () => {
  const ids = new Set<string>(PLACES.map((p) => p.id));

  it("places every topic somewhere real", () => {
    for (const topic of TEST_TOPICS) {
      expect(ids.has(topic.place), `${topic.id} → ${topic.place}`).toBe(true);
    }
  });

  it("places every poll somewhere real", () => {
    for (const poll of TEST_POLLS) {
      expect(ids.has(poll.place), `${poll.id} → ${poll.place}`).toBe(true);
    }
  });

  it("puts local subjects under their state, not just under India", () => {
    // The point of the tree. If everything were tagged "india" the filter
    // would be a no-op, so a few known-local artifacts are asserted directly.
    const topics = new Map(TEST_TOPICS.map((t) => [t.id, t.place as PlaceId]));
    expect(topics.get("test-subject-epsilon")).toBe("bengaluru");
    expect(topics.get("test-subject-alpha")).toBe("india");
  });

  it("filtering to Karnataka reaches Bengaluru topics", () => {
    const inKarnataka = TEST_TOPICS.filter((t) => matchesPlaceFilter("karnataka", t.place));
    // Karnataka contains Bengaluru, so a city-placed topic is reached...
    expect(inKarnataka.map((t) => t.id)).toContain("test-subject-epsilon");
    // ...and one placed at the country is not. The filter widens downward only.
    expect(inKarnataka.map((t) => t.id)).not.toContain("test-subject-alpha");
  });
});
