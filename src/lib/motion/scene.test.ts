import { describe, expect, it } from "vitest";

import {
  activeStep,
  bandOf,
  clamp01,
  conveyorSeat,
  CONVEYOR_FROM,
  CONVEYOR_HEAD_START,
  conveyorSeatNarrow,
  DECK_DEPTH,
  narrowBandOf,
  dealAt,
  deckSeat,
  smooth,
  stageOf,
  stepPlacement,
  STEP_GONE,
  STEP_SOLID,
} from "@/lib/motion/scene";

/**
 * These tests exist because of a specific gap.
 *
 * The three pinned sections only exist *while scrolling*, and the state at
 * progress 0 is the only one any static check of the page ever sees. Loading
 * the landing page and inspecting it proves the cards start edge-on and the
 * deck starts stacked — it says nothing about whether they ever arrive, whether
 * two cards are ever opaque in the same column, or whether the last act is
 * reachable at all. Everything below is about the eighty percent of these
 * animations that no screenshot reaches.
 */

/** Walks a scene end to end, the way a reader scrolling through it would. */
function sweep(steps = 201): number[] {
  return Array.from({ length: steps }, (_, i) => i / (steps - 1));
}

describe("scrubbing basics", () => {
  it("clamps and eases without ever leaving 0..1", () => {
    for (const t of [-3, -0.01, 0, 0.5, 1, 1.01, 99, NaN]) {
      const s = smooth(t);
      if (Number.isNaN(t)) {
        // Math.min/max propagate NaN; the components only ever feed this a real
        // ScrollTrigger progress, but a NaN reaching a transform string would
        // blank an element rather than throwing, so it is worth knowing.
        expect(Number.isNaN(s)).toBe(true);
        continue;
      }
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBeCloseTo(0.5, 10);
    // The point of it: flat at both ends, so nothing starts or stops abruptly.
    expect(smooth(0.02)).toBeLessThan(0.02);
    expect(smooth(0.98)).toBeGreaterThan(0.98);
  });

  it("gives every step an equal, complete share of the scroll", () => {
    expect(stageOf(0, 0, 4)).toBe(0);
    expect(stageOf(0.25, 0, 4)).toBe(1);
    expect(stageOf(0.25, 1, 4)).toBe(0);
    expect(stageOf(1, 3, 4)).toBe(1);
    // A finished step stays finished rather than animating off the far side.
    expect(stageOf(0.9, 0, 4)).toBe(1);
    expect(clamp01(-1)).toBe(0);
  });
});

describe("the card conveyor", () => {
  it("starts every card edge-on, off to the right and invisible", () => {
    const seat = conveyorSeat(0);
    expect(seat.opacity).toBe(0);
    expect(seat.transform).toContain(`rotateY(${CONVEYOR_FROM.rotateY.toFixed(2)}deg)`);
    expect(seat.transform).toContain(`translateX(${CONVEYOR_FROM.translateX.toFixed(2)}%)`);
    expect(seat.filter).toMatch(/^blur\(/);
  });

  it("lands every card square, in place, opaque and unfiltered", () => {
    const seat = conveyorSeat(1);
    expect(seat.opacity).toBe(1);
    expect(seat.transform).toBe(
      "translateX(0.00%) translateZ(0.0px) rotateY(0.00deg) scale(1.0000)",
    );
    // Sharp after settling. A blur filter forces its own raster layer and text
    // never comes back quite as crisp through one — these cards carry body copy.
    expect(seat.filter).toBe("none");
  });

  it("is done blurring well before it stops moving", () => {
    // So the card is legible for the whole of its settle rather than snapping
    // into focus at the very end of it.
    expect(conveyorSeat(0.9).filter).toBe("none");
    expect(conveyorSeat(0.95).opacity).toBe(1);
  });

  it("opens with the first card already arriving, never on an empty stage", () => {
    // The scene begins the instant the stage sticks to the viewport. At a head
    // start of zero that first frame is a held, full-screen, empty panel — which
    // is exactly what "the cards are coming late, I don't want to see that empty
    // space" was describing.
    const opening = conveyorSeat(smooth(bandOf(0, 0, 2)));
    expect(bandOf(0, 0, 2)).toBeCloseTo(CONVEYOR_HEAD_START, 6);
    expect(opening.opacity).toBeGreaterThan(0.5);
  });

  it("reaches both cards, and reaches the second one last", () => {
    expect(bandOf(1, 1, 2)).toBe(1);
    // The green card is fully landed before the scene ends...
    expect(bandOf(1, 0, 2)).toBe(1);
    // ...and it lands in the first half, not two thirds of the way through.
    const landed = sweep().find((p) => bandOf(p, 0, 2) >= 1) ?? 1;
    expect(landed).toBeLessThan(0.45);
    // ...and the purple one is behind it the whole way.
    for (const p of sweep()) {
      expect(bandOf(p, 1, 2), `progress ${p}`).toBeLessThanOrEqual(bandOf(p, 0, 2));
    }
  });

  it("ends with both cards settled, and holds there", () => {
    // The last thing the section says is the pair side by side. Landing the
    // second card exactly as the scene releases would flick it past.
    const settled = sweep().find((p) => bandOf(p, 1, 2) >= 1) ?? 1;
    expect(settled).toBeLessThan(0.9);
  });

  it("staggers them without separating them", () => {
    // The failure this guards is a dead patch of scrolling between two cards,
    // which is what a non-overlapping band gives you. There must be a moment
    // where the first is still moving and the second has begun.
    const overlapping = sweep().some((p) => {
      const a = bandOf(p, 0, 2);
      const b = bandOf(p, 1, 2);
      return a > 0 && a < 1 && b > 0;
    });
    expect(overlapping).toBe(true);
  });

  it("never has two solid cards in flight at once", () => {
    // The overlap must not go so far that the green card is still crossing the
    // purple card's column while the purple card is legible underneath it.
    for (const p of sweep()) {
      const first = conveyorSeat(smooth(bandOf(p, 0, 2)));
      const second = conveyorSeat(smooth(bandOf(p, 1, 2)));
      // "In flight" means visibly off its mark, not merely not-yet-exact. A
      // spring-like ease approaches its target asymptotically, so a strict
      // `!== 0%` test calls a card that is four hundredths of a percent out
      // still travelling, and the assertion becomes about float precision
      // rather than about anything a reader could see.
      const travelling = (s: typeof first) =>
        s.opacity > 0.5 && Math.abs(Number(/translateX\((-?[\d.]+)%\)/.exec(s.transform)![1])) > 4;
      expect(travelling(first) && travelling(second), `progress ${p}`).toBe(false);
    }
  });
});

describe("the card conveyor, on a phone", () => {
  // One slot, two cards taking turns in it. The failure to guard against is two
  // legible cards on top of each other, because on a phone they share a column.
  const seatAt = (progress: number, i: number) =>
    conveyorSeatNarrow(narrowBandOf(progress, i, 2), i === 1);
  const shiftOf = (t: string) => Number(/translateX\((-?[\d.]+)%\)/.exec(t)![1]);

  it("opens with the first card arriving and closes with the second settled", () => {
    // Already visible on the opening frame, for the same reason as the wide
    // layout: the stage is held, and a held empty screen reads as broken.
    expect(seatAt(0, 0).opacity).toBeGreaterThan(0.5);
    expect(seatAt(0.25, 0).opacity).toBe(1);
    expect(seatAt(1, 1).opacity).toBe(1);
    expect(seatAt(1, 1).transform).toContain("translateX(0.00%)");
    expect(seatAt(1, 1).filter).toBe("none");
  });

  it("never has two cards settled in the one slot", () => {
    // They do overlap — a handover without one would leave the slot empty
    // between cards. What must never happen is two cards *at rest*, squarely
    // on the mark, on top of each other. While they cross, one is left of
    // centre and turned away and the other is right of centre and turning in.
    for (const p of sweep()) {
      const settled = [seatAt(p, 0), seatAt(p, 1)].filter(
        (s) => s.opacity > 0.85 && Math.abs(shiftOf(s.transform)) < 8,
      );
      expect(settled.length, `progress ${p}`).toBeLessThanOrEqual(1);
    }
  });

  it("never leaves the slot empty", () => {
    // A held screen with nothing on it reads as broken, and on a phone it is
    // also a screen the reader cannot scroll past without faith.
    for (const p of sweep()) {
      const best = Math.max(seatAt(p, 0).opacity, seatAt(p, 1).opacity);
      expect(best, `progress ${p}`).toBeGreaterThan(0.5);
    }
  });

  it("sends the first card out the way the second comes in", () => {
    // Leaving to the left, arriving from the right: one conveyor, not a card
    // that reverses out of the way of the next.
    expect(shiftOf(seatAt(0.47, 0).transform)).toBeLessThan(0);
    expect(shiftOf(seatAt(0.44, 1).transform)).toBeGreaterThan(0);
  });

  it("keeps the last card on screen for good", () => {
    // Nothing follows it, so nothing should take it away.
    expect(seatAt(1, 1).opacity).toBe(1);
    expect(conveyorSeatNarrow(1, true).opacity).toBe(1);
  });
});

describe("the stepped stage", () => {
  const COUNT = 4;

  it("shows exactly one act at full strength for most of its band", () => {
    for (let i = 0; i < COUNT; i++) {
      const centre = (i + 0.5) / COUNT;
      expect(stepPlacement(centre, i, COUNT).opacity).toBe(1);
      const solid = Array.from({ length: COUNT }, (_, j) =>
        stepPlacement(centre, j, COUNT).opacity,
      ).filter((o) => o > 0.99);
      expect(solid).toHaveLength(1);
    }
  });

  it("never leaves the stage blank", () => {
    // The failure mode of a crossfade built from two clamped ranges: a gap at
    // every boundary where the outgoing act has gone and the incoming one has
    // not arrived. A pinned section showing nothing reads as broken.
    for (const p of sweep()) {
      const best = Math.max(
        ...Array.from({ length: COUNT }, (_, i) => stepPlacement(p, i, COUNT).opacity),
      );
      expect(best, `progress ${p}`).toBeGreaterThan(0.6);
    }
  });

  it("reaches the last act", () => {
    // With four acts and a scene that ends at progress 1, the last act's band
    // centre is at 0.875 — it has to still be solid at the end of the scroll,
    // or the reader never sees what people wrote.
    expect(stepPlacement(1, COUNT - 1, COUNT).opacity).toBe(1);
    expect(activeStep(1, COUNT)).toBe(COUNT - 1);
    expect(activeStep(0, COUNT)).toBe(0);
  });

  it("keeps the heading in step with what is on screen", () => {
    // The rail and the heading name `activeStep`; the panels are placed by
    // `stepPlacement`. If those two disagreed the stage would label the wrong
    // act — so the named act must always be one of the visible ones.
    for (const p of sweep()) {
      const named = activeStep(p, COUNT);
      expect(stepPlacement(p, named, COUNT).opacity, `progress ${p}`).toBeGreaterThan(0.3);
    }
  });

  it("drifts every act in the same direction the page would have", () => {
    // An act sliding against the scroll reads as fighting it.
    const early = stepPlacement(0.1, 1, COUNT).y;
    const late = stepPlacement(0.4, 1, COUNT).y;
    expect(late).toBeLessThan(early);
  });

  it("fades out entirely between SOLID and GONE", () => {
    expect(STEP_SOLID).toBeLessThan(STEP_GONE);
    // An inner act, so the end-clamping in `stepPlacement` is not in play.
    const centre = 1.5 / COUNT;
    // Just past GONE bands away, the act is not composited at all.
    const far = stepPlacement(centre + (STEP_GONE + 0.05) / COUNT, 1, COUNT);
    expect(far.visible).toBe(false);
    // At most two acts are ever composited, because the fade completes inside
    // one band and the acts are one band apart.
    for (const p of sweep()) {
      const drawn = Array.from({ length: COUNT }, (_, i) =>
        stepPlacement(p, i, COUNT),
      ).filter((s) => s.visible);
      expect(drawn.length, `progress ${p}`).toBeLessThanOrEqual(2);
    }
  });
});

describe("the subject deck", () => {
  const CARDS = 12;

  it("puts the front card square on, solid and sharp", () => {
    const seat = deckSeat(0);
    expect(seat).toEqual({ z: 0, y: 0, rotate: 0, opacity: 1, blur: 0 });
  });

  it("stacks the rest behind the screen, receding and dimming", () => {
    const one = deckSeat(1);
    const two = deckSeat(2);
    expect(one.z).toBeLessThan(0);
    expect(two.z).toBeLessThan(one.z);
    expect(two.opacity).toBeLessThan(one.opacity);
    expect(two.blur).toBeGreaterThan(one.blur);
    // Offset downward as well as back, so the deck shows its edges instead of
    // being one card with a halo behind it.
    expect(one.y).toBeGreaterThan(0);
  });

  it("sends a dealt card up and toward the viewer, not backward", () => {
    const gone = deckSeat(-1);
    expect(gone.y).toBeLessThan(0);
    expect(gone.z).toBeGreaterThan(0);
    expect(gone.opacity).toBe(0);
  });

  it("leaves faster than it arrives", () => {
    // What makes the front of the stack feel like where something is happening.
    const arriving = 1 - deckSeat(0.5).opacity;
    const leaving = 1 - deckSeat(-0.5).opacity;
    expect(leaving).toBeGreaterThan(arriving);
  });

  it("deals every card and leaves one on the table at the end", () => {
    const seen = new Set<number>();
    for (const p of sweep()) {
      const at = dealAt(p, CARDS);
      for (let i = 0; i < CARDS; i++) {
        if (Math.abs(i - at) < 0.5) seen.add(i);
      }
    }
    // Every card gets its turn at the front...
    expect(seen.size).toBe(CARDS);
    // ...and the deck does not empty itself at the bottom of the scene.
    // The deck finishes with a card on the table rather than an empty one.
    const final = dealAt(1, CARDS);
    expect(final).toBe(CARDS - 1);
    expect(deckSeat(CARDS - 1 - final).opacity).toBe(1);
    // And it gets there before the scroll runs out, so the last card holds.
    expect(dealAt(0.93, CARDS)).toBe(CARDS - 1);
  });

  it("never draws more of the deck than can be seen", () => {
    // The cull is what keeps twelve absolutely-positioned cards from all being
    // composited at once.
    for (const p of sweep()) {
      const at = dealAt(p, CARDS);
      const drawn = Array.from({ length: CARDS }, (_, i) => i - at).filter(
        (k) => Math.abs(k) <= DECK_DEPTH && deckSeat(k).opacity > 0.002,
      );
      expect(drawn.length, `progress ${p}`).toBeLessThanOrEqual(6);
    }
  });

  it("always has something visible on the table", () => {
    for (const p of sweep()) {
      const at = dealAt(p, CARDS);
      const best = Math.max(
        ...Array.from({ length: CARDS }, (_, i) => deckSeat(i - at).opacity),
      );
      expect(best, `progress ${p}`).toBeGreaterThan(0.8);
    }
  });
});
