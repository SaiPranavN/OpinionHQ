"use client";

import { useRef, useState } from "react";

import { Brand } from "@/components/ui/Brand";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { formatNumber, trendPoints, trendValues } from "@/lib/derive";
import type { DecoratedTopic, TrendMarker } from "@/lib/types";

const AXIS_LABELS = ["30d ago", "22d", "15d", "7d", "Today"];

/** Points in the sampled series — matches `trendPoints` in lib/derive. */
const SAMPLES = 15;

function dayLabel(i: number): string {
  const daysAgo = Math.round(((SAMPLES - 1 - i) / (SAMPLES - 1)) * 30);
  if (daysAgo === 0) return "Today";
  return `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
}

interface SentimentTrendProps {
  topic: DecoratedTopic;
  markers: TrendMarker[];
}

/**
 * Sentiment over 30 days, with verified developments plotted on it.
 *
 * Interactive: moving across the plot snaps a crosshair to the nearest sampled
 * day and reads out both lines at that point, so "when did this turn?" is a
 * question the chart can actually answer rather than one a reader has to
 * estimate by eye. The full series is still summarised in the `aria-label`, and
 * the numbered pins remain keyed to the list below — nothing is available only
 * on hover.
 */
export function SentimentTrend({ topic, markers }: SentimentTrendProps) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  // No votes means no history — an interpolated curve here would be fiction.
  if (topic.unrated) {
    return (
      <figure className="ohq-panel m-0 flex min-w-0 flex-[3_1_440px] flex-col justify-center gap-3 p-5 text-center sm:p-7">
        <figcaption className="ohq-eyebrow text-left">
          Sentiment trend · last 30 days
        </figcaption>
        <p className="m-0 py-10 text-[14px] leading-[1.6] text-dim">
          No trend to plot yet. Once votes come in, this chart shows how sentiment
          moved and marks the verified developments that moved it.
        </p>
      </figure>
    );
  }

  // The same sampled series the paths are drawn from, so the crosshair lands
  // exactly on the line rather than near it.
  const neg = trendPoints(topic.neg - topic.change.value, topic.neg);
  const pos = trendPoints(topic.pos + topic.change.value, topic.pos);
  const negSeries = trendValues(topic.neg - topic.change.value, topic.neg);
  const posSeries = trendValues(topic.pos + topic.change.value, topic.pos);

  // Marker positions come from event dates and can land anywhere, including on
  // top of each other. Parsed once so the guide line and its pin always agree.
  const markerPositions = markers.map((marker) => {
    const parsed = Number.parseFloat(marker.left);
    return { pct: Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 100) : 50 };
  });

  return (
    <figure className="ohq-panel m-0 flex min-w-0 flex-[3_1_440px] flex-col gap-5 p-5 sm:p-7">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3.5">
        <span className="ohq-eyebrow">Sentiment trend · last 30 days</span>
        <span className="flex gap-4 text-[12.5px] text-muted">
          <span className="flex items-center gap-[7px]">
            <span className="h-0.5 w-3.5 bg-negative" />
            Negative
          </span>
          <span className="flex items-center gap-[7px]">
            <span className="h-0.5 w-3.5 bg-positive" />
            Positive
          </span>
        </span>
      </figcaption>

      {/* Top padding leaves room for the pins to sit on the chart's edge. */}
      <div
        ref={plotRef}
        className="relative w-full pt-2.5"
        onMouseMove={(e) => {
          const box = plotRef.current?.getBoundingClientRect();
          if (!box || box.width === 0) return;
          const ratio = (e.clientX - box.left) / box.width;
          setHover(
            Math.min(
              Math.max(Math.round(ratio * (SAMPLES - 1)), 0),
              SAMPLES - 1,
            ),
          );
        }}
        onMouseLeave={() => setHover(null)}
      >
        {hover !== null ? (
          <ChartTooltip
            // Sits inside the plot rather than above it: the panel has no room
            // overhead, and a tooltip that escapes its card reads as a bug.
            x={(hover / (SAMPLES - 1)) * 100}
            y={34}
            title={dayLabel(hover)}
            rows={[
              { label: "Negative", value: `${negSeries[hover]}%`, color: "#E5484D" },
              { label: "Positive", value: `${posSeries[hover]}%`, color: "#1DB954" },
              { label: "Share of votes cast that day", value: "", note: true },
            ]}
          />
        ) : null}
        <svg
          viewBox="0 0 800 260"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Sentiment trend over the last 30 days, with verified developments marked. Negative share ends at ${topic.neg} percent and positive at ${topic.pos} percent, of ${formatNumber(topic.participants)} participants.`}
          className="block h-[clamp(200px,26vw,300px)] w-full"
        >
          <g stroke="color-mix(in oklab, var(--color-veil) 6%, transparent)" strokeWidth="1">
            <line x1="0" y1="40" x2="800" y2="40" />
            <line x1="0" y1="90" x2="800" y2="90" />
            <line x1="0" y1="140" x2="800" y2="140" />
            <line x1="0" y1="190" x2="800" y2="190" />
            <line x1="0" y1="240" x2="800" y2="240" />
          </g>
          {/* A guide line per verified development, at the date it happened,
              so the pin below it points at something real. */}
          {markerPositions.map(({ pct }, i) => (
            <line
              key={i}
              x1={(pct / 100) * 800}
              y1="0"
              x2={(pct / 100) * 800}
              y2="240"
              stroke="rgba(29,185,84,0.28)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
          ))}
          <path
            data-line
            d={topic.negPath}
            fill="none"
            stroke="#E5484D"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            data-line
            d={topic.posPath}
            fill="none"
            stroke="#1DB954"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Crosshair. Drawn last so it sits over both lines. */}
          {hover !== null ? (
            <g pointerEvents="none">
              <line
                x1={neg[hover]!.x}
                y1="0"
                x2={neg[hover]!.x}
                y2="240"
                stroke="color-mix(in oklab, var(--color-veil) 28%, transparent)"
                strokeWidth="1"
              />
              <circle cx={neg[hover]!.x} cy={neg[hover]!.y} r="5" fill="#E5484D" />
              <circle cx={pos[hover]!.x} cy={pos[hover]!.y} r="5" fill="#1DB954" />
            </g>
          ) : null}
        </svg>

        {/* Just a numbered pin on the line. The text lives in the key below,
            where it has a full row and never has to be truncated. */}
        {markerPositions.map(({ pct }, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-full border border-positive/45 bg-ink/94 font-mono text-[9.5px] text-positive-light"
            style={{ left: `clamp(9px, ${pct}%, calc(100% - 9px))`, top: "-9px" }}
          >
            {i + 1}
          </span>
        ))}
      </div>

      <div className="flex justify-between font-mono text-[10px] tracking-[0.08em] text-dim">
        {AXIS_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      {markers.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-1.5 border-t border-line p-0 pt-3.5">
          {markers.map((marker, i) => (
            <li
              key={marker.label}
              className="flex items-baseline gap-2 text-[12px] leading-[1.45] text-muted"
            >
              <span
                aria-hidden
                className="grid h-[16px] w-[16px] shrink-0 translate-y-[2px] place-items-center rounded-full border border-positive/40 font-mono text-[9px] text-positive-light"
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="sr-only">Verified development {i + 1}: </span>
                {marker.label}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <p className="m-0 border-t border-line pt-3.5 text-[12.5px] leading-[1.5] text-dim">
        Numbered points are editor-published verified developments. Percentages are
        shares of daily votes cast by <Brand /> participants.
      </p>
    </figure>
  );
}
