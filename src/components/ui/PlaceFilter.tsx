"use client";

/**
 * Filtering a catalog by place.
 *
 * Only places that hold something are listed, plus their ancestors — see
 * `occupiedPlaces`. A dropdown of forty states where thirty-one return nothing
 * is a list of dead ends, and the counts beside each entry are cumulative, so
 * "Karnataka 3" means three artifacts in Karnataka *or inside it*.
 *
 * "Anywhere" is first and is the default. It is not the same as Worldwide:
 * Anywhere means no filter, Worldwide means artifacts that are deliberately
 * about nowhere in particular.
 */

import { CONTROL_LABEL, CONTROL_SHELL } from "@/components/ui/control";
import {
  occupiedPlaces,
  placeCounts,
  placeOptions,
  type PlaceFilterId,
  type PlaceId,
} from "@/lib/places";

const INDENT = " ";

export function PlaceFilter({
  value,
  places,
  onChange,
  accent = "positive",
}: {
  value: PlaceFilterId;
  /** The place of every artifact in the catalog, including filtered-out ones. */
  places: readonly PlaceId[];
  onChange: (next: PlaceFilterId) => void;
  accent?: "positive" | "poll" | "private";
}) {
  const live = occupiedPlaces(places);
  const counts = placeCounts(places);
  const options = placeOptions().filter((option) => live.has(option.id));

  return (
    <label className={CONTROL_LABEL}>
      Place
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PlaceFilterId)}
        aria-label="Filter by place"
        className={`cursor-pointer ${CONTROL_SHELL} ${
          value === "any" ? "border-veil/10" : ACTIVE[accent]
        } ${FOCUS[accent]}`}
      >
        <option value="any">Anywhere</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {INDENT.repeat(option.depth)}
            {option.label} ({counts.get(option.id) ?? 0})
          </option>
        ))}
      </select>
    </label>
  );
}

/* Written out in full rather than interpolated: Tailwind scans source text for
   class names, and a name assembled at runtime is a name it never emits. */
const ACTIVE: Record<string, string> = {
  positive: "border-positive/45 !bg-positive/10 text-positive-light",
  poll: "border-poll/45 !bg-poll/10 text-poll-soft",
  private: "border-private/45 !bg-private/10 text-private-soft",
};

const FOCUS: Record<string, string> = {
  positive: "focus:border-positive/60 focus-visible:ring-2 focus-visible:ring-positive/40",
  poll: "focus:border-poll/60 focus-visible:ring-2 focus-visible:ring-poll/40",
  private: "focus:border-private/60 focus-visible:ring-2 focus-visible:ring-private/40",
};
