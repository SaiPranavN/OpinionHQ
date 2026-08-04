/**
 * Where an artifact applies.
 *
 * Every topic, poll and question now carries a place, because most of them are
 * not about everywhere. "NEET UG 2026 paper leak" is an Indian question;
 * "Bengaluru Metro Yellow Line delay" is a Karnataka one; "Messi or Ronaldo?"
 * genuinely is about nowhere in particular. Without this field all three sit in
 * one undifferentiated list and a reader in Kochi wades through Bengaluru
 * traffic disputes to find anything that concerns them.
 *
 * THE MODEL IS A CONTAINMENT TREE, not a tag. Places nest — a city sits in a
 * state, a state sits in a country — and filtering follows the nesting: asking
 * for Karnataka returns Bengaluru's artifacts too, because a Bengaluru question
 * *is* a Karnataka question. A flat string field could not do that without
 * every author remembering to tag both, and they would not.
 *
 * `worldwide` is a real member of the tree rather than a null. An artifact with
 * no place is an artifact somebody forgot to place; an artifact placed
 * `worldwide` is a deliberate statement that geography does not bear on it. The
 * two are different claims and the type keeps them different — `place` is
 * required, and the way to say "everywhere" is to say it.
 */

export type PlaceLevel = "world" | "country" | "state" | "city";

/**
 * The registry.
 *
 * India-first because the fixtures are, with the states and the handful of
 * cities that actually carry artifacts. Deliberately NOT an exhaustive
 * gazetteer: a picker listing 700 districts is a picker nobody completes, and
 * an empty place is worse than a coarse one. Adding a city is one line, and the
 * containment rules below need no change when somebody does.
 */
const REGISTRY = [
  { id: "worldwide", label: "Worldwide", short: "Worldwide", level: "world" },

  { id: "india", label: "India", short: "India", level: "country", parent: "worldwide" },

  /* ------------------------------------------------------------- states */
  { id: "andhra-pradesh", label: "Andhra Pradesh", short: "AP", level: "state", parent: "india" },
  { id: "assam", label: "Assam", short: "Assam", level: "state", parent: "india" },
  { id: "bihar", label: "Bihar", short: "Bihar", level: "state", parent: "india" },
  { id: "delhi", label: "Delhi NCR", short: "Delhi", level: "state", parent: "india" },
  { id: "goa", label: "Goa", short: "Goa", level: "state", parent: "india" },
  { id: "gujarat", label: "Gujarat", short: "Gujarat", level: "state", parent: "india" },
  { id: "haryana", label: "Haryana", short: "Haryana", level: "state", parent: "india" },
  {
    id: "himachal-pradesh",
    label: "Himachal Pradesh",
    short: "Himachal",
    level: "state",
    parent: "india",
  },
  { id: "karnataka", label: "Karnataka", short: "Karnataka", level: "state", parent: "india" },
  { id: "kerala", label: "Kerala", short: "Kerala", level: "state", parent: "india" },
  {
    id: "madhya-pradesh",
    label: "Madhya Pradesh",
    short: "MP",
    level: "state",
    parent: "india",
  },
  { id: "maharashtra", label: "Maharashtra", short: "Maharashtra", level: "state", parent: "india" },
  { id: "odisha", label: "Odisha", short: "Odisha", level: "state", parent: "india" },
  { id: "punjab", label: "Punjab", short: "Punjab", level: "state", parent: "india" },
  { id: "rajasthan", label: "Rajasthan", short: "Rajasthan", level: "state", parent: "india" },
  { id: "tamil-nadu", label: "Tamil Nadu", short: "Tamil Nadu", level: "state", parent: "india" },
  { id: "telangana", label: "Telangana", short: "Telangana", level: "state", parent: "india" },
  { id: "uttarakhand", label: "Uttarakhand", short: "Uttarakhand", level: "state", parent: "india" },
  { id: "uttar-pradesh", label: "Uttar Pradesh", short: "UP", level: "state", parent: "india" },
  { id: "west-bengal", label: "West Bengal", short: "West Bengal", level: "state", parent: "india" },

  /* ------------------------------------------------------------- cities */
  { id: "agra", label: "Agra", short: "Agra", level: "city", parent: "uttar-pradesh" },
  { id: "ahmedabad", label: "Ahmedabad", short: "Ahmedabad", level: "city", parent: "gujarat" },
  { id: "alappuzha", label: "Alappuzha", short: "Alappuzha", level: "city", parent: "kerala" },
  { id: "bengaluru", label: "Bengaluru", short: "Bengaluru", level: "city", parent: "karnataka" },
  { id: "chennai", label: "Chennai", short: "Chennai", level: "city", parent: "tamil-nadu" },
  { id: "hyderabad", label: "Hyderabad", short: "Hyderabad", level: "city", parent: "telangana" },
  { id: "jaipur", label: "Jaipur", short: "Jaipur", level: "city", parent: "rajasthan" },
  { id: "kolkata", label: "Kolkata", short: "Kolkata", level: "city", parent: "west-bengal" },
  { id: "lucknow", label: "Lucknow", short: "Lucknow", level: "city", parent: "uttar-pradesh" },
  { id: "manali", label: "Manali", short: "Manali", level: "city", parent: "himachal-pradesh" },
  { id: "mumbai", label: "Mumbai", short: "Mumbai", level: "city", parent: "maharashtra" },
  { id: "nainital", label: "Nainital", short: "Nainital", level: "city", parent: "uttarakhand" },
  { id: "pune", label: "Pune", short: "Pune", level: "city", parent: "maharashtra" },
  { id: "trichy", label: "Tiruchirappalli", short: "Trichy", level: "city", parent: "tamil-nadu" },
] as const;

