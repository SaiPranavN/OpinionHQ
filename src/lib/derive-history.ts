/**
 * Geometry and read-out values for the poll history chart.
 *
 * Kept out of `derive-poll.ts` on purpose. Everything there is computed *from
 * the current counts* — it is arithmetic on a number the poll already holds.
 * Nothing here can be: a past reading is data or it is fiction, so this module
 * only ever shapes points somebody recorded, and returns null when nobody did.
 *
 * The chart it feeds is the one in the reference: a line per option across
 * time, each labelled at its right-hand end with the name and where it
 * finished, so the lines are readable without a legend and without colour
 * being the only signal.
 */

import { POLL_COLORS, pollTextVar } from "@/lib/derive-poll";
import type { DecoratedPoll, PollHistoryPoint } from "@/lib/types";

/** The viewBox every path below is expressed in. */
export const HISTORY_VIEWBOX = { width: 900, height: 300 } as const;

/** Vertical room left for the axis labels under the plot. */
const PLOT_BOTTOM = 262;
const PLOT_TOP = 18;

export interface HistorySeries {
  optionId: string;
  name: string;
  color: string;
  /** Theme-aware companion, for the end label — which is type, not a mark. */
  textColor: string;
  /** `M…L…` through every reading. */
  path: string;
  points: { x: number; y: number }[];
  /** Share at the last reading. */
  last: number;
  /** Change from the first reading, in points. */
  change: number;
}

export interface HistoryMarker {
  /** 0–100 across the plot. */
  left: number;
  x: number;
  label: string;
  date: string;
}

export interface DecoratedHistory {
  series: HistorySeries[];
  /** Every reading's date, for the crosshair read-out. */
  dates: string[];
  /** Shares per reading, aligned with `series` — `pcts[readingIndex][seriesIndex]`. */
  pcts: number[][];
  markers: HistoryMarker[];
  /** Axis labels: first, a few in between, last. */
  axis: { label: string; left: number }[];
  /** Highest share any option reached, for the y-axis ceiling. */
  ceiling: number;
  from: string;
  to: string;
  readings: number;
  /** One sentence stating what the chart shows, for `aria-label`. */
  summary: string;
}

/** `2026-03-14` → `Mar 14`. Kept short: axis labels compete for room. */
export function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** `2026-03-14` → `Mar 2026`, for the range summary. */
export function monthYear(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Shapes a recorded history for rendering.
 *
 * Returns null rather than an empty chart when there is nothing to draw, or
 * when a single reading is all there is — one point is a fact, not a trend,
 * and a chart drawn through it would imply a movement nobody observed.
 */
export function decorateHistory(poll: DecoratedPoll): DecoratedHistory | null {
  const history = poll.history;
  if (!history || history.length < 2) return null;

  const { width } = HISTORY_VIEWBOX;
  const span = history.length - 1;

  // The y-axis is scaled to the data rather than pinned to 0–100. An approval
  // series that lives between 38% and 62% is a flat line on a full axis, and
  // the movement is the entire point of the chart. Padded so the extremes are
  // never drawn against the frame, and floored at a 20-point window so a
  // genuinely stable poll does not get magnified into drama.
  const all = history.flatMap((point) => point.pcts);
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const mid = (rawMin + rawMax) / 2;
  const half = Math.max((rawMax - rawMin) / 2 + 4, 10);
  const min = Math.max(Math.floor(mid - half), 0);
  const max = Math.min(Math.ceil(mid + half), 100);
  const range = Math.max(max - min, 1);

  const xFor = (i: number) => (i / span) * width;
  const yFor = (pct: number) =>
    PLOT_BOTTOM - ((pct - min) / range) * (PLOT_BOTTOM - PLOT_TOP);

  const series: HistorySeries[] = poll.options.map((option, optionIndex) => {
    const points = history.map((reading, i) => ({
      x: xFor(i),
      y: yFor(reading.pcts[optionIndex] ?? 0),
    }));
    const first = history[0]!.pcts[optionIndex] ?? 0;
    const last = history[history.length - 1]!.pcts[optionIndex] ?? 0;
    return {
      optionId: option.id,
      name: option.name,
      // The line is a mark, so it keeps the option's fixed identity colour;
      // the end label is type, so it takes the theme-aware companion.
      color: POLL_COLORS[optionIndex % POLL_COLORS.length]!,
      textColor: pollTextVar(optionIndex),
      path: `M${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")}`,
      points,
      last,
      change: last - first,
    };
  });

  const markers: HistoryMarker[] = history.flatMap((reading, i) =>
    reading.event
      ? [
          {
            left: (i / span) * 100,
            x: xFor(i),
            label: reading.event,
            date: reading.date,
          },
        ]
      : [],
  );

  // Five axis labels at most. More than that and they collide on a phone.
  const step = Math.max(1, Math.round(span / 4));
  const axis: { label: string; left: number }[] = [];
  for (let i = 0; i <= span; i += step) {
    axis.push({ label: shortDate(history[i]!.date), left: (i / span) * 100 });
  }
  const lastAxis = axis[axis.length - 1];
  if (!lastAxis || lastAxis.left < 99) {
    axis.push({ label: shortDate(history[span]!.date), left: 100 });
  }

  const from = history[0]!.date;
  const to = history[span]!.date;
  const leader = [...series].sort((a, b) => b.last - a.last)[0]!;
  const mover = [...series].sort(
    (a, b) => Math.abs(b.change) - Math.abs(a.change),
  )[0]!;

  return {
    series,
    dates: history.map((h) => h.date),
    pcts: history.map((reading) =>
      poll.options.map((_, i) => reading.pcts[i] ?? 0),
    ),
    markers,
    axis,
    ceiling: max,
    from,
    to,
    readings: history.length,
    summary: `${history.length} readings between ${monthYear(from)} and ${monthYear(
      to,
    )}. ${leader.name} finished on ${leader.last} percent. Largest movement: ${
      mover.name
    } ${mover.change >= 0 ? "up" : "down"} ${Math.abs(mover.change)} points.`,
  };
}

/**
 * The plain-words summary of a single option's movement.
 *
 * "No change" rather than "up 0 points": a zero with a direction attached
 * reads as a measurement of nothing.
 */
export function movementLabel(change: number): string {
  if (change === 0) return "No change";
  return `${change > 0 ? "Up" : "Down"} ${Math.abs(change)} ${
    Math.abs(change) === 1 ? "point" : "points"
  }`;
}

/** Sums a reading, so a fixture that does not total 100 can be caught. */
export function readingTotal(point: PollHistoryPoint): number {
  return point.pcts.reduce((sum, pct) => sum + pct, 0);
}
