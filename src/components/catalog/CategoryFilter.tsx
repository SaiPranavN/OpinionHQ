"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CATEGORIES } from "@/lib/taxonomy";
import type { CategoryFilterId } from "@/lib/types";

/**
 * Eleven categories will never fit one row, so the chips scroll horizontally
 * with the row itself as the scroll container. Each chip is a real button with
 * `aria-pressed`, so the active state is exposed to assistive tech too.
 */
export function CategoryFilter({
  value,
  counts,
  onChange,
}: {
  value: CategoryFilterId;
  counts: Map<string, number>;
  onChange: (next: CategoryFilterId) => void;
}) {
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="ohq-scroll-x -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      <Chip
        active={value === "All"}
        label="All"
        count={total}
        onClick={() => onChange("All")}
      />
      {CATEGORIES.filter((category) => {
        // The catch-all is only worth a chip once something is actually in it —
        // an empty "Something else" filter is a dead end.
        const count = counts.get(category.id) ?? 0;
        return !category.reserved || count > 0;
      }).map((category) => (
        <Chip
          key={category.id}
          active={value === category.id}
          label={category.label}
          count={counts.get(category.id) ?? 0}
          icon={<CategoryIcon category={category.id} size={13} />}
          title={category.blurb}
          onClick={() => onChange(category.id)}
        />
      ))}
    </div>
  );
}

function Chip({
  active,
  label,
  count,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon?: React.ReactNode;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12.5px] font-medium whitespace-nowrap transition-[color,background,border-color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
        active
          ? "border-positive/50 bg-positive/14 text-positive-light"
          : "border-white/12 text-muted hover:border-white/25 hover:text-cream"
      }`}
    >
      {icon}
      {label}
      <span
        className={`font-mono text-[10px] ${active ? "text-positive-light/70" : "text-dim"}`}
      >
        {count}
      </span>
    </button>
  );
}
