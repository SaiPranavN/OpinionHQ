"use client";

import { useState } from "react";

import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { formatNumber, pollInk } from "@/lib/derive-poll";
import type { DecoratedPoll } from "@/lib/types";

/**
 * The split bar. One track, one segment per option, each labelled with its own
 * percentage inside the fill so the result is readable without a legend and
 * without relying on colour alone.
 *
 * Interactive: hovering or focusing a segment dims the others and reads out the
 * option's name, share and vote count. Every segment is a real `<button>`, so
 * the same information is reachable by keyboard — a chart whose detail is only
 * available to a mouse is a chart half the readers cannot use.
 *
 * With three or four options a segment can get too narrow for its own label, so
 * the inline percentage drops out below 12% and the names row underneath
 * carries it instead.
 */
export function PollSplitBar({
  poll,
  height = 34,
  showNames = true,
  interactive = true,
}: {
  poll: DecoratedPoll;
  height?: number;
  showNames?: boolean;
  interactive?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (poll.unvoted) {
    return (
      <div className="flex flex-col gap-2">
        {showNames ? <NameRow poll={poll} active={null} /> : null}
        {/* An empty track, not an even fill — a fresh poll has no split, and
            showing one would read as a dead heat. */}
        <div
          role="img"
          aria-label={poll.splitLabel}
          className="w-full rounded-[4px] border border-dashed border-veil/12 bg-veil/3"
          style={{ height }}
        />
      </div>
    );
  }

  const hovered = active !== null ? poll.options[active] : undefined;
  // Anchor the tooltip over the middle of the hovered segment.
  const anchor =
    active === null
      ? 50
      : poll.options.slice(0, active).reduce((sum, o) => sum + o.pct, 0) +
        poll.options[active]!.pct / 2;

  return (
    <div className="flex flex-col gap-2">
      {showNames ? <NameRow poll={poll} active={active} /> : null}

      <div className="relative">
        {hovered ? (
          <ChartTooltip
            x={anchor}
            y={0}
            title={hovered.name}
            rows={[
              { label: "Share", value: `${hovered.pct}%`, color: hovered.color },
              { label: "Votes", value: formatNumber(hovered.votes) },
              ...(hovered.reasonCount > 0
                ? [
                    {
                      label: `${hovered.reasonCount} written ${hovered.reasonCount === 1 ? "reason" : "reasons"}`,
                      value: "",
                      note: true,
                    },
                  ]
                : []),
            ]}
          />
        ) : null}

        <div
          role="img"
          aria-label={poll.splitLabel}
          className="flex w-full gap-[3px] overflow-hidden"
          style={{ height }}
          onMouseLeave={() => setActive(null)}
        >
          {poll.options.map((option, i) => {
            const dim = active !== null && active !== i;
            const content = option.pct >= 12 ? `${option.pct}%` : null;
            const style = {
              width: `${option.pct}%`,
              background: option.color,
              color: pollInk(i),
              fontSize: Math.min(height * 0.42, 15),
              opacity: dim ? 0.42 : 1,
            };

            if (!interactive) {
              return (
                <span
                  key={option.id}
                  className="flex items-center justify-center rounded-[4px] font-semibold tabular-nums transition-[width] duration-700 ease-ohq"
                  style={style}
                >
                  {content}
                </span>
              );
            }

            return (
              <button
                key={option.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${option.name}: ${option.pct} percent, ${formatNumber(option.votes)} votes`}
                className="flex cursor-default items-center justify-center rounded-[4px] font-semibold tabular-nums transition-[width,opacity] duration-500 ease-ohq outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                style={style}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The names underneath.
 *
 * Two options sit at the outer edges, mirroring the bar. Three or four wrap as
 * an ordinary legend — spreading four names across the full width leaves the
 * middle two floating nowhere near their segments.
 */
function NameRow({ poll, active }: { poll: DecoratedPoll; active: number | null }) {
  if (poll.options.length === 2) {
    const [a, b] = poll.options;
    return (
      <div className="flex items-baseline justify-between gap-4 text-[12.5px]">
        <Name option={a!} dim={active === 1} />
        <Name option={b!} dim={active === 0} reverse />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-[12.5px]">
      {poll.options.map((option, i) => (
        <Name key={option.id} option={option} dim={active !== null && active !== i} />
      ))}
    </div>
  );
}

function Name({
  option,
  dim,
  reverse = false,
}: {
  option: DecoratedPoll["options"][number];
  dim: boolean;
  reverse?: boolean;
}) {
  return (
    <span
      className={`flex min-w-0 items-center gap-2 transition-opacity duration-300 ${
        reverse ? "flex-row-reverse" : ""
      }`}
      style={{ opacity: dim ? 0.45 : 1 }}
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: option.color }}
      />
      <span className="truncate font-medium text-soft">{option.name}</span>
    </span>
  );
}
