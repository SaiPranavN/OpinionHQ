"use client";

/**
 * The cross-tabs, and the thing you can actually push on.
 *
 * Every other panel in the showcase reports; this one *asks*. Clicking a row
 * filters the whole stage to that slice — the donut, the split bar and the
 * trend all re-read from the same cells — which is the only way to make "we
 * show you where the split flips" land without a paragraph about it.
 *
 * ONE BAR, TWO ENCODINGS. Its length is how much of the sample the group is;
 * the stack inside it is how that group split. That pairing is deliberate: a
 * breakdown that shows only size cannot show disagreement, and one that shows
 * only lean makes a group of forty people look as important as a group of four
 * thousand. Both questions get answered by the same 200 pixels.
 *
 * The share is then printed as a number, because a bar is a comparison and not
 * a reading. Length alone answers "which group is bigger" and never "how big" —
 * and the gender row directly below these columns has always printed its
 * figure, so a bare bar here read as a column that had lost its number.
 *
 * The swing chip on the right is the finding, stated: how far this group sits
 * from everybody currently in scope, in points, on whichever answer is winning.
 * It is measured against the *leader* rather than a fixed column because the
 * leader is the number the reader just looked at — and because "+14 on option
 * two" is not a sentence.
 */

import {
  DIM_LABEL,
  GENDERS,
  breakdown,
  filterValue,
  stackFor,
  type Dim,
  type Filter,
  type Mode,
} from "@/components/landing/showcase/data";

const DIMS: Dim[] = ["state", "age", "work"];

