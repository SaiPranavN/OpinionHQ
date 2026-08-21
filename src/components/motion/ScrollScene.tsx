"use client";

/**
 * A section that holds still while the page scrolls through it.
 *
 * Four places on the landing page need the same thing: hold a block against the
 * viewport, convert the scroll the visitor spends there into a progress value
 * from 0 to 1, and hand that to the children so they can animate against it.
 *
 * ── It does not use GSAP, and that is a bug fix, not a preference ────────────
 *
 * It did. `ScrollTrigger.create({ pin: true })` is the obvious way to build
 * this and it shipped, and it took the whole site down on any client-side
 * navigation away from the landing page:
 *
 *     NotFoundError: Failed to execute 'removeChild' on 'Node':
 *     The node to be removed is not a child of this node.
 *
 * ScrollTrigger implements pinning by *wrapping the pinned element in a
 * `.pin-spacer` div it inserts into the DOM itself*. React knows nothing about
 * that div. So when React unmounted the landing page it tried to remove the
 * `<section>` from the parent it remembered, found the section had been
 * re-parented under a spacer, threw, and took the error boundary with it —
 * every "Explore opinions" and "Pick a side" click from the home page landed on
 * "This page couldn't load". Direct loads of /topics were fine, which is what
 * made it look like a routing problem rather than an unmount problem.
 *
 * The lesson generalises past this one library: anything that mutates the DOM
 * structure React is rendering will eventually collide with React removing it.
 * `position: sticky` mutates nothing. The browser does the holding, React owns
 * every node, and there is no cleanup that can be got wrong.
 *
 * ── The geometry ────────────────────────────────────────────────────────────
 *
 * A tall track, and a sticky stage exactly one viewport high inside it:
 *
 *     track   height = (1 + distance) * 100svh
 *     stage   position: sticky; top: 0; height: 100svh
 *
 * The stage stays put for exactly `distance` viewports of scrolling. Progress
 * is how far the track has travelled past the top of the screen, which is one
 * `getBoundingClientRect` on a rAF-throttled scroll listener — the same read
 * ScrollTrigger was doing, minus the machinery.
 *
 * ── It runs on phones now ───────────────────────────────────────────────────
 *
 * It used to refuse below 768px. That was the wrong call: these scenes are the
 * landing page, and shipping a phone the static fallback means shipping a phone
 * a different product. What is narrow-specific is the *choreography*, not
 * whether there is any — `narrow` is passed down so a scene can deal its cards
 * one at a time where there is no room for two. Reduced motion still opts out
 * completely, and that one is not negotiable.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { clamp01 } from "@/lib/motion/scene";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

/** Below this, a scene lays itself out one thing at a time. */
const NARROW = "(max-width: 767px)";

export interface SceneState {
  /** 0 at the top of the scene, 1 at the end. Always 1 when not scrubbing. */
  progress: number;
  /** False when the scene is an ordinary block: reduced motion only, now. */
  scrubbing: boolean;
  /** Phone width. The scene decides what to do about it. */
  narrow: boolean;
  /**
   * The scene is on screen or nearly so.
   *
   * Children use this to decide whether to ask for a compositor layer. It
   * matters more than it sounds: this page is twenty screens tall on a phone,
   * and with `will-change` declared statically every card, act and deck card on
   * it held its own layer for the whole visit — twenty-one of them, close to a
   * million square pixels of surface, most belonging to sections the reader
   * had left long ago. That is the kind of budget a phone reclaims by throwing
   * the tab away and reloading it, which is exactly the symptom that sent me
   * looking. Promote what is on screen; let go of the rest.
   */
  active: boolean;
}

export interface ScrollSceneProps {
  /**
   * How much scroll the scene consumes while held, as a multiple of the
   * viewport height. Roughly "how many screenfuls does this cost a visitor who
   * does not care about it" — keep it honest.
   */
  distance?: number;
  /** Overrides `distance` on a phone, where a scene often has more steps. */
  narrowDistance?: number;
  className?: string;
  id?: string;
  children: (state: SceneState) => React.ReactNode;
}

export function ScrollScene({
  distance = 2,
  narrowDistance,
  className = "",
  id,
  children,
}: ScrollSceneProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [narrow, setNarrow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);

  // Reduced motion is the only opt-out. Everything else scrubs.
  const scrubbing = !reduced;
  const span = narrow ? (narrowDistance ?? distance) : distance;

  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /**
   * One layout read, throttled to a frame.
   *
   * `-rect.top / travel` is the whole calculation: the track's top starts at the
   * top of the viewport and ends `travel` pixels above it, and `travel` is
   * exactly the sticky element's held distance because the track is one
   * viewport taller than the stage.
   */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const vh = window.innerHeight;
    const rect = track.getBoundingClientRect();
    // Half a screen of margin either side, so a layer exists by the time it is
    // needed rather than being created on the frame it first has to paint.
    setActive(rect.bottom > -vh * 0.5 && rect.top < vh * 1.5);

    const travel = track.offsetHeight - vh;
    if (travel <= 0) {
      setProgress(1);
      return;
    }
    const next = clamp01(-rect.top / travel);
    setProgress((prev) =>
      // A scroll of one pixel through a three-viewport scene moves progress by
      // a third of a thousandth. Re-rendering for that is work nobody can see.
      Math.abs(prev - next) < 0.0004 ? prev : next,
    );
  }, []);

  useEffect(() => {
    if (!scrubbing) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // The display face rewraps the headings when it lands, which changes the
    // page height above this scene and therefore where it starts.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrubbing, measure, span]);

  if (!scrubbing) {
    return (
      <section id={id} className={className}>
        {children({ progress: 1, scrubbing: false, narrow, active: false })}
      </section>
    );
  }

  return (
    <section id={id} className={className}>
      <div ref={trackRef} style={{ height: `calc(${(1 + span).toFixed(3)} * 100svh)` }}>
        {/* `top: 0` rather than the nav height: the stage is a full viewport and
            the children pad themselves past the nav, which keeps the arithmetic
            above free of any dependence on how tall the header happens to be. */}
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {children({ progress, scrubbing: true, narrow, active })}
        </div>
      </div>
    </section>
  );
}
