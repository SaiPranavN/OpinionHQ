import type { DecoratedTopic } from "@/lib/types";

export function ParticipationChart({ topic }: { topic: DecoratedTopic }) {
  // A topic nobody has voted on has no series to draw. Rendering the bars
  // anyway would show 30 days of activity that never happened.
  if (topic.unrated) {
    return (
      <figure className="ohq-panel m-0 flex min-w-0 flex-[1_1_280px] flex-col gap-[18px] p-5 sm:p-7">
        <figcaption className="ohq-eyebrow">Daily participants · 30 days</figcaption>
        <div className="flex h-30 items-end gap-[3px]" aria-hidden>
          {Array.from({ length: 30 }, (_, i) => (
            <span key={i} className="min-w-0.5 flex-1 rounded-t-[2px] bg-white/4" style={{ height: "6%" }} />
          ))}
        </div>
        <p className="m-0 text-[12.5px] leading-[1.5] text-dim">
          No participation yet. This chart fills in once people start voting.
        </p>
      </figure>
    );
  }

  return (
    <figure className="ohq-panel m-0 flex min-w-0 flex-[1_1_280px] flex-col gap-[18px] p-5 sm:p-7">
      <figcaption className="ohq-eyebrow">Daily participants · 30 days</figcaption>
      <div
        role="img"
        aria-label="Daily participation has risen over the last 30 days, ending at its highest level for this topic."
        className="flex h-30 items-end gap-[3px]"
      >
        {topic.participationBars.map((height, i) => (
          <span
            key={i}
            className="min-w-0.5 flex-1 rounded-t-[2px] bg-linear-to-b from-[rgba(29,185,84,0.85)] to-[rgba(29,185,84,0.25)]"
            style={{ height: `${height.toFixed(0)}%` }}
          />
        ))}
      </div>
      <p className="m-0 text-[12.5px] leading-[1.5] text-dim">
        Participation is rising, so recent sentiment reflects a larger and newer group
        than the early days of this topic.
      </p>
    </figure>
  );
}
