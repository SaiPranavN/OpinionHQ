"use client";

/**
 * Who took part, and where the split flips — for both dashboards.
 *
 * WHAT CHANGED, AND WHY IT MATTERS. These panels used to be four grey bar
 * charts that could only be read one at a time: how the states split, how the
 * ages split, how the occupations split, each in its own box, none of them
 * aware of the others. A grey bar answers "how many" and refuses "how did they
 * vote", which is the only question anybody came to a cross-tab with.
 *
 * Now every bar carries the group's own split in the same colours as the
 * distribution beside it, and every row is a filter. Clicking Karnataka re-reads
 * the ages, the occupations, the genders and the distribution as Karnataka —
 * because the data underneath is one joint distribution rather than four
 * separate summaries. See lib/audience/cells.ts.
 *
 * ONE BAR, TWO ENCODINGS. Length is how much of the sample the group is; the
 * stack inside it is how that group split. A breakdown that shows only size
 * cannot show disagreement, and one that shows only lean makes a group of four
 * look as important as a group of four hundred. The share is then printed as a
 * number beside it, because a bar is a comparison and a reader also wants a
 * reading.
 *
 * The swing chip is the finding, stated: how far this group sits from everybody
 * else currently in scope, in points, on whichever answer is winning. Measured
 * against the *leader* because the leader is the number the reader just looked
 * at, and because "+14 on option two" is not a sentence.
 */

import { useMemo, useState } from "react";

import { ScopeReading } from "@/components/audience/ScopeReading";
import {
  AUDIENCE_DIMS,
  DIM_LABEL,
  DIM_NOUN,
  contrarianOf,
  crossTab,
  readScope,
  scopeLabel,
  withDim,
  type AudienceCell,
  type AudienceDim,
  type AudienceFilter,
  type AudienceSeries,
} from "@/lib/audience/cells";

