"use client";

import { useState } from "react";

import { Brand } from "@/components/ui/Brand";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { formatNumber } from "@/lib/derive-poll";
import type { DecoratedPoll, PollSplitRow } from "@/lib/types";

/**
 * Cross-tabs: how each slice of the audience divided.
 *
 * A single headline bar hides the interesting part. Showing the same split per
 * region, age band and occupation is what turns a poll result into something
 * worth reading — and it is where the disagreements actually live.
 *
 * With three or four options a row cannot legibly print every percentage, so
 * the bar carries the shape and hovering a segment reads out the exact figure.
 * The row's own `aria-label` still states every share, so nothing is available
 * only on hover.
 */
export function PollAudience({ poll }: { poll: DecoratedPoll }) {
  // Nobody has voted, so there is no audience — the only case left now that the
  // ten-vote reporting threshold is gone.
  if (poll.unvoted) {
    return (
      <section aria-label="Who voted" className="ohq-panel flex flex-col gap-2 p-5 sm:p-7">
        <span className="ohq-eyebrow">Who voted</span>
        <p className="m-0 text-[13.5px] leading-[1.6] text-dim">
          Nobody has voted yet, so there is no audience to break down. The cross-tabs
          appear as soon as somebody does.
        </p>
      </section>
    );
  }

  const blocks: [string, string, PollSplitRow[]][] = [
    ["Where votes came from", "Self-reported location", poll.regions],
    ["By age", "Self-reported age band", poll.ageGroups],
    ["By occupation", "Self-reported occupation", poll.occupations],
  ];

  const leansName = (row: PollSplitRow) =>
    poll.options.find((o) => o.id === row.leans)?.name ?? "";

  return (
    <section aria-label="Who voted" className="flex flex-col gap-[clamp(14px,1.6vw,20px)]">
      {poll.contrarian ? (
        <div
          className="flex flex-col gap-1.5 rounded-[16px] border p-5"
          style={{
            borderColor: "rgba(240,168,60,0.3)",
            background: "rgba(240,168,60,0.06)",
          }}
        >
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#F0A83C]">
            Against the grain
          </span>
          <p className="m-0 text-[14.5px] leading-[1.55] text-soft">
            <strong className="font-semibold text-cream-bright">
              {poll.contrarian.label}
            </strong>{" "}
            is the one group that went another way —{" "}
            <strong
              className="font-semibold"
              style={{
                color:
                  poll.options.find((o) => o.id === poll.contrarian!.leans)?.color ??
                  poll.runnerUp.color,
              }}
            >
              {Math.max(...poll.contrarian.pcts)}% for {leansName(poll.contrarian)}
            </strong>{" "}
            against {poll.leader.pct}% for {poll.leader.name} overall.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-[clamp(14px,1.6vw,20px)]">
        {blocks.map(([title, note, rows]) => (
          <figure
            key={title}
            className="ohq-panel m-0 flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-5 sm:p-7"
          >
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="ohq-eyebrow">{title}</span>
              <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-dim">
                {note}
              </span>
            </figcaption>

            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {rows.map((row) => (
                <li key={row.label} className="flex flex-col gap-1.5">
                  <span className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="text-soft">{row.label}</span>
                    <span className="font-mono text-[10.5px] text-dim">
                      {formatNumber(row.voters)} {row.voters === 1 ? "vote" : "votes"}
                    </span>
                  </span>

                  <SplitRowBar poll={poll} row={row} />

                  <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[11px] text-dim">
                    {poll.options.map((option, i) => (
                      <span key={option.id} style={{ color: option.textColor }}>
                        {row.pcts[i]}%
                      </span>
                    ))}
                    <span className="ml-auto">
                      {row.leans === "even" ? "dead even" : `leans ${leansName(row)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </figure>
        ))}
      </div>

      <p className="m-0 text-[12px] leading-[1.55] text-dim">
        Location, age and occupation are optional and self-declared, shared by{" "}
        {poll.demographicOptIn}% of voters. Segments are only ever shown as
        percentages of that segment — never as individuals. Percentages describe
        the {formatNumber(poll.total)} <Brand /> participants who voted here, not the
        public.
      </p>
    </section>
  );
}

function SplitRowBar({ poll, row }: { poll: DecoratedPoll; row: PollSplitRow }) {
  const [active, setActive] = useState<number | null>(null);
  const label = poll.options
    .map((option, i) => `${option.name} ${row.pcts[i]} percent`)
    .join(", ");

  const anchor =
    active === null
      ? 50
      : row.pcts.slice(0, active).reduce((sum, p) => sum + p, 0) +
        (row.pcts[active] ?? 0) / 2;

  return (
    <div className="relative">
      {active !== null ? (
        <ChartTooltip
          x={anchor}
          y={0}
          title={row.label}
          rows={[
            {
              label: poll.options[active]!.name,
              value: `${row.pcts[active]}%`,
              color: poll.options[active]!.color,
            },
            {
              label: `${formatNumber(Math.round((row.voters * (row.pcts[active] ?? 0)) / 100))} of ${formatNumber(row.voters)} in this group`,
              value: "",
              note: true,
            },
          ]}
        />
      ) : null}
      <div
        role="img"
        aria-label={`${row.label}: ${label}`}
        className="flex h-2.5 w-full gap-[2px]"
        onMouseLeave={() => setActive(null)}
      >
        {poll.options.map((option, i) => (
          <span
            key={option.id}
            onMouseEnter={() => setActive(i)}
            className="rounded-[2px] transition-opacity duration-300"
            style={{
              width: `${row.pcts[i]}%`,
              background: option.color,
              opacity: active !== null && active !== i ? 0.4 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
