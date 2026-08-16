import { safeExternalUrl } from "@/lib/safe-url";
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
 *
 * THE SOURCE IS PART OF THE CLAIM, not a footnote to it. This panel is the one
 * thing on the page that asserts a fact rather than measuring an opinion, and
 * for a while it carried the assertion without the evidence: a headline, a date,
 * a green tick reading "verified", and no way to check any of it. A reader who
 * wanted the article had to find the Timeline tab and the same event again. The
 * link belongs where the claim is made.
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
        {timeline.slice(0, 2).map((event) => {
          // Validated rather than trusted: the URL is typed by an editor and
          // rendered as an href for every reader, which is exactly the shape of
          // a stored-XSS hole. `noreferrer` as well as `noopener` — the
          // publisher has no business being told which topic sent the reader.
          const href = safeExternalUrl(event.srcUrl);
          return (
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
              {/* Named, whether or not it is reachable. "Source: The Hindu"
                  with no link is still a checkable claim; a bare headline is
                  not, and the panel calls itself verified either way. */}
              {event.src ? (
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-dim">
                    Source
                  </span>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12.5px] text-positive-light underline decoration-positive/30 underline-offset-4 outline-none transition-colors hover:decoration-positive/70 focus-visible:ring-2 focus-visible:ring-positive/60"
                    >
                      {event.src} ↗
                    </a>
                  ) : (
                    <span className="text-[12.5px] text-positive-light">{event.src}</span>
                  )}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
