"use client";

import { CONTROL_LABEL, CONTROL_SHELL } from "@/components/ui/control";
import { SORTS } from "@/lib/taxonomy";
import type { SortId } from "@/lib/types";

/**
 * This was the odd one out in its own row — a 10px-cornered rectangle beside
 * two pills. It shares the catalog's control shape now; see ui/control.ts.
 */
export function SortControl({
  value,
  onChange,
  accent = "positive",
}: {
  value: SortId;
  onChange: (next: SortId) => void;
  /** Matches the catalog it sits on: green for topics, purple for polls. */
  accent?: "positive" | "poll";
}) {
  return (
    <label className={CONTROL_LABEL}>
      Sort
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortId)}
        aria-label="Sort results"
        className={`cursor-pointer border-veil/10 ${CONTROL_SHELL} ${
          accent === "poll"
            ? "focus:border-poll/60 focus-visible:ring-2 focus-visible:ring-poll/40"
            : "focus:border-positive/60 focus-visible:ring-2 focus-visible:ring-positive/40"
        }`}
      >
        {SORTS.map((sort) => (
          <option key={sort.id} value={sort.id}>
            {sort.label}
          </option>
        ))}
      </select>
    </label>
  );
}
