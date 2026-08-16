"use client";

/**
 * How the reading moved, with the events that moved it.
 *
 * The chart the showcase exists for. A single headline number is a photograph;
 * this is the thing that says opinion has a shape over time and that the shape
 * usually has a cause sitting under it — which is why the two markers are
 * drawn *through* the plot rather than listed underneath it.
 *
 * Interactive on the same terms as components/polls/PollHistory.tsx: moving
 * across the plot snaps a crosshair to a recorded day and reads every series at
 * that day. The crosshair can only land on a day that exists, so it can never
 * report a figure between two readings.
 *
 * GEOMETRY NOTE. The plot stretches with `preserveAspectRatio="none"` so the
 * panel can be any width without the chart deciding its own height — and every
 * stroke carries `vectorEffect="non-scaling-stroke"` so nothing thickens when
 * it does. Anything that has to stay *round* (the crosshair dots) is an HTML
 * element positioned in percentages over the top, because a circle in a
 * stretched viewBox is an ellipse.
 */

import { useRef, useState } from "react";

import { ChartTooltip } from "@/components/ui/ChartTooltip";
import {
  POLL_OPTIONS,
  SENTIMENT_ROWS,
  type Mode,
  type TrendPoint,
} from "@/components/landing/showcase/data";

const VIEW = { w: 800, h: 300 } as const;
const PAD = { top: 16, bottom: 16 } as const;

interface Series {
  key: string;
  name: string;
  color: string;
  text: string;
  values: number[];
}

/** The series a mode plots. Neutral is left off the topic chart on purpose:
 *  three lines that sum to 100 make the third redundant and the plot busier. */
function seriesFor(mode: Mode, points: TrendPoint[]): Series[] {
  if (mode === "topic") {
    return [
      {
        key: "pos",
        name: SENTIMENT_ROWS[0].label,
        color: "var(--color-positive)",
        text: "var(--color-positive)",
        values: points.map((p) => p.sentiment[0]),
      },
      {
        key: "neg",
        name: SENTIMENT_ROWS[2].label,
        color: "var(--color-negative)",
        text: "var(--color-negative)",
        values: points.map((p) => p.sentiment[2]),
      },
    ];
  }
  return POLL_OPTIONS.map((option, i) => ({
    key: option.id,
    name: option.name,
    color: option.color,
    text: option.text,
    values: points.map((p) => p.poll[i] ?? 0),
  }));
}

