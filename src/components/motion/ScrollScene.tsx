"use client";

/**
 * A section that holds still while the page scrolls through it.
 *
 * Three places on the landing page needed the same thing: pin a block to the
 * viewport, convert the scroll distance the visitor travels into a progress
 * value from 0 to 1, and hand that to the children so they can animate against
 * it. The cards conveyor, the stepped result stage and the subject stack are
 * all that shape, and the parts that are easy to get wrong — releasing the pin,
 * restoring layout, reversing cleanly, refusing to run at all where it should
 * not — are the same in all three. So they are written once, here.
 *
 * ── Why GSAP does the pinning ───────────────────────────────────────────────
 *
 * `position: sticky` gets you most of this for free and was the first attempt.
 * What it does not get you is a *reversible scrubbed timeline*: sticky tells
 * you nothing about how far through the sticky range you are, so you end up
 * reading `getBoundingClientRect` on every scroll event to derive it, which is
 * a layout read per frame and the thing the whole rest of this codebase avoids.
 * ScrollTrigger already computes that number, batches every trigger's reads
 * into one pass, and handles the resize and refresh cases that a hand-rolled
 * version gets wrong for months without anyone noticing.
 *
 * ── Where it refuses to run ─────────────────────────────────────────────────
 *
 * Under `prefers-reduced-motion`, and on a phone. Both fall back to the same
 * thing: `progress` is pinned at 1 and nothing is pinned to the viewport, so
 * every child renders in its finished state and the section is an ordinary
 * block of page. A pinned section is a section that eats a visitor's scroll
 * gesture and gives it back as something else, and on a small screen — where
 * the scroll gesture is also how you get past something you are not interested
 * in — that trade is not worth making. The children are told which mode they
 * are in and lay themselves out accordingly.
 */

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/motion/useReducedMotion";

/**
 * The width at which a scene is allowed to pin.
 *
 * The same 768px `deviceTierFor` uses, but asked as a media query rather than
 * read off `innerWidth` once at mount — so a window dragged narrower, or a
 * tablet turned on its side, tears the pin down instead of leaving a phone-width
 * layout stuck to the viewport. It also means a viewport that has not been
 * measured yet answers "no" and then corrects itself when it has been, rather
 * than being permanently classified as small.
 */
const WIDE = "(min-width: 768px)";

/** Just the part of the dynamic import the second effect needs to hold on to. */
type ScrollTriggerModule = {
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

export interface SceneState {
  /** 0 at the top of the scene, 1 at the end. Always 1 when not scrubbing. */
  progress: number;
  /** False when the scene is an ordinary block: reduced motion, or a phone. */
  scrubbing: boolean;
}

export interface ScrollSceneProps {
  /**
   * How much scroll the scene consumes while pinned, as a multiple of the
   * viewport height. Roughly "how many screenfuls of scrolling does this cost
   * a visitor who does not care about it" — keep it honest.
   */
  distance?: number;
  /** Extra classes for the outer section. */
  className?: string;
  id?: string;
  children: (state: SceneState) => React.ReactNode;
}

export function ScrollScene({
  distance = 2,
  className = "",
  id,
  children,
}: ScrollSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(1);
  const [scrubbing, setScrubbing] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /*
   * Loading GSAP and creating the trigger are two effects, not one, and the
   * split is not stylistic — it is a bug fix.
   *
   * Every scene lays itself out differently depending on `scrubbing`: stacked
   * and full height when false, one viewport tall and compacted when true. Doing
   * both in one effect means `ScrollTrigger.create` runs in the same tick as
   * `setScrubbing(true)`, before React has committed anything — so it measures
   * the *stacked* layout and pins a box of that height. The symptom was a pinned
   * section four times taller than the viewport, scrolling under a nav that was
   * supposed to be holding it still.
   *
   * The second effect depends on `scrubbing`, so it cannot run until the layout
   * it is measuring is the layout that will be on screen.
   */
  const [engine, setEngine] = useState<ScrollTriggerModule | null>(null);

  useEffect(() => {
    // Phones get the plain stacked version. See the header.
    if (reduced || !wide) return;

    let cancelled = false;
    // Imported at use rather than at module scope so GSAP and ScrollTrigger are
    // not in the bundle of any page that never pins anything — which is every
    // page but this one.
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      setEngine({ ScrollTrigger });
      setScrubbing(true);
      setProgress(0);
    })();

    return () => {
      cancelled = true;
      // Back to an ordinary block, so a route change — or a window dragged down
      // to phone width — cannot leave a scene half-pinned with a stale progress
      // value and half its children frozen mid-arrival.
      setScrubbing(false);
      setProgress(1);
    };
  }, [reduced, wide]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !engine || !scrubbing) return;
    const { ScrollTrigger } = engine;

    const trigger = ScrollTrigger.create({
      trigger: host,
      start: "top top",
      end: () => `+=${window.innerHeight * distance}`,
      pin: true,
      // `true` rather than a number. A numeric scrub adds a catch-up lag, which
      // on a conveyor of cards reads as the cards sliding *after* the scroll
      // rather than with it — and the whole point of scrubbing is that the
      // visitor's finger is driving.
      scrub: true,
      // Keeps the pinned block from being a millimetre off its own container
      // when the pin engages, which shows up as a one-frame jump.
      anticipatePin: 1,
      pinSpacing: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => setProgress(self.progress),
      onRefresh: (self) => setProgress(self.progress),
    });

    // The display face has different metrics from the fallback it is measured
    // against, and a heading that rewraps from two lines to three after the
    // trigger was created leaves the pin spacing off by a line.
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});

    return () => trigger.kill();
  }, [engine, scrubbing, distance]);

  return (
    <section ref={hostRef} id={id} className={className}>
      {children({ progress, scrubbing })}
    </section>
  );
}