export function DemoBreakdown({
  filter,
  mode,
  onPick,
  rail = false,
}: {
  filter: Filter;
  mode: Mode;
  onPick: (dim: Dim, value: string | undefined) => void;
  /**
   * Lay the three dimensions out as a swipeable rail instead of stacking them.
   *
   * For the stepped stage on a phone, and it is the difference between the act
   * fitting and not. Stacked, the three blocks run to about 600px, in a step
   * viewport that has around 420px to give — which would either clip the third
   * dimension or shrink all three past readable. Side by side at 82% of the
   * width, the act is one block tall and the other two are a thumb-flick away,
   * with snap points so a half-swipe still lands on a dimension.
   */
  rail?: boolean;
}) {
  return (
    <div className="flex flex-col gap-[clamp(18px,2.4vw,26px)]">
      {/* Three across only from `lg`. At tablet width the columns squeezed the
          bars down to a thumbnail and truncated "Self-employed" — three full
          rows of readable bars beat three columns of unreadable ones. */}
      <div
        className={
          rail
            ? "-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "grid grid-cols-1 gap-[clamp(16px,2vw,22px)] lg:grid-cols-3"
        }
      >
        {DIMS.map((dim) => (
          <div
            key={dim}
            // Full width, not 82%. A peeking neighbour is a nice affordance
            // and it cost the bars their entire width: the row's fixed columns
            // come to about 210px, so on a 270px card the bar was squeezed to
            // two pixels — the one element in the panel that carries the shape
            // of the finding. The snap points and the gap do the affordance job
            // instead, and `rail` also narrows the columns below.
            className={rail ? "w-full shrink-0 snap-center" : "contents"}
          >
            <DimBlock dim={dim} filter={filter} mode={mode} onPick={onPick} rail={rail} />
          </div>
        ))}
      </div>

      {/* Gender is shown because the live topic page shows it, and it carries
          no lean here on purpose — see the note in data.ts.

          It is the one block that goes in the rail layout. That layout exists
          because a phone gives this act about 440 pixels, and gender is four
          rows asserting nothing — the note beside it literally says it asserts
          no split. Losing the three cross-tabs that *do* carry the finding, in
          order to keep the one that does not, would be the wrong trade. */}
      <div
        className={`flex-col gap-2.5 border-t border-line pt-[clamp(16px,2vw,22px)] ${
          rail ? "hidden" : "flex"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim">
            Gender
          </span>
          <span className="text-[11.5px] text-dim">
            Participation only — this illustration asserts no split by gender
          </span>
        </div>
        <div className="grid grid-cols-1 gap-x-[clamp(16px,2vw,22px)] gap-y-2 lg:grid-cols-3">
          {GENDERS.map((row) => (
            <span key={row.label} className="flex min-w-0 items-center gap-2.5 px-2">
              <span className="w-[100px] lg:w-[84px] shrink-0 text-[12.5px] text-soft">
                {row.label}
              </span>
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-veil/6">
                <span
                  className="block h-full rounded-full bg-veil/45 transition-[width] duration-700 ease-ohq"
                  style={{ width: `${row.pct}%` }}
                />
              </span>
              <span className="w-[46px] shrink-0 text-right font-mono text-[10.5px] tabular-nums text-cream">
                {row.pct.toFixed(1)}%
              </span>
              {/* Holds the swing column's width so the gender figures line up
                  with the share figures above them rather than with the swings. */}
              <span aria-hidden className="w-[34px] shrink-0" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DimBlock({
  dim,
  filter,
  mode,
  onPick,
  rail = false,
}: {
  dim: Dim;
  filter: Filter;
  mode: Mode;
  onPick: (dim: Dim, value: string | undefined) => void;
  /** Narrows the fixed columns so the bar keeps a usable share of a phone. */
  rail?: boolean;
}) {
  const selected = filterValue(filter, dim);
  // Read the other axes only, so a picked row still shows its neighbours
  // rather than collapsing to a single 100% bar.
  const scope: Filter = { ...filter, [dim]: undefined };
  const { rows, swingOf } = breakdown(dim, scope, mode);
  const widest = Math.max(...rows.map((r) => r.pct), 1);
  const stack = stackFor(mode);

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim">
          {DIM_LABEL[dim]}
        </span>
        {selected ? (
          <button
            type="button"
            onClick={() => onPick(dim, undefined)}
            className="cursor-pointer font-mono text-[9.5px] tracking-[0.1em] uppercase text-positive-light underline decoration-positive/30 underline-offset-4 transition-colors hover:decoration-positive/70"
          >
            clear
          </button>
        ) : (
          // Names what the right-hand column measures. Without it the sign is
          // ambiguous the moment the leading answer is not the green one.
          <span className="truncate font-mono text-[9px] tracking-[0.08em] uppercase text-dim">
            ± on {swingOf.label}
          </span>
        )}
      </header>

      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((row) => {
          const active = selected === row.label;
          const shares = mode === "topic" ? row.sentiment : row.poll;
          const swing = Math.round(row.swing);

          return (
            <li key={row.label}>
              <button
                type="button"
                onClick={() => onPick(dim, active ? undefined : row.label)}
                aria-pressed={active}
                aria-label={`${row.label}: ${row.pct} percent of participants, ${stack
                  .map((s, i) => `${s.label} ${shares[i]} percent`)
                  .join(", ")}, ${swing === 0 ? "level with" : `${Math.abs(swing)} points ${swing > 0 ? "above" : "below"}`} the reading on ${swingOf.label}`}
                className={`group flex w-full cursor-pointer items-center rounded-[9px] text-left transition-[background,box-shadow] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                  rail ? "gap-2 px-1 py-[6px]" : "gap-2.5 px-2 py-[7px]"
                } ${
                  active ? "bg-veil/7" : "hover:bg-veil/4"
                }`}
              >
                <span
                  className={`${
                    rail ? "w-[88px] text-[12px]" : "w-[100px] text-[12.5px] lg:w-[84px]"
                  } shrink-0 truncate transition-colors duration-300 ${
                    active ? "font-medium text-cream-bright" : "text-soft"
                  }`}
                >
                  {row.label}
                </span>

                <span className="flex h-[13px] min-w-0 flex-1 items-center">
                  <span
                    className="flex h-full gap-px overflow-hidden rounded-[3px] transition-[width,opacity] duration-700 ease-ohq"
                    style={{
                      width: `${(row.pct / widest) * 100}%`,
                      opacity: selected && !active ? 0.42 : 1,
                    }}
                  >
                    {stack.map((s, i) => (
                      <span
                        key={s.id}
                        className="h-full transition-[width] duration-700 ease-ohq"
                        style={{ width: `${shares[i]}%`, background: s.color }}
                      />
                    ))}
                  </span>
                </span>

                {/* What the bar is long *because of*. One decimal, the same as
                    the gender row, so the two halves of this panel read as one
                    table rather than as two different instruments. */}
                <span
                  className={`${
                    rail ? "w-[38px]" : "w-[46px]"
                  } shrink-0 text-right font-mono text-[10.5px] tabular-nums transition-colors duration-300 ${
                    active ? "text-cream-bright" : "text-cream"
                  }`}
                >
                  {rail ? Math.round(row.pct) : row.pct.toFixed(1)}%
                </span>

                <span
                  className={`${
                    rail ? "w-[26px]" : "w-[34px]"
                  } shrink-0 text-right font-mono text-[10.5px] tabular-nums transition-colors duration-300`}
                  style={{
                    color:
                      swing === 0
                        ? "var(--color-dim)"
                        : swing > 0
                          ? "var(--color-positive-light)"
                          : "var(--color-negative-light)",
                  }}
                >
                  {swing > 0 ? `+${swing}` : swing}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
