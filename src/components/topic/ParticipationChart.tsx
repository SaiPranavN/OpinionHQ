/**
 * Daily engagement — one bar per day somebody actually voted.
 *
 * COUNTED, NOT GENERATED. The version this replaced drew thirty bars from
 * `34 + |sin((i + seed) × 1.37)| × 52` with a lift on the last nine, so every
 * topic on the site appeared to be gaining momentum and a topic published that
 * morning showed a month of history.
 *
 * The series comes from `topic_daily_series`, which groups `opinions` by the
 * day they were cast. A day nobody voted has no row and gets no bar — the axis
 * shows the days that exist rather than padding the month out to look busy.
 */

import { formatNumber } from "@/lib/derive";
import type { DecoratedTopic } from "@/lib/types";

/** Local, so a bar chart of one day does not render as a full-height block. */
const MIN_BAR_PCT = 6;

export function ParticipationChart({ topic }: { topic: DecoratedTopic }) {
  const series = topic.series;

  if (series.length === 0) {
    return (
      <Frame>
        <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.6] text-dim">
          No participation recorded yet. Every vote is stamped with the day it was
          cast, so this fills in as soon as somebody takes part.
        </p>
      </Frame>
    );
  }

  const peak = Math.max(...series.map((d) => d.votes));
  const total = series.reduce((sum, d) => sum + d.votes, 0);
  const busiest = series.reduce((best, d) => (d.votes > best.votes ? d : best), series[0]!);

  return (
    <Frame>
      <p className="m-0 text-[13px] leading-[1.5] text-muted">
        {formatNumber(total)} {total === 1 ? "vote" : "votes"} across{" "}
        {series.length} {series.length === 1 ? "day" : "days"}. Busiest:{" "}
        <strong className="font-medium text-soft">{dayLabel(busiest.date)}</strong> with{" "}
        {formatNumber(busiest.votes)}.
      </p>

      <div
        role="img"
        aria-label={`Daily participation across ${series.length} days, peaking at ${busiest.votes} on ${dayLabel(busiest.date)}`}
        className="flex h-[90px] items-end gap-[3px]"
      >
        {series.map((day) => {
          const height = Math.max((day.votes / peak) * 100, MIN_BAR_PCT);
          return (
            <span
              key={day.date}
              title={`${dayLabel(day.date)} · ${day.votes} ${day.votes === 1 ? "vote" : "votes"}`}
              style={{ height: `${height}%` }}
              className="min-w-[3px] flex-1 rounded-t-[2px] bg-positive/70 transition-colors hover:bg-positive"
            />
          );
        })}
      </div>

      <div className="flex justify-between font-mono text-[10px] tracking-[0.06em] text-dim">
        <span>{dayLabel(series[0]!.date)}</span>
        {series.length > 1 ? <span>{dayLabel(series[series.length - 1]!.date)}</span> : null}
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <section className="ohq-panel flex flex-col gap-3 p-5 sm:p-7">
      <span className="ohq-eyebrow">Daily engagement</span>
      {children}
    </section>
  );
}

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
