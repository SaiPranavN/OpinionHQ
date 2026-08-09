/**
 * How sentiment moved over time — when anything has actually been recorded.
 *
 * THIS USED TO DRAW A 30-DAY CURVE THAT NOBODY MEASURED. `trendPoints` eased
 * from an invented starting share to today's figure, with a sine wobble added
 * "so the line reads as sampled data rather than a straight interpolation" —
 * which is an exact description of the problem. The starting point was
 * `today − 34` for negative and `today + 22` for positive: two constants. A
 * topic published an hour ago rendered a month of history, and the chart was
 * hoverable, so it would read out a specific share for a specific day that no
 * one had ever counted.
 *
 * `topic_daily_stats` exists to hold the real readings and has no writer yet.
 * Until a job fills it, this says so. That is the same rule the poll history
 * chart already follows: plot readings that were taken, and nothing else.
 */

import type { DecoratedTopic } from "@/lib/types";

export function SentimentTrend({ topic }: { topic: DecoratedTopic }) {
  return (
    <section className="ohq-panel flex flex-col gap-3 p-5 sm:p-7">
      <span className="ohq-eyebrow">How sentiment moved</span>
      <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.6] text-dim">
        {topic.unrated
          ? "Nothing recorded yet. Once people have voted and the split has been measured more than once, the movement between those readings appears here."
          : "No earlier readings recorded for this topic. The current split is known; how it got there is not, because nothing was measured before now. This chart only ever plots readings that were actually taken."}
      </p>
    </section>
  );
}