/**
 * Every place id in the registry, as a union.
 *
 * Derived from the array rather than declared beside it, so a typo in a
 * fixture's `place` fails to compile instead of silently filtering to nothing.
 * The `satisfies` below is what makes the union honest: it checks that every
 * `parent` names a place that exists.
 */
export type PlaceId = (typeof REGISTRY)[number]["id"];

export interface Place {
  id: PlaceId;
  label: string;
  /** Used where the full label will not fit — chips, cards, the ticker. */
  short: string;
  level: PlaceLevel;
  /** Absent only on the root. */
  parent?: PlaceId;
}

/**
 * The registry, typed.
 *
 * The annotation is what makes a typo fail the build: every `parent` above has
 * to name a place that exists, and every `level` has to be one of the four.
 */
export const PLACES: readonly Place[] = REGISTRY;

export const ROOT_PLACE: PlaceId = "worldwide";

const BY_ID = new Map<string, Place>(PLACES.map((p) => [p.id, p]));

export function getPlace(id: PlaceId): Place {
  const place = BY_ID.get(id);
  // Unreachable through the type, but a fixture loaded from localStorage is
  // untyped by the time it gets here, and a missing place must not throw the
  // catalog away.
  return place ?? { id: ROOT_PLACE, label: "Worldwide", short: "Worldwide", level: "world" };
}

export function placeLabel(id: PlaceId): string {
  return getPlace(id).label;
}

/**
 * The place and everything containing it, innermost first.
 *
 * `placeChain("bengaluru")` is Bengaluru → Karnataka → India → Worldwide. Cycle
 * safe: a registry that somehow pointed a parent back at a descendant would
 * hang the catalog rather than fail a test, so the walk refuses to revisit.
 */
export function placeChain(id: PlaceId): Place[] {
  const chain: Place[] = [];
  const seen = new Set<string>();
  let cursor: PlaceId | undefined = id;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const place = BY_ID.get(cursor);
    if (!place) break;
    chain.push(place);
    cursor = place.parent;
  }
  return chain;
}

/**
 * "Karnataka, India" — the chain above the place itself, outermost last.
 *
 * Shown under a place chip so a reader who does not know where Trichy is can
 * still place it, and so two same-named places in different states could never
 * be confused for each other.
 */
export function placeContext(id: PlaceId): string {
  return placeChain(id).slice(1).map((p) => p.label).join(", ");
}

/**
 * Does an artifact placed at `place` fall inside `filter`?
 *
 * Containment, in one direction only. Karnataka covers Bengaluru; Bengaluru
 * does not cover Karnataka. A state-wide artifact is not a Bengaluru artifact
 * just because Bengaluru is in the state — "Karnataka CM's office" is not a
 * question about Bengaluru, and a reader who filtered to Bengaluru asked for
 * things about Bengaluru.
 *
 * One consequence worth stating plainly: filtering to India does NOT return
 * `worldwide` artifacts. "Messi or Ronaldo?" is not an Indian question, and a
 * place filter that quietly widens itself is a filter you stop trusting. The
 * catalogs offer "Anywhere" for people who want everything.
 */
export function coversPlace(filter: PlaceId, place: PlaceId): boolean {
  return placeChain(place).some((p) => p.id === filter);
}

export type PlaceFilterId = "any" | PlaceId;

export function matchesPlaceFilter(filter: PlaceFilterId, place: PlaceId): boolean {
  return filter === "any" || coversPlace(filter, place);
}

export function isPlaceId(value: string): value is PlaceId {
  return BY_ID.has(value);
}

/* ------------------------------------------------------------------ picker */

export interface PlaceOption {
  id: PlaceId;
  label: string;
  level: PlaceLevel;
  /** 0 for Worldwide, 1 for a country, 2 for a state, 3 for a city. */
  depth: number;
}

/**
 * The registry flattened into picker order: each parent immediately followed by
 * its children, depth-first. `depth` is for indentation — a `<select>` cannot
 * nest, so the hierarchy has to be visible in the text.
 */
export function placeOptions(): PlaceOption[] {
  const out: PlaceOption[] = [];
  const walk = (parent: PlaceId | undefined, depth: number) => {
    for (const place of PLACES) {
      if (place.parent !== parent) continue;
      out.push({ id: place.id, label: place.label, level: place.level, depth });
      walk(place.id, depth + 1);
    }
  };
  const root = PLACES.find((p) => p.parent === undefined);
  if (root) {
    out.push({ id: root.id, label: root.label, level: root.level, depth: 0 });
    walk(root.id, 1);
  }
  return out;
}

/**
 * Places that actually carry artifacts, plus everything containing them.
 *
 * A filter listing forty states when thirty-one of them are empty is a list of
 * dead ends. The ancestors are kept even when empty themselves, because
 * selecting India has to stay available when only Karnataka has anything —
 * that selection returns the Karnataka rows, which is the whole point of the
 * tree.
 */
export function occupiedPlaces(places: readonly PlaceId[]): Set<PlaceId> {
  const live = new Set<PlaceId>();
  for (const id of places) {
    for (const ancestor of placeChain(id)) live.add(ancestor.id);
  }
  return live;
}

/** How many artifacts sit at or inside each place. Used for the picker counts. */
export function placeCounts(places: readonly PlaceId[]): Map<PlaceId, number> {
  const counts = new Map<PlaceId, number>();
  for (const id of places) {
    for (const ancestor of placeChain(id)) {
      counts.set(ancestor.id, (counts.get(ancestor.id) ?? 0) + 1);
    }
  }
  return counts;
}
