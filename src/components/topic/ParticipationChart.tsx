/**
 * Daily engagement — when anything has actually been counted.
 *
 * THIS USED TO DRAW THIRTY BARS FROM A SINE WAVE. `participationBars` took
 * `topic.participants % 7` as a seed and produced
 * `34 + |sin((i + seed) × 1.37)| × 52`, plus a lift on the last nine bars so
 * every topic appeared to be gaining momentum. It was labelled as daily
 * participation. A topic published this morning showed a month of rising
 * engagement, and every topic on the site trended upward, because the function
 * could not produce anything else.
 *
 * `topic_daily_stats` is the table this belongs in and has no writer yet. Until
 * a job fills it there is nothing to draw, and saying so is the only honest
 * thing the panel can do.
 */

import type { DecoratedTopic } from "@/lib/types";

import { formatNumber } from "@/lib/derive";

export function ParticipationChart({ topic }: { topic: DecoratedTopic }) {
  return (
    <section className="ohq-panel flex flex-col gap-3 p-5 sm:p-7">
      <span className="ohq-eyebrow">Daily engagement</span>
      <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.6] text-dim">
        {topic.unrated ? (
          "No participation recorded yet."
        ) : (
          <>
            {formatNumber(topic.participants)}{" "}
            {topic.participants === 1 ? "person has" : "people have"} taken part so
            far. Day-by-day figures are not kept yet, so there is no daily series to
            plot — the total is a count; a history would have to be measured.
          </>
        )}
      </p>
    </section>
  );
}
