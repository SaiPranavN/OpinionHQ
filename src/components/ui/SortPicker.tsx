"use client";

/**
 * The ordering control, in one place.
 *
 * There are four lists on this site that people read top-down — the opinions
 * tab, the discussion tab, and a poll's two reason columns — and until now only
 * the first of them could be reordered at all. The other three were sorted by
 * whatever the component had decided, with no way to ask a different question.
 *
 * One component, so the four cannot drift into offering different options or
 * different words for the same option. The list itself lives in
 * lib/contributions.ts next to the comparators that implement it, because a
 * label without a comparator is a promise the list does not keep.
 */

import { SORTS, type ContributionSort } from "@/lib/contributions";

export function SortPicker({
  value,
  onChange,
  className = "",
  label = "Sort",
}: {
  value: ContributionSort;
  onChange: (sort: ContributionSort) => void;
  className?: string;
  /** Named when there is more than one picker in view, as on a poll. */
  label?: string;
}) {
  return (
    <label className={`flex shrink-0 items-center gap-2 ${className}`}>
      <span className="font-mono text-[10px] tracking-[0.1em] whitespace-nowrap uppercase text-dim">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ContributionSort)}
        className="cursor-pointer rounded-full border border-veil/12 bg-surface-sunken px-3 py-1.5 text-[12.5px] text-soft outline-none transition-colors hover:border-veil/30 focus-visible:ring-2 focus-visible:ring-positive/60"
      >
        {SORTS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
