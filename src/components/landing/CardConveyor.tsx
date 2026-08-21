"use client";

/**
 * The two mode cards, arriving on a conveyor.
 *
 * Each card starts off to the right and almost edge-on, and the visitor's own
 * scroll turns it to face them and slides it into place. While that happens the
 * section is held against the viewport, so the scroll gesture is spent turning
 * cards rather than moving the page — the movement is the cards', not the
 * page's.
 *
 * ── Two layouts, one idea ───────────────────────────────────────────────────
 *
 * Wide: both cards land side by side, the green one first and the purple one
 * following with a slight stagger.
 *
 * Narrow: there is room for one card, so they take turns. The green card comes
 * in, holds while it is read, then continues off to the left as the purple one
 * arrives behind it. That is the same conveyor seen through a narrower window
 * rather than a different effect — a card still enters from the right, still
 * turns to face you, still travels leftward. The last card never leaves,
 * because a section that ends by clearing itself hands the reader a held, empty
 * screen at the moment they are deciding whether to keep going.
 *
 * ── Each card is one solid panel ────────────────────────────────────────────
 *
 * The cards themselves are unchanged and are not even defined here: they arrive
 * as children from the server component that renders them, and this only ever
 * wraps them in a div it transforms. Nothing inside a card is animated
 * separately, so a card reads as a physical object turning rather than as a
 * collection of elements moving in convoy.
 */

import { FitBox } from "@/components/motion/FitBox";
import { ScrollScene } from "@/components/motion/ScrollScene";
import {
  bandOf,
  conveyorSeat,
  conveyorSeatNarrow,
  narrowBandOf,
  smooth,
} from "@/lib/motion/scene";

export function CardConveyor({
  header,
  cards,
}: {
  /** The eyebrow, heading and standfirst. Never held — see the note below. */
  header: React.ReactNode;
  cards: React.ReactNode[];
}) {
  return (
    <>
      {header}

      {/*
        Only the card row is held, not the whole section.

        The header is three or four lines of display type plus a standfirst; the
        cards are several hundred pixels tall on their own. Held together they
        do not fit a laptop viewport, and a held block that overflows the screen
        is worse than none at all — it stops the page while hiding the thing it
        stopped the page for. The heading has its own entrance anyway: it is a
        slot machine, and it plays on reveal.
      */}
      <ScrollScene
        distance={1.5}
        // A phone shows the cards one at a time, so it needs a band each rather
        // than a band between them.
        narrowDistance={2.2}
        className="mt-[clamp(38px,6vw,70px)]"
      >
        {({ progress, scrubbing, narrow, active }) => (
          <div
            // `items-center` on a wide screen, `items-stretch` on a narrow one.
            // Centring an item taller than its container makes it overflow
            // *both* ends equally — which put the top of the card behind the
            // fixed nav and hid its eyebrow. Stretching hands the slot an exact
            // height instead, which is also the only way the FitBox inside it
            // can know there is anything to fit into.
            className={
              scrubbing
                ? `flex h-full min-h-0 px-0.5 pt-[calc(var(--ohq-nav-h)+6px)] pb-4 ${
                    narrow ? "" : "items-center"
                  }`
                : ""
            }
          >
            <div
              className={
                narrow && scrubbing
                  ? // One slot, every card stacked in it. A grid rather than
                    // absolute positioning so the slot is as tall as the tallest
                    // card and the section never changes height mid-scroll.
                    "grid h-full min-h-0 w-full grid-cols-1 [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:min-h-0"
                  : "grid w-full grid-cols-1 gap-[clamp(16px,2vw,24px)] lg:grid-cols-2"
              }
              // Strong, and on the row rather than on a card: one perspective
              // origin shared by both is what makes them read as two objects on
              // one conveyor seen from one place, instead of two independent
              // animations that happen to look alike.
              style={scrubbing ? { perspective: narrow ? "1100px" : "1600px" } : undefined}
            >
              {cards.map((card, i) => {
                const seat = !scrubbing
                  ? null
                  : narrow
                    ? conveyorSeatNarrow(
                        narrowBandOf(progress, i, cards.length),
                        i === cards.length - 1,
                      )
                    : conveyorSeat(smooth(bandOf(progress, i, cards.length)));

                return (
                  <div
                    key={i}
                    // The reveal system owns the entrance when the conveyor does
                    // not. They cannot both: `.ohq-reveal` sets opacity through
                    // a class, an inline opacity would outrank it, and the card
                    // would flash in before the scene ever held.
                    {...(seat ? {} : { "data-reveal": true })}
                    className={
                      seat
                        ? "[transform-style:preserve-3d]"
                        : `ohq-reveal ${i === 0 ? "delay-[80ms]" : "delay-[160ms]"}`
                    }
                    style={
                      seat
                        ? {
                            ...seat,
                            // Blur is skipped outright on a phone: it forces a
                            // second raster pass over a full-width card, and it
                            // is the least of what the effect is made of.
                            filter: narrow ? "none" : seat.filter,
                            // Only while the scene is near the screen. See
                            // SceneState.active.
                            willChange: active ? "transform, opacity" : undefined,
                            // A card that has left must not keep intercepting
                            // taps over the one that replaced it.
                            pointerEvents: seat.opacity > 0.5 ? "auto" : "none",
                          }
                        : undefined
                    }
                  >
                    {/* A mode card runs to about 900px — a heading, a
                        standfirst, a worked miniature, three bullets and a
                        footer — and a phone held stage has around 750. Scaled
                        rather than trimmed, because every one of those parts is
                        the argument the card is making: the miniature is what
                        makes "a scale" and "a winner" different things you can
                        see rather than words. At this size the scale lands
                        around 0.85, which costs a couple of points of type and
                        keeps the whole panel. */}
                    {narrow && scrubbing ? (
                      <FitBox className="h-full" min={0.72}>
                        {card}
                      </FitBox>
                    ) : (
                      card
                    )}
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
