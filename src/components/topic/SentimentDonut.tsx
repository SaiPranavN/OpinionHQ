"use client";

import { useState } from "react";

import { formatNumber } from "@/lib/derive";
import type { DecoratedTopic } from "@/lib/types";

/**
 * The sentiment donut.
 *
 * Interactive both ways round: hovering a ring segment highlights its legend
 * row, and hovering a legend row highlights the segment. Whichever half of the
 * chart a reader points at, the other half answers — a legend that is only a
 * key is a wasted third of the panel.
 *
 * The centre swaps from the dominant view to whatever is being pointed at, so
 * the biggest type on the chart always describes the thing under the cursor.
 * Every row is a real `<button>`, so the same detail is reachable by keyboard.
 */
export function SentimentDonut({ topic }: { topic: DecoratedTopic }) {
  const [active, setActive] = useState<number | null>(null);

  // Theme variables rather than literals: these colour the ring *and* the
  // centre read-out, and the light theme needs a darker green and red for the
  // text to clear contrast against white.
  const rows = [
    { label: "Positive", color: "var(--color-positive)", icon: "▲", pct: topic.pos, count: topic.posCount, arc: topic.posArc },
    { label: "Neutral", color: "var(--color-neutral)", icon: "●", pct: topic.neu, count: topic.neuCount, arc: topic.neuArc },
    { label: "Negative", color: "var(--color-negative)", icon: "▼", pct: topic.neg, count: topic.negCount, arc: topic.negArc },
  ];

  // Drawn negative-first so the largest slice sits underneath the smaller ones.
  const drawOrder = [2, 1, 0];
  const focused = active === null ? null : rows[active]!;

  return (
    <figure className="ohq-panel m-0 flex min-w-0 flex-[1_1_300px] flex-col gap-5 p-5 sm:p-7">
      <figcaption className="ohq-eyebrow">Sentiment distribution</figcaption>

      <div
        className="relative aspect-square w-[min(100%,240px)] self-center"
        onMouseLeave={() => setActive(null)}
      >
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={topic.barsLabel}
          className="block h-full w-full -rotate-90"
        >
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="color-mix(in oklab, var(--color-veil) 5%, transparent)"
            strokeWidth="17"
          />
          {drawOrder.map((i) => {
            const row = rows[i]!;
            const dim = active !== null && active !== i;
            return (
              <circle
                key={row.label}
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={row.color}
                strokeWidth={active === i ? 21 : 17}
                strokeDasharray={row.arc.dash}
                strokeDashoffset={row.arc.offset}
                opacity={dim ? 0.32 : 1}
                onMouseEnter={() => setActive(i)}
                className="cursor-default transition-[opacity,stroke-width] duration-300 ease-ohq"
              />
            );
          })}
        </svg>

        {/* The centre answers whatever is being pointed at, falling back to the
            dominant view when nothing is. */}
        <div className="pointer-events-none absolute inset-[22%] flex flex-col items-center justify-center gap-0.5 text-center">
          <span
            className="font-serif text-[clamp(2rem,4vw,2.7rem)] leading-none transition-colors duration-300"
            style={{ color: focused ? focused.color : topic.dominantVar }}
          >
            {focused ? focused.pct : topic.dominantPct}%
          </span>
          <span
            className="text-[13px] font-semibold tracking-[-0.01em] transition-colors duration-300"
            style={{ color: focused ? focused.color : topic.dominantVar }}
          >
            {focused ? focused.label : topic.dominant}
          </span>
          <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-dim">
            {focused ? `${formatNumber(focused.count)} people` : "dominant view"}
          </span>
        </div>
      </div>

      <ul
        className="m-0 flex list-none flex-col gap-[3px] p-0 text-[13px] text-muted"
        onMouseLeave={() => setActive(null)}
      >
        {rows.map((row, i) => (
          <li key={row.label}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${row.label}: ${row.pct} percent, ${formatNumber(row.count)} people`}
              className="flex w-full cursor-default items-center gap-[9px] rounded-[7px] px-1.5 py-1.5 text-left transition-colors duration-300 outline-none hover:bg-veil/4 focus-visible:ring-2 focus-visible:ring-positive/60"
              style={{ opacity: active !== null && active !== i ? 0.45 : 1 }}
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-[2px]"
                style={{ background: row.color }}
              />
              <span aria-hidden className="text-[8px]" style={{ color: row.color }}>
                {row.icon}
              </span>
              {row.label}
              <span className="ml-auto font-mono whitespace-nowrap text-cream">
                {row.pct}% · {formatNumber(row.count)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="m-0 border-t border-line pt-4 text-[13px] leading-[1.5] text-soft">
        {topic.sampleLabel}. Self-selected sample — not a representative poll of the
        public.
      </p>
    </figure>
  );
}
