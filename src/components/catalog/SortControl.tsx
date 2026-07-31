"use client";

import { SORTS } from "@/lib/taxonomy";
import type { SortId } from "@/lib/types";

export function SortControl({
  value,
  onChange,
}: {
  value: SortId;
  onChange: (next: SortId) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
      Sort
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortId)}
        aria-label="Sort topics"
        className="cursor-pointer rounded-[10px] border border-white/10 bg-surface px-3 py-[10px] font-sans text-[13.5px] tracking-[-0.01em] normal-case text-cream outline-none transition-colors duration-300 focus:border-positive/50 focus-visible:ring-2 focus-visible:ring-positive/40"
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
