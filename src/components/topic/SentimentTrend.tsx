/**
 * How the split moved, plotted from readings that were actually taken.
 *
 * MEASURED, NOT EASED. The version this replaced ran `trendPoints` from two
 * constants — `today − 34` for negative and `today + 22` for positive — with a
 * sine wobble added, in the words of its own comment, "so the line reads as
 * sampled data rather than a straight interpolation". It was hoverable, so it
 * would read out a share for a specific day nobody had counted.
 *
 * Each point here is one day's cumulative split, built from the opinions cast
 * up to and including that day. Cumulative rather than per-day, because the
 * headline figure a reader sees is the share of everyone who has voted — a
 * per-day line would swing wildly on a quiet Tuesday and disagree with the
 * number at the top of the page.
 *
 * ONE READING IS NOT A TREND, and a line needs two points. A topic that ran for
 * a single day says so rather than drawing a flat line through one measurement.
 */

import type { DecoratedTopic, TopicDayReading } from "@/lib/types";

import { NEGATIVE, POSITIVE, formatNumber } from "@/lib/derive";

const VIEW = { w: 800, h: 220 } as const;
const PAD = { top: 14, bottom: 26, left: 6, right: 6 } as const;

interface Reading {
  date: string;
  pos: number;
  neg: number;
  total: number;
}

/**
 * Running totals, so each point is the split as it stood that day.
 *
 * `neu` is not plotted: three lines that sum to 100 make the third redundant
 * and the chart harder to read. It is in the donut above, at full precision.
 */
function cumulative(series: TopicDayReading[]): Reading[] {
  let pos = 0;
  let neg = 0;
  let all = 0;
  return series.map((day) => {
    pos += day.positive;
    neg += day.negative;
    all += day.votes;
    return {
      date: day.date,
      pos: Math.round((pos / all) * 100),
      neg: Math.round((neg / all) * 100),
      total: all,
    };
  });
}

export function SentimentTrend({ topic }: { topic: DecoratedTopic }) {
  const readings = cumulative(topic.series);

  if (readings.length < 2) {
    return (
      <Frame>
        <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.6] text-dim">
          {readings.length === 0
            ? "Nothing recorded yet. Once people have voted, how the split moved appears here."
            : `Everyone who has voted did so on the same day, so there is no movement to plot yet. The current split is ${topic.pos}% positive and ${topic.neg}% negative across ${formatNumber(topic.participants)} ${topic.participants === 1 ? "person" : "people"}.`}
        </p>
      </Frame>
    );
  }

  const plotW = VIEW.w - PAD.left - PAD.right;
  const plotH = VIEW.h - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (readings.length - 1)) * plotW;
  const y = (pct: number) => PAD.top + (1 - pct / 100) * plotH;
  const path = (pick: (r: Reading) => number) =>
    readings.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(pick(r)).toFixed(1)}`).join(" ");

  const last = readings[readings.length - 1]!;
  const first = readings[0]!;

  return (
    <Frame>
      <p className="m-0 text-[13px] leading-[1.5] text-muted">
        {readings.length} {readings.length === 1 ? "reading" : "readings"}, one per day
        anybody voted. Negative went from {first.neg}% to {last.neg}%.
      </p>

      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        role="img"
        aria-label={`Cumulative sentiment across ${readings.length} days. Negative ${first.neg}% to ${last.neg}%, positive ${first.pos}% to ${last.pos}%.`}
        className="w-full"
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <line
            key={tick}
            x1={PAD.left}
            x2={VIEW.w - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="currentColor"
            strokeWidth={1}
            className="text-veil/8"
          />
        ))}

        <path d={path((r) => r.neg)} fill="none" stroke={NEGATIVE} strokeWidth={2.4} />
        <path d={path((r) => r.pos)} fill="none" stroke={POSITIVE} strokeWidth={2.4} />

        {/* A dot per reading. The line between two of them is drawn, not
            measured, and the dots are what say where the measurements are. */}
        {readings.map((r, i) => (
          <g key={r.date}>
            <circle cx={x(i)} cy={y(r.neg)} r={3} fill={NEGATIVE} />
            <circle cx={x(i)} cy={y(r.pos)} r={3} fill={POSITIVE} />
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-[0.06em] text-dim">
        <span>{dayLabel(first.date)}</span>
        <span className="flex gap-3">
          <span style={{ color: POSITIVE }}>● positive</span>
          <span style={{ color: NEGATIVE }}>● negative</span>
        </span>
        <span>{dayLabel(last.date)}</span>
      </div>

      <p className="m-0 border-t border-line pt-3.5 text-[12.5px] leading-[1.5] text-dim">
        Each point is the split as it stood at the end of that day, across everyone who
        had voted by then. The line between two points is drawn, not measured — nothing
        was recorded in between.
      </p>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <section className="ohq-panel flex min-w-0 flex-[2_1_420px] flex-col gap-3 p-5 sm:p-7">
      <span className="ohq-eyebrow">How sentiment moved</span>
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
