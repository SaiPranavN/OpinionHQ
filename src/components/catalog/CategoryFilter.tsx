"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { hasInterests } from "@/lib/interests";
import { CATEGORIES } from "@/lib/taxonomy";
import type { CategoryFilterId, CategoryId } from "@/lib/types";

/**
 * Fifteen categories will never fit one row, so the chips scroll horizontally
 * with the row itself as the scroll container. Each chip is a real button with
 * `aria-pressed`, so the active state is exposed to assistive tech too.
 *
 * ── The leading chip is "For you", and sometimes it is "All" ─────────────────
 *
 * It used to be "All", always. It is now the categories the account chose at
 * sign-up — which is only a meaningful thing to offer somebody who has chosen
 * some. A signed-out visitor has not; neither has an account created before
 * that step existed. Both get the old chip, with the old label and the old
 * behaviour, because a tab called "For you" that quietly means "everything" is
 * a worse lie than a tab called "All" that means it.
 *
 * The count next to it follows the same rule: the number of rows the chip will
 * actually show, not the size of the catalog.
 */
export function CategoryFilter({
  value,
  counts,
  interests,
  onChange,
}: {
  value: CategoryFilterId;
  counts: Map<string, number>;
  /** From the session. Empty for a signed-out visitor. */
  interests?: readonly CategoryId[];
  onChange: (next: CategoryFilterId) => void;
}) {
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const personal = hasInterests(interests);
  const mine = personal
    ? (interests ?? []).reduce((sum, id) => sum + (counts.get(id) ?? 0), 0)
    : total;

  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="ohq-scroll-x -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      <Chip
        active={value === (personal ? "ForYou" : "All")}
        label={personal ? "For you" : "All"}
        count={mine}
        icon={personal ? <StarGlyph /> : undefined}
        title={
          personal
            ? "The categories you picked when you signed up. Change them on your dashboard."
            : undefined
        }
        onClick={() => onChange(personal ? "ForYou" : "All")}
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
          : "border-veil/12 text-muted hover:border-veil/25 hover:text-cream"
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

/** Outlined, at the same weight as the category glyphs beside it. */
function StarGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z" />
    </svg>
  );
}