export function AudienceExplorer({
  cells,
  series,
  shape,
  noun,
  title,
  note,
  optIn,
  participants,
}: {
  cells: AudienceCell[];
  series: AudienceSeries[];
  /** How the in-scope distribution is drawn. See ScopeReading. */
  shape: "donut" | "bar";
  /** "participant" / "voter", singular. */
  noun: string;
  title: string;
  /** The provenance paragraph — what these figures are and are not. */
  note: React.ReactNode;
  optIn: number;
  participants: number;
}) {
  const [filter, setFilter] = useState<AudienceFilter>({});
  const width = series.length;

  const scope = useMemo(() => readScope(cells, filter, width), [cells, filter, width]);
  const odd = useMemo(() => contrarianOf(cells, filter, width), [cells, filter, width]);

  const pick = (dim: AudienceDim, value: string | undefined) =>
    setFilter((f) => withDim(f, dim, value));

  return (
    <section aria-label={title} className="ohq-panel flex flex-col gap-[clamp(16px,2vw,24px)] p-5 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <span className="ohq-eyebrow">{title}</span>
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-dim">
          Self-reported · {optIn}% shared something
        </span>
      </header>

      <p className="m-0 max-w-[680px] text-[13px] leading-[1.55] text-dim">
        Bar length is how much of the sample a group is. The stack inside it is how
        that group split. The figure on the right is how far that group sits from
        the reading beside it, in points, on whichever answer is currently leading —{" "}
        <strong className="font-medium text-soft">click any row</strong> to re-read
        every panel as that group.
      </p>

      <ScopeBar filter={filter} onPick={pick} onClear={() => setFilter({})} />

      <div className="grid grid-cols-1 gap-[clamp(16px,2vw,24px)] lg:grid-cols-[minmax(0,262px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-veil/2 p-4">
          {/* `scopeLabel` already says "Everyone" for an empty filter. */}
          <span className="ohq-eyebrow">{scopeLabel(filter)}</span>
          <ScopeReading
            shares={scope.shares}
            total={scope.total}
            series={series}
            scope={scopeLabel(filter)}
            shape={shape}
            noun={noun}
          />
        </div>

        <div className="flex flex-col gap-[clamp(16px,2vw,22px)]">
          {/* Two across only from `md`. Four full-width blocks is a very long
              scroll, but pairing them at `sm` left about seventy pixels for the
              bar and clipped "Self-employed or business owner" to two words —
              two unreadable columns are worse than one readable one. */}
          <div className="grid grid-cols-1 gap-[clamp(14px,1.8vw,20px)] md:grid-cols-2">
            {AUDIENCE_DIMS.map((dim) => (
              <DimBlock
                key={dim}
                dim={dim}
                cells={cells}
                series={series}
                filter={filter}
                onPick={pick}
              />
            ))}
          </div>

          {odd ? (
            <div
              className="flex flex-col gap-1.5 rounded-[14px] border p-4"
              style={{
                borderColor: "rgba(240,168,60,0.3)",
                background: "rgba(240,168,60,0.06)",
              }}
            >
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#F0A83C]">
                Against the grain
              </span>
              <p className="m-0 text-[13.5px] leading-[1.55] text-soft">
                <button
                  type="button"
                  onClick={() => pick(odd.dim, odd.label)}
                  className="cursor-pointer font-semibold text-cream-bright underline decoration-[rgba(240,168,60,0.4)] underline-offset-4 transition-colors hover:decoration-[#F0A83C]"
                >
                  {odd.label}
                </button>{" "}
                is the one {DIM_NOUN[odd.dim]} that goes another way —{" "}
                <strong
                  className="font-semibold"
                  style={{ color: series[odd.leaderIndex]?.text }}
                >
                  {odd.leaderPct}% {series[odd.leaderIndex]?.label.toLowerCase()}
                </strong>
                , against the {scope.shares[scope.leaderIndex] ?? 0}%{" "}
                {series[scope.leaderIndex]?.label.toLowerCase()} of everybody else in
                scope.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <p className="m-0 border-t border-line pt-4 text-[12.5px] leading-[1.55] text-dim">
        {note} Percentages describe the {participants.toLocaleString("en-IN")}{" "}
        {participants === 1 ? noun : `${noun}s`} here, not the public, and each
        column counts only the people who answered it — somebody who gave an age
        and no location is in the age figures and in none of the states.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- scope bar */

/**
 * What is currently selected, and the way back out.
 *
 * A filter you cannot see is a filter you forget you set, and then every number
 * on the page is quietly wrong in a way that looks like data. It renders as a
 * placeholder line when nothing is picked rather than disappearing, so applying
 * a filter does not shove the panel below it down the page.
 */
function ScopeBar({
  filter,
  onPick,
  onClear,
}: {
  filter: AudienceFilter;
  onPick: (dim: AudienceDim, value: string | undefined) => void;
  onClear: () => void;
}) {
  const active = AUDIENCE_DIMS.filter((dim) => filter[dim] !== undefined);

  return (
    <div className="flex min-h-[30px] flex-wrap items-center gap-2">
      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim">
        Reading
      </span>
      {active.length === 0 ? (
        <span className="text-[12.5px] text-muted">
          everybody — pick a row below to narrow it
        </span>
      ) : (
        <>
          {active.map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => onPick(dim, undefined)}
              aria-label={`Remove the ${DIM_NOUN[dim]} filter: ${filter[dim]}`}
              className="ohq-press inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-positive/35 bg-positive/10 py-[5px] pr-2.5 pl-3 text-[12.5px] text-positive-light transition-colors duration-300 outline-none hover:bg-positive/16 focus-visible:ring-2 focus-visible:ring-positive/60"
            >
              {filter[dim]}
              <span aria-hidden className="text-[13px] leading-none opacity-70">
                ×
              </span>
            </button>
          ))}
          {active.length > 1 ? (
            <button
              type="button"
              onClick={onClear}
              className="cursor-pointer font-mono text-[10px] tracking-[0.1em] uppercase text-muted underline decoration-veil/25 underline-offset-4 transition-colors hover:text-cream"
            >
              clear all
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- one column */

function DimBlock({
  dim,
  cells,
  series,
  filter,
  onPick,
}: {
  dim: AudienceDim;
  cells: AudienceCell[];
  series: AudienceSeries[];
  filter: AudienceFilter;
  onPick: (dim: AudienceDim, value: string | undefined) => void;
}) {
  const width = series.length;
  const selected = filter[dim];
  const { rows, scope, swingIndex } = useMemo(
    () => crossTab(cells, dim, filter, width),
    [cells, dim, filter, width],
  );
  const widest = Math.max(...rows.map((r) => r.pct), 1);

  return (
    <section className="flex flex-col gap-2.5">
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
        ) : swingIndex >= 0 ? (
          // Names what the right-hand column measures. Without it the sign is
          // ambiguous the moment the leading answer is not the green one.
          <span className="truncate font-mono text-[9px] tracking-[0.08em] uppercase text-dim">
            ± on {series[swingIndex]?.label}
          </span>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <p className="m-0 text-[12px] leading-[1.5] text-dim">
          {scope.empty
            ? "Nobody is in scope."
            : "Nobody in scope has given this."}
        </p>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((row) => {
          const active = selected === row.label;
          const readout = series
            .map((s, i) => `${s.label} ${row.shares[i]}%`)
            .join(" · ");

          return (
            <li key={row.label}>
              <button
                type="button"
                onClick={() => onPick(dim, active ? undefined : row.label)}
                aria-pressed={active}
                title={`${row.label} — ${row.count} of ${scope.total} · ${readout}`}
                aria-label={`${row.label}: ${row.pct} percent of those who answered ${DIM_LABEL[dim]}, ${series
                  .map((s, i) => `${s.label} ${row.shares[i]} percent`)
                  .join(", ")}${
                  swingIndex < 0
                    ? ""
                    : `, ${
                        row.swing === 0
                          ? "level with"
                          : `${Math.abs(Math.round(row.swing))} points ${row.swing > 0 ? "above" : "below"}`
                      } the reading on ${series[swingIndex]?.label}`
                }`}
                className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-[7px] text-left transition-[background,box-shadow] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                  active ? "bg-veil/7" : "hover:bg-veil/4"
                }`}
              >
                {/* Truncated rather than wrapped, so the bars stay on one
                    baseline and the column reads as a table. The full label is
                    in the row's `title` and in its `aria-label`, so nothing is
                    only available to somebody who can see the ellipsis. */}
                <span
                  className={`w-[104px] shrink-0 truncate text-[12.5px] transition-colors duration-300 lg:w-[92px] ${
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
                    {series.map((s, i) => (
                      <span
                        key={s.id}
                        className="h-full transition-[width] duration-700 ease-ohq"
                        style={{ width: `${row.shares[i]}%`, background: s.color }}
                      />
                    ))}
                  </span>
                </span>

                <span
                  className={`w-[44px] shrink-0 text-right font-mono text-[10.5px] tabular-nums transition-colors duration-300 ${
                    active ? "text-cream-bright" : "text-cream"
                  }`}
                >
                  {row.pct.toFixed(1)}%
                </span>

                <span
                  className="w-[32px] shrink-0 text-right font-mono text-[10.5px] tabular-nums transition-colors duration-300"
                  style={{
                    color:
                      swingIndex < 0 || Math.round(row.swing) === 0
                        ? "var(--color-dim)"
                        : row.swing > 0
                          ? "var(--color-positive-light)"
                          : "var(--color-negative-light)",
                  }}
                >
                  {Math.round(row.swing) > 0
                    ? `+${Math.round(row.swing)}`
                    : Math.round(row.swing)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
