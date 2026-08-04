"use client";

import { useState } from "react";

import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { formatNumber } from "@/lib/derive";
import type { DecoratedTopic } from "@/lib/types";

/**
 * Daily participants over 30 days.
 *
 * The bars are shares of the busiest day rather than raw counts — the series is
 * derived, and printing an exact head count per day would claim a precision the
 * prototype does not have. Hovering reads out the day and an approximate count
 * derived from the topic's own total, labelled as approximate.
 */
export function ParticipationChart({ topic }: { topic: DecoratedTopic }) {
  const [active, setActive] = useState<number | null>(null);

  // A topic nobody has voted on has no series to draw. Rendering the bars
  // anyway would show 30 days of activity that never happened.
  if (topic.unrated) {
    return (
      <figure className="ohq-panel m-0 flex min-w-0 flex-[1_1_280px] flex-col gap-[18px] p-5 sm:p-7">
        <figcaption className="ohq-eyebrow">Daily participants · 30 days</figcaption>
        <div className="flex h-30 items-end gap-[3px]" aria-hidden>
          {Array.from({ length: 30 }, (_, i) => (
            <span
              key={i}
              className="min-w-0.5 flex-1 rounded-t-[2px] bg-veil/4"
              style={{ height: "6%" }}
            />
          ))}
        </div>
        <p className="m-0 text-[12.5px] leading-[1.5] text-dim">
          No participation yet. This chart fills in once people start voting.
        </p>
      </figure>
    );
  }

  const bars = topic.participationBars;
  const totalHeight = bars.reduce((sum, h) => sum + h, 0) || 1;
  const dayLabel = (i: number) =>
    i === bars.length - 1 ? "Today" : `${bars.length - 1 - i} days ago`;
  // Apportion the participant total across the series by bar height, so the
  // read-out reconciles with the headline instead of inventing a second number.
  const approxFor = (i: number) =>
    Math.round((bars[i]! / totalHeight) * topic.participants);

  return (
    <figure className="ohq-panel m-0 flex min-w-0 flex-[1_1_280px] flex-col gap-[18px] p-5 sm:p-7">
      <figcaption className="ohq-eyebrow">Daily participants · 30 days</figcaption>

      <div className="relative">
        {active !== null ? (
          <ChartTooltip
            x={((active + 0.5) / bars.length) * 100}
            y={0}
            title={dayLabel(active)}
            rows={[
              {
                label: "Participants",
                value: `≈ ${formatNumber(approxFor(active))}`,
                color: "#1DB954",
              },
              { label: "Apportioned from the topic total", value: "", note: true },
            ]}
          />
        ) : null}

        <div
          role="img"
          aria-label="Daily participation has risen over the last 30 days, ending at its highest level for this topic."
          className="flex h-30 items-end gap-[3px]"
          onMouseLeave={() => setActive(null)}
        >
          {bars.map((height, i) => (
            <span
              key={i}
              onMouseEnter={() => setActive(i)}
              className="min-w-0.5 flex-1 rounded-t-[2px] bg-linear-to-b from-[rgba(29,185,84,0.85)] to-[rgba(29,185,84,0.25)] transition-opacity duration-200"
              style={{
                height: `${height.toFixed(0)}%`,
                opacity: active !== null && active !== i ? 0.4 : 1,
              }}
            />
          ))}
        </div>
      </div>

      <p className="m-0 text-[12.5px] leading-[1.5] text-dim">
        Participation is rising, so recent sentiment reflects a larger and newer group
        than the early days of this topic.
      </p>
    </figure>
  );
}