export function DemoTrend({
  points,
  mode,
  scope,
}: {
  points: TrendPoint[];
  mode: Mode;
  scope: string;
}) {
  const plot = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const series = seriesFor(mode, points);
  const span = Math.max(points.length - 1, 1);

  const x = (i: number) => (i / span) * VIEW.w;
  const y = (pct: number) => PAD.top + (1 - pct / 100) * (VIEW.h - PAD.top - PAD.bottom);
  const path = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const markers = points.filter((p) => p.marker);
  const first = points[0];
  const last = points[points.length - 1];

  const track = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = plot.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const ratio = (event.clientX - box.left) / box.width;
    setHover(Math.min(Math.max(Math.round(ratio * span), 0), span));
  };

  const read = (i: number) => series.map((s) => s.values[i] ?? 0);

  return (
    // The left inset is the axis gutter. Everything in the block shares it, so
    // the participation strip stays on the same x-scale as the plot above it.
    <div className="flex flex-col gap-3.5 pl-[30px]">
      <div
        ref={plot}
        className="relative w-full touch-none"
        onMouseMove={track}
        onMouseLeave={() => setHover(null)}
      >
        {hover !== null ? (
          <ChartTooltip
            x={(hover / span) * 100}
            y={16}
            title={`Day ${points[hover]?.n ?? hover + 1}`}
            rows={[
              ...series.map((s, i) => ({
                label: s.name,
                value: `${read(hover)[i]}%`,
                color: s.color,
              })),
              ...(points[hover]?.marker
                ? [{ label: points[hover]!.marker!, value: "", note: true }]
                : []),
            ]}
          />
        ) : null}

        <svg
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${scope}: how the reading moved across ${points.length} days. ${series
            .map((s) => `${s.name} from ${s.values[0]} to ${s.values[s.values.length - 1]} percent`)
            .join("; ")}.`}
          className="block h-[clamp(168px,23vw,236px)] w-full overflow-visible"
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`ohq-demo-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.17" />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {[0, 25, 50, 75, 100].map((tick) => (
            <line
              key={tick}
              x1="0"
              x2={VIEW.w}
              y1={y(tick)}
              y2={y(tick)}
              stroke="color-mix(in oklab, var(--color-veil) 7%, transparent)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Events, drawn through the plot at the day they landed. */}
          {points.map((p, i) =>
            p.marker ? (
              <line
                key={`m-${p.n}`}
                x1={x(i)}
                x2={x(i)}
                y1={PAD.top - 8}
                y2={VIEW.h - PAD.bottom}
                stroke="color-mix(in oklab, var(--color-veil) 22%, transparent)"
                strokeWidth="1"
                strokeDasharray="3 6"
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}

          {series.map((s) => (
            <path
              key={`fill-${s.key}`}
              d={`${path(s.values)} L${VIEW.w} ${VIEW.h - PAD.bottom} L0 ${VIEW.h - PAD.bottom} Z`}
              fill={`url(#ohq-demo-fill-${s.key})`}
              className="transition-[d] duration-700 ease-ohq"
            />
          ))}

          {series.map((s) => (
            <path
              key={s.key}
              data-draw
              pathLength={1}
              d={path(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              // Every reading has the same 21 points, so `d` interpolates
              // cleanly when a cross-filter redraws the line. Where the browser
              // does not animate `d` it simply snaps, which is what it did
              // before — the transition is a bonus, not a dependency.
              className="transition-[d] duration-700 ease-ohq"
            />
          ))}

          {hover !== null ? (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top - 8}
              y2={VIEW.h - PAD.bottom}
              stroke="color-mix(in oklab, var(--color-veil) 32%, transparent)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ) : null}
        </svg>

        {/* The scale, so the empty half of a plot reads as headroom rather than
            as a chart that has been cropped. Three labels, not five — the
            gridlines are already at every 25. */}
        {[100, 50, 0].map((tick) => (
          <span
            key={tick}
            aria-hidden
            className="pointer-events-none absolute -left-[30px] w-[24px] -translate-y-1/2 text-right font-mono text-[9px] tabular-nums text-dim"
            style={{ top: `${(y(tick) / VIEW.h) * 100}%` }}
          >
            {tick}
          </span>
        ))}

        {/* Round things live up here, out of the stretched viewBox. */}
        {hover !== null
          ? series.map((s, i) => (
              <span
                key={`dot-${s.key}`}
                aria-hidden
                className="pointer-events-none absolute z-10 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-ink"
                style={{
                  background: s.color,
                  left: `${(hover / span) * 100}%`,
                  top: `${(y(read(hover)[i] ?? 0) / VIEW.h) * 100}%`,
                }}
              />
            ))
          : null}
      </div>

      <div className="flex items-baseline justify-between font-mono text-[10px] tracking-[0.06em] text-dim">
        <span>Day {first?.n ?? 1}</span>
        <span className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {series.map((s) => (
            <span key={s.key} style={{ color: s.text }}>
              ● {s.name}
            </span>
          ))}
        </span>
        <span>Day {last?.n ?? 1}</span>
      </div>

      {/* Daily participation, on the same axis as the plot above it — the
          "engagement" chart from the live topic page, folded in here because a
          spike in turnout is what explains a kink in the line. */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim">
          Daily participation
        </span>
        <div
          role="img"
          aria-label="Daily participation across the run, peaking on the two days an event landed."
          className="flex h-[34px] items-end gap-[2px]"
          onMouseLeave={() => setHover(null)}
        >
          {points.map((p, i) => {
            const peak = Math.max(...points.map((q) => q.arrivals));
            return (
              <span
                key={p.n}
                onMouseEnter={() => setHover(i)}
                style={{ height: `${Math.max((p.arrivals / peak) * 100, 8)}%` }}
                className={`min-w-[2px] flex-1 rounded-t-[2px] transition-[background,opacity] duration-300 ${
                  hover === i ? "bg-positive" : p.marker ? "bg-positive/60" : "bg-veil/22"
                }`}
              />
            );
          })}
        </div>
      </div>

      {markers.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-1.5 border-t border-line p-0 pt-3">
          {markers.map((p) => (
            <li
              key={p.n}
              className="flex items-baseline gap-2.5 text-[12px] leading-[1.45] text-muted"
            >
              <span className="shrink-0 font-mono text-[10px] text-dim">Day {p.n}</span>
              {p.marker}
              <span className="ml-auto shrink-0 font-mono text-[9.5px] tracking-[0.1em] uppercase text-positive-light">
                event
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
