"use client";

/**
 * How the split moved over time.
 *
 * A line per option, each labelled at its right-hand end with the option's
 * name and where it finished — the shape the reference uses, and the reason it
 * works: at the moment a reader's eye leaves the chart it is already on the
 * answer, with no legend round-trip and no reliance on colour alone.
 *
 * Interactive on the same terms as the sentiment trend: moving across the plot
 * snaps a crosshair to the nearest recorded reading and reads every option at
 * that date. Recorded readings, not interpolated ones — the crosshair can only
 * land where a measurement exists, so it can never report a number nobody took.
 */

import { useRef, useState } from "react";

import { ChartTooltip } from "@/components/ui/ChartTooltip";
import {
  decorateHistory,
  HISTORY_VIEWBOX,
  monthYear,
  movementLabel,
  shortDate,
  type HistorySeries,
} from "@/lib/derive-history";
import type { DecoratedPoll } from "@/lib/types";

export function PollHistory({ poll }: { poll: DecoratedPoll }) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const history = decorateHistory(poll);

  // Nothing recorded. Said plainly rather than drawn from today's numbers:
  // a curve invented from a single reading is the one thing this section must
  // not put on screen.
  if (!history) {
    return (
      <section className="ohq-panel flex flex-col gap-3 p-5 sm:p-7">
        <span className="ohq-eyebrow">How the split moved</span>
        <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.6] text-dim">
          No earlier readings recorded for this poll. Once the split has been
          measured more than once, the movement between those readings appears
          here — this chart only ever plots readings that were actually taken.
        </p>
      </section>
    );
  }

  const { series, dates, pcts, markers, axis, summary, readings, from, to } =
    history;
  const span = Math.max(dates.length - 1, 1);

  return (
    <section className="ohq-panel flex flex-col gap-5 p-5 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="ohq-eyebrow">How the split moved</span>
        <span className="text-[12px] text-dim">
          {readings} readings · {monthYear(from)} – {monthYear(to)}
        </span>
      </header>

      <div
        ref={plotRef}
        // Right padding leaves room for the end labels, which sit outside the
        // plot so a line never runs underneath its own caption.
        className="relative w-full pr-[clamp(96px,22%,190px)]"
        onMouseMove={(e) => {
          const box = plotRef.current?.getBoundingClientRect();
          if (!box || box.width === 0) return;
          // Measured against the plot, not the padded box, so the crosshair
          // does not drift as the label gutter changes width.
          const plotWidth = box.width - labelGutter(box.width);
          const ratio = (e.clientX - box.left) / plotWidth;
          setHover(Math.min(Math.max(Math.round(ratio * span), 0), span));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {hover !== null ? (
          <ChartTooltip
            x={(hover / span) * 100}
            y={20}
            title={shortDate(dates[hover]!)}
            rows={[
              ...series.map((s, i) => ({
                label: s.name,
                value: `${pcts[hover]?.[i] ?? 0}%`,
                color: s.color,
              })),
              ...(markers.find((m) => m.date === dates[hover])
                ? [
                    {
                      label:
                        markers.find((m) => m.date === dates[hover])!.label,
                      value: "",
                      note: true,
                    },
                  ]
                : []),
            ]}
          />
        ) : null}

        <svg
          viewBox={`0 0 ${HISTORY_VIEWBOX.width} ${HISTORY_VIEWBOX.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`How the split moved. ${summary}`}
          className="block h-[clamp(190px,25vw,290px)] w-full"
        >
          <g stroke="color-mix(in oklab, var(--color-veil) 6%, transparent)" strokeWidth="1">
            {[40, 96, 152, 208, 262].map((y) => (
              <line key={y} x1="0" y1={y} x2={HISTORY_VIEWBOX.width} y2={y} />
            ))}
          </g>

          {/* A guide line at each reading that carries an event. */}
          {markers.map((marker, i) => (
            <line
              key={i}
              x1={marker.x}
              y1="8"
              x2={marker.x}
              y2="262"
              stroke="color-mix(in oklab, var(--color-veil) 16%, transparent)"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
          ))}

          {series.map((s) => (
            <path
              key={s.optionId}
              d={s.path}
              fill="none"
              stroke={s.color}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Crosshair last, so it sits over every line. */}
          {hover !== null ? (
            <g pointerEvents="none">
              <line
                x1={(hover / span) * HISTORY_VIEWBOX.width}
                y1="8"
                x2={(hover / span) * HISTORY_VIEWBOX.width}
                y2="262"
                stroke="color-mix(in oklab, var(--color-veil) 28%, transparent)"
                strokeWidth="1"
              />
              {series.map((s) => (
                <circle
                  key={s.optionId}
                  cx={s.points[hover]!.x}
                  cy={s.points[hover]!.y}
                  r="4.5"
                  fill={s.color}
                />
              ))}
            </g>
          ) : null}
        </svg>

        {/* End labels, in the gutter. Positioned from the final y of each line
            and nudged apart when two options finish close together, because
            two overlapping labels is worse than one imprecise one. */}
        {stackLabels(series).map(({ s, top }) => (
          <span
            key={s.optionId}
            className="absolute left-full flex -translate-x-full flex-col leading-[1.15] whitespace-nowrap"
            style={{ top: `${top}%`, width: "clamp(92px, 21%, 186px)" }}
          >
            <span
              className="text-[12px] font-semibold"
              style={{ color: s.textColor }}
            >
              {s.name}
            </span>
            <span
              className="font-display font-bold text-[clamp(1.4rem,2.4vw,2rem)] tracking-[-0.02em] leading-none"
              style={{ color: s.textColor }}
            >
              {s.last}%
            </span>
            <span className="mt-0.5 font-mono text-[9.5px] tracking-[0.06em] uppercase text-dim">
              {movementLabel(s.change)}
            </span>
          </span>
        ))}
      </div>

      <div className="relative h-4">
        {axis.map((tick) => (
          <span
            key={`${tick.label}-${tick.left}`}
            className="absolute font-mono text-[10px] tracking-[0.06em] text-dim"
            style={{
              left: `clamp(0px, calc(${tick.left}% - ${tick.left / 3}px), 100%)`,
            }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      {markers.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-1.5 border-t border-line p-0 pt-3.5">
          {markers.map((marker) => (
            <li
              key={`${marker.date}-${marker.label}`}
              className="flex items-baseline gap-2.5 text-[12px] leading-[1.45] text-muted"
            >
              <span className="shrink-0 font-mono text-[10px] text-dim">
                {shortDate(marker.date)}
              </span>
              {marker.label}
            </li>
          ))}
        </ol>
      ) : null}

      <p className="m-0 border-t border-line pt-3.5 text-[12.5px] leading-[1.5] text-dim">
        Each point is a reading of the split on that date. The line between two
        readings is drawn, not measured — nothing was recorded in between.
      </p>
    </section>
  );
}

/** Matches the `pr-[clamp(96px,22%,190px)]` gutter, in pixels. */
function labelGutter(boxWidth: number): number {
  return Math.min(Math.max(boxWidth * 0.22, 96), 190);
}

/**
 * Vertical positions for the end labels, as percentages of the plot.
 *
 * Lines that finish within a few points of each other would render their
 * labels on top of one another; this walks down the sorted list and pushes any
 * label that would collide far enough clear. The number stays exact — only the
 * caption moves.
 */
function stackLabels(series: HistorySeries[]) {
  const MIN_GAP = 21;
  const sorted = [...series].sort(
    (a, b) => a.points[a.points.length - 1]!.y - b.points[b.points.length - 1]!.y,
  );
  let previous = -Infinity;
  return sorted.map((s) => {
    const y = s.points[s.points.length - 1]!.y;
    const asPct = (y / HISTORY_VIEWBOX.height) * 100;
    const top = Math.max(asPct - 6, previous + MIN_GAP);
    previous = top;
    return { s, top };
  });
}
