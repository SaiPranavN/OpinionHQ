import type { TimelineEvent } from "@/lib/types";

/**
 * The sourced record of what has actually happened, directly under the title.
 *
 * IT USED TO BE AT THE BOTTOM, inside the Overview tab, below every chart. That
 * is the wrong order for what this is: a reader arriving at a topic wants to
 * know what the subject *is* before they are told how people feel about it, and
 * a verified development is the only thing on the page that is a fact rather
 * than a measurement of opinion. Putting it under three panels of sentiment
 * made the editorial half look like an afterthought to the crowd half.
 *
 * Renders nothing when there is nothing sourced. An empty panel reading "no
 * updates" at the top of every young topic is worse than the space it saves —
 * the absence is only worth stating where somebody went looking for it, which
 * is why the Timeline tab still says so in words.
 */
export function VerifiedUpdates({ timeline }: { timeline: TimelineEvent[] }) {
  if (timeline.length === 0) return null;

  return (
    <section
      aria-label="Latest verified updates"
      className="ohq-panel flex flex-col gap-3.5 p-5 sm:p-6"
    >
      <span className="ohq-eyebrow">Latest verified updates</span>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {timeline.slice(0, 2).map((event) => (
          <li key={event.id} className="ohq-verified flex flex-col gap-1.5 px-4 py-3.5">
            <span className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[9.5px] tracking-[0.12em] whitespace-nowrap uppercase text-positive-light">
                <span aria-hidden>✓</span> Verified update
              </span>
              <time className="font-mono text-[11px] text-dim">{event.date}</time>
            </span>
            <span className="text-[14.5px] leading-[1.4] font-semibold text-cream-bright">
              {event.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
