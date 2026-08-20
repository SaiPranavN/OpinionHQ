"use client";

/**
 * The two mode cards, arriving on a conveyor.
 *
 * Each card starts off to the right and almost edge-on, and the visitor's own
 * scroll turns it to face them and slides it into place. The green card lands
 * first, the purple one follows. While that happens the section is pinned, so
 * the scroll gesture is spent turning cards rather than moving the page — which
 * is the effect being asked for: the movement is the cards', not the page's.
 *
 * ── Each card is one solid panel ────────────────────────────────────────────
 *
 * The cards themselves are unchanged and are not even defined here: they arrive
 * as children from the server component that renders them, and this only ever
 * wraps them in a div it transforms. Nothing inside a card is animated
 * separately, so a card reads as a physical object turning rather than as a
 * collection of elements that happen to be moving in convoy.
 *
 * ── Why they cannot collide ─────────────────────────────────────────────────
 *
 * Every card travels leftward *into* its own grid cell from a position to the
 * right of it, and the two cells never move. The green card does pass over the
 * purple card's cell on its way in — but the purple card is still edge-on and
 * transparent at that point, and has landed before the green one is anywhere
 * near solid. The bands overlap by design (see BAND_OVERLAP) so the two reads
 * as one continuous conveyor rather than two separate events, but the ordering
 * guarantees there is never a moment with two opaque cards in one column.
 */

import { ScrollScene } from "@/components/motion/ScrollScene";
import { bandOf, conveyorSeat, smooth } from "@/lib/motion/scene";

export function CardConveyor({
  header,
  cards,
}: {
  /** The eyebrow, heading and standfirst. Never pinned — see the note below. */
  header: React.ReactNode;
  cards: React.ReactNode[];
}) {
  return (
    <>
      {header}

      {/*
        Only the card row is pinned, not the whole section.

        The header is three or four lines of display type plus a standfirst; the
        cards are seven hundred pixels tall on their own. Pinned together they
        do not fit a laptop viewport, and a pinned block that overflows the
        screen is worse than no pin at all — it holds the page still while
        hiding the thing it is holding it still for. The heading has its own
        entrance anyway: it is a slot machine, and it plays on reveal.
      */}
      <ScrollScene distance={1.4} className="mt-[clamp(38px,6vw,70px)]">
        {({ progress, scrubbing }) => (
          <div
            className={
              scrubbing
                ? "flex min-h-svh items-center pt-[var(--ohq-nav-h)] pb-8"
                : ""
            }
          >
            <div
              className="grid w-full grid-cols-1 gap-[clamp(16px,2vw,24px)] lg:grid-cols-2"
              // Strong, and on the row rather than on a card: one perspective
              // origin shared by both is what makes them read as two objects on
              // one conveyor seen from one place, instead of two independent
              // animations that happen to look alike.
              style={scrubbing ? { perspective: "1600px" } : undefined}
            >
              {cards.map((card, i) => {
                const seat = conveyorSeat(
                  scrubbing ? smooth(bandOf(progress, i, cards.length)) : 1,
                );
                return (
                  <div
                    key={i}
                    // The reveal system owns the entrance when the conveyor does
                    // not. They cannot both: `.ohq-reveal` sets opacity through
                    // a class, an inline opacity would outrank it, and the card
                    // would flash in before the scene ever pinned.
                    {...(scrubbing ? {} : { "data-reveal": true })}
                    className={
                      scrubbing
                        ? "[transform-style:preserve-3d]"
                        : `ohq-reveal ${i === 0 ? "delay-[80ms]" : "delay-[160ms]"}`
                    }
                    style={
                      scrubbing
                        ? { ...seat, willChange: "transform, opacity" }
                        : undefined
                    }
                  >
                    {card}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ScrollScene>
    </>
  );
}
