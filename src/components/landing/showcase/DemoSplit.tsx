"use client";

/**
 * The poll split bar, in miniature — the counterpart to DemoDonut.
 *
 * One track, one segment per option, each labelled inside its own fill so the
 * result reads without a legend and never relies on colour alone. Hovering or
 * focusing a segment dims the others and reads out the share; every segment is
 * a real button, so the detail is reachable by keyboard.
 *
 * The widths transition rather than snap, for the same reason the donut eases:
 * when a cross-filter changes the reading, the *movement* is the finding.
 */

import { useState } from "react";

import { POLL_OPTIONS } from "@/components/landing/showcase/data";

export function DemoSplit({
  shares,
  scope,
  height = 46,
}: {
  /** One share per option, whole numbers summing to 100. */
  shares: [number, number, number];
  scope: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);

  const leader = shares.indexOf(Math.max(...shares));
  const sorted = [...shares].sort((a, b) => b - a);
  const margin = (sorted[0] ?? 0) - (sorted[1] ?? 0);

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[13px] font-medium text-soft">
          <span
            className="font-display text-[19px] font-bold tracking-[-0.02em] tabular-nums"
            style={{ color: POLL_OPTIONS[leader]?.text }}
          >
            {shares[leader]}%
          </span>{" "}
          <span style={{ color: POLL_OPTIONS[leader]?.text }}>
            {POLL_OPTIONS[leader]?.name}
          </span>
        </span>
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-dim">
          {margin === 0
            ? "dead heat"
            : `${margin < 6 ? "narrow" : margin < 18 ? "clear" : "wide"} lead · +${margin}`}
        </span>
      </div>

      <div
        role="img"
        aria-label={`${scope}: ${POLL_OPTIONS.map((o, i) => `${o.name} ${shares[i]} percent`).join(", ")}.`}
        className="flex w-full gap-[3px]"
        style={{ height }}
        onMouseLeave={() => setActive(null)}
      >
        {POLL_OPTIONS.map((option, i) => (
          <button
            key={option.id}
            type="button"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${option.name}: ${shares[i]} percent`}
            className="flex cursor-default items-center justify-center rounded-[5px] font-semibold tabular-nums transition-[width,opacity] duration-700 ease-ohq outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{
              width: `${shares[i]}%`,
              background: option.color,
              color: option.ink,
              fontSize: Math.min(height * 0.36, 15),
              opacity: active !== null && active !== i ? 0.38 : 1,
            }}
          >
            {(shares[i] ?? 0) >= 12 ? `${shares[i]}%` : null}
          </button>
        ))}
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[12.5px]">
        {POLL_OPTIONS.map((option, i) => (
          <li
            key={option.id}
            className="flex min-w-0 items-center gap-2 transition-opacity duration-300"
            style={{ opacity: active !== null && active !== i ? 0.45 : 1 }}
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: option.color }}
            />
            <span className="truncate font-medium text-soft">{option.name}</span>
            <span className="font-mono text-[11px] tabular-nums text-dim">{shares[i]}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
