"use client";

/**
 * A vertical drum. Lines of text sit on the surface of an invisible cylinder;
 * the drum rolls upward, so the current line curves away over the top while the
 * next one rolls up into the centre.
 *
 * This replaced two separate hand-rolled rotations — the headline's and the
 * pill's — which were the same idea implemented twice with different keyframes,
 * different timing and, because each faked the barrel with a single `rotateX`
 * on a flat element, no actual geometry. What real geometry buys that a
 * keyframe cannot: the faces stay *attached to each other*. The bottom edge of
 * the outgoing line and the top edge of the incoming one are the same point on
 * the cylinder, so the drum reads as one solid object turning rather than as
 * two elements animating past each other.
 *
 * ── The geometry ────────────────────────────────────────────────────────────
 *
 * Faces sit `step` degrees apart. For them to tile the cylinder exactly — no
 * gap, no overlap — the radius has to be
 *
 *     R = (faceHeight / 2) / tan(step / 2)
 *
 * which is the whole reason this measures anything at all. Each face is placed
 * with `rotateX(a) translateZ(R)`, and the drum itself is pushed back by
 * `translateZ(-R)` so that the face at the centre lands at exactly z = 0 and
 * therefore at exactly 1:1 scale. Without that pushback the perspective divide
 * renders the centred line about 35% larger than the box reserved for it, which
 * is the difference between a drum and a headline that jumps on mount.
 *
 * ── What is reserved, and what overflows ────────────────────────────────────
 *
 * The layout box is one face tall and as wide as the widest line — the
 * invisible ghosts do that, the same trick both predecessors used, and it is
 * what stops the page below shuffling every time the line changes. The visible
 * window is *taller* than the layout box by `peek`, and that overflow is the
 * point: it is where the neighbouring lines are seen curving away. It is masked
 * to transparent at both edges, so the clip reads as depth rather than a crop.
 *
 * ── Accessibility ───────────────────────────────────────────────────────────
 *
 * Every face is `aria-hidden` and the caller names the whole set once. A line
 * that changes every few seconds is a line a screen reader would otherwise
 * re-announce for as long as the page is open — and here the roller is the
 * first thing on the page. The lines are still ordinary text in the DOM, so
 * nothing is hidden from a crawler.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  SPRING,
  springAtRest,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from "@/lib/motion/spring";
import {
  edgeMask,
  faceStyleAt,
  radiusFor,
  windowInsets,
} from "@/lib/motion/cylinder";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

/**
 * `useLayoutEffect`, except on the server, where React warns about it and there
 * is no layout to read anyway.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface CylinderRollerProps {
  /** One rendered line per face. Order is the order they roll in. */
  items: readonly React.ReactNode[];
  /** How long a face holds at the centre before the drum rolls on. */
  holdMs: number;
  /** Degrees between adjacent faces. Bigger is a tighter, faster-curving drum. */
  step?: number;
  /**
   * Extra visible height either side of the centred face, as a fraction of one
   * face. 0 clips flush to the line; 0.24 shows a hint of the neighbours.
   */
  peek?: number;
  /** Camera distance in px. Shorter is a more dramatic barrel. */
  perspective?: number;
  spring?: SpringConfig;
  /** Peak blur on a face a full step off centre. The centred face never blurs. */
  blurPx?: number;
  /**
   * Whether a pointer drag turns the drum.
   *
   * `"pointer"` engages for fine pointers only, and is the right setting for
   * anything large. Capturing vertical touch drags needs `touch-action: none`,
   * and putting that on a full-width headline at the top of a phone page means
   * the first swipe a visitor makes does not scroll the page — a worse thing to
   * lose than a gesture is to gain. Small controls can afford `"always"`.
   */
  drag?: "none" | "pointer" | "always";
  /** Applied to the layout box. */
  className?: string;
  /** Applied to every face and every ghost, so they measure the same. */
  faceClassName?: string;
  /** Announced on the group. Faces themselves are always hidden. */
  label?: string;
}

export function CylinderRoller({
  items,
  holdMs,
  step = 30,
  peek = 0.24,
  perspective = 1150,
  spring = SPRING.headline,
  blurPx = 4.5,
  drag = "pointer",
  className = "",
  faceClassName = "",
  label,
}: CylinderRollerProps) {
  const count = items.length;
  const reduced = useReducedMotion();

  const ghostRef = useRef<HTMLSpanElement>(null);
  const faceRefs = useRef<(HTMLSpanElement | null)[]>([]);

  /** One face's height in px. 0 until measured — see the flat fallback below. */
  const [faceHeight, setFaceHeight] = useState(0);
  /** The face the clock is currently resting on. Drives the timer, not the view. */
  const [index, setIndex] = useState(0);
  /** Hover or drag. Either one stops the clock. */
  const [held, setHeld] = useState(false);
  /** The tab is in the background. Same effect, different cause. */
  const [hidden, setHidden] = useState(false);
  const [pointerFine, setPointerFine] = useState(false);

  /**
   * The drum's position, in faces, unbounded.
   *
   * Unbounded on purpose: it only ever increases, so the drum always turns the
   * same way and never unwinds through six lines to get from the last back to
   * the first. Angles come from the *wrapped* difference, so a position of
   * 1000.4 places exactly the same geometry as 0.4 would.
   */
  const pos = useRef<SpringState>({ x: 0, v: 0 });
  const target = useRef(0);
  const frame = useRef(0);
  const last = useRef(0);
  const dragging = useRef(false);
  const dragFrom = useRef(0);
  const dragBase = useRef(0);

  const radius = radiusFor(faceHeight, step);
  const rolling = faceHeight > 0 && !reduced && count > 1;

  /**
   * The window, as percentages rather than pixels.
   *
   * A percentage `top` on an absolutely positioned box resolves against its
   * containing block's height — which here is the roller's own layout box, the
   * thing the ghosts already size correctly for free. So the clip extends past
   * the box by exactly `peek` of it, and the drum sits back inside at exactly
   * the box's height, at every viewport and every wrap, with nothing in
   * JavaScript having to be right about any of it.
   *
   * That is the whole reason it is expressed this way. The pixel measurement
   * above can be momentarily stale; if the geometry of the window depended on
   * it too, a stale read would not merely round the curvature off, it would
   * mis-size and mis-place the clip.
   */
  const { clip: clipInset, drum: drumInset, masked } = windowInsets(peek);

  /* ------------------------------------------------------------- measuring */

  /**
   * The face height, measured five different ways.
   *
   * This looks like belt, braces and a second pair of braces, and it is, because
   * a stale height here is the one failure mode with a visible consequence.
   * Everything about the *layout* is expressed in percentages below and is
   * self-correcting; the height is used for exactly one thing, the radius, and a
   * radius computed from the wrong height puts the neighbouring faces at the
   * wrong distance — which is not a subtle curvature difference, it is the
   * previous and next lines overlapping the one being read.
   *
   * A ResizeObserver is the right tool and normally the only one that fires. The
   * others cover the cases where it does not fire *in time*:
   *
   *   · the synchronous first read, so there is a radius before the first paint;
   *   · `document.fonts.ready`, because the first read happens against the
   *     fallback font and a display face with different metrics rewraps a
   *     twelve-word headline from two lines to three;
   *   · a window resize, for hosts that throttle observer delivery;
   *   · two delayed reads, which cost two timers once and catch anything the
   *     other four miss.
   */
  useEffect(() => {
    const ghost = ghostRef.current;
    if (!ghost) return;

    let live = true;
    const measure = () => {
      if (!live) return;
      const h = ghost.getBoundingClientRect().height;
      if (h <= 0) return;
      // Rounded, and ignored below half a pixel of change: a height that
      // flickers between 74.4 and 74.6 across resizes would recompute the
      // radius and re-lay the whole drum for a difference nobody can see.
      setFaceHeight((prev) => (Math.abs(prev - h) < 0.5 ? prev : Math.round(h)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(ghost);

    let raf = 0;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    document.fonts?.ready.then(measure).catch(() => {});
    const late = [window.setTimeout(measure, 180), window.setTimeout(measure, 700)];

    return () => {
      live = false;
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      late.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const sync = () => setPointerFine(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /* ---------------------------------------------------------------- paint */

  /**
   * Writes the drum and every face for the current position.
   *
   * Styles go straight to the DOM rather than through state. This runs at frame
   * rate, and re-rendering a twelve-word headline sixty times a second to move
   * it four pixels is how a smooth animation becomes a janky one.
   */
  const paint = useCallback(() => {
    if (radius <= 0) return;
    const x = pos.current.x;
    for (let i = 0; i < count; i++) {
      const face = faceRefs.current[i];
      if (!face) continue;
      const s = faceStyleAt(i, x, count, radius, step, blurPx);
      face.style.visibility = s.visibility;
      face.style.opacity = s.opacity;
      if (s.visibility === "visible") {
        face.style.transform = s.transform;
        face.style.filter = s.filter;
      }
    }
  }, [count, radius, step, blurPx]);

  /* --------------------------------------------------------------- physics */

  /**
   * The loop schedules its *successor through a ref*, never through itself.
   *
   * `requestAnimationFrame(tick)` from inside `tick` looks equivalent and is
   * not: it captures the closure that was current when the loop started, and
   * keeps calling that one for as long as the drum is moving. `paint` is
   * rebuilt whenever the radius changes, so a window resized mid-roll would
   * finish the roll against the geometry it had before the resize. Going
   * through the ref means every frame picks up the latest.
   */
  const tickRef = useRef<(now: number) => void>(() => {});

  const tick = useCallback(
    (now: number) => {
      const dt = last.current === 0 ? 1 / 60 : (now - last.current) / 1000;
      last.current = now;

      stepSpring(pos.current, target.current, dt, spring);
      paint();

      if (!dragging.current && springAtRest(pos.current, target.current)) {
        pos.current.x = target.current;
        pos.current.v = 0;
        paint();
        frame.current = 0;
        last.current = 0;
        return;
      }
      frame.current = requestAnimationFrame((t) => tickRef.current(t));
    },
    [paint, spring],
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const run = useCallback(() => {
    if (frame.current) return;
    last.current = 0;
    frame.current = requestAnimationFrame((t) => tickRef.current(t));
  }, []);

  /**
   * Paints after every render, before the browser gets a frame.
   *
   * A layout effect rather than an effect, and it is the difference between a
   * clean mount and a visible flash: the faces are rendered with no transform at
   * all, so between React committing them and this running they are stacked on
   * top of each other, unrotated and opaque. `useEffect` runs after paint and
   * the reader would see that stack for a frame. This runs before it.
   *
   * It also covers the case an effect was here for originally — a resize that
   * rewraps the headline changes the face height and therefore the radius, and
   * nothing else would redraw a settled drum.
   *
   * WHY THE FACES CARRY NO INLINE TRANSFORM. They did, computed from the
   * position at render time, which meant reading a ref during render — and the
   * value it produced mid-roll was whatever the spring happened to be at, so
   * every unrelated re-render wrote a one-frame-old transform back over the
   * loop's own. Painting from here instead means there is exactly one writer.
   */
  useIsomorphicLayoutEffect(() => {
    if (rolling) paint();
  });

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  /* ----------------------------------------------------------------- clock */

  const advance = useCallback(
    (by: number) => {
      target.current = Math.round(target.current) + by;
      setIndex((((target.current % count) + count) % count) | 0);
      run();
    },
    [count, run],
  );

  useEffect(() => {
    if (held || hidden || count < 2) return;
    if (reduced) {
      // Still cycles, just without the drum. The point of a roller is that it
      // names more than one thing; freezing it on the first would hide the rest
      // of the list from exactly the people least able to discover it.
      const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), holdMs);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => advance(1), holdMs);
    return () => window.clearTimeout(timer);
  }, [index, held, hidden, holdMs, count, advance, reduced]);

  /* ----------------------------------------------------------------- drag */

  const dragEnabled =
    rolling && (drag === "always" || (drag === "pointer" && pointerFine));

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!dragEnabled) return;
    dragging.current = true;
    dragFrom.current = e.clientY;
    dragBase.current = pos.current.x;
    setHeld(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!dragging.current || faceHeight <= 0) return;
    // Dragging up rolls the drum forward, the direction it turns on its own. A
    // gesture that fought the idle motion would read as a different control.
    target.current = dragBase.current - (e.clientY - dragFrom.current) / faceHeight;
    pos.current.x = target.current;
    pos.current.v = 0;
    paint();
  };

  const endDrag = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    target.current = Math.round(target.current);
    setIndex((((target.current % count) + count) % count) | 0);
    setHeld(false);
    run();
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  /* ---------------------------------------------------------------- render */

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      className={`relative grid ${className}`}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // A tap advances the drum. That is what gives a touch visitor control of
      // it without taking the page's first vertical swipe away from them.
      onClick={() => {
        if (dragging.current || !rolling) return;
        advance(1);
      }}
      style={dragEnabled && drag === "always" ? { touchAction: "none" } : undefined}
    >
      {/*
        The reservation. Every line, stacked in one grid cell and invisible, so
        the box is as wide as the widest and as tall as the tallest at whatever
        the viewport happens to be — including when one line wraps and the others
        do not. A hardcoded height is a guess that is wrong at some breakpoint;
        reserving nothing makes the page below jump on every change.
      */}
      <span ref={ghostRef} className="col-start-1 row-start-1 grid">
        {items.map((item, i) => (
          <span
            key={`ghost-${i}`}
            aria-hidden
            className={`pointer-events-none invisible col-start-1 row-start-1 ${faceClassName}`}
          >
            {item}
          </span>
        ))}
      </span>

      {rolling ? (
        // Three nested elements, and the nesting is not incidental. The clip
        // carries `overflow` and the mask; the stage carries `perspective`; the
        // drum carries `preserve-3d`. Putting a mask or an overflow on the same
        // element as the 3D context is the reliable way to have a browser
        // silently flatten it.
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 overflow-hidden"
          style={{
            top: clipInset,
            bottom: clipInset,
            // The window dissolves at both edges instead of cutting. Skipped
            // when there is no overflow to dissolve — a mask on a flush clip
            // would only eat the top and bottom of the line being read.
            ...(masked
              ? {
                  maskImage: edgeMask(drumInset),
                  WebkitMaskImage: edgeMask(drumInset),
                }
              : {}),
          }}
        >
          <span className="absolute inset-0" style={{ perspective: `${perspective}px` }}>
            <span
              className="absolute inset-x-0"
              style={{
                top: drumInset,
                bottom: drumInset,
                transformStyle: "preserve-3d",
                transform: `translateZ(${-radius}px)`,
              }}
            >
              {items.map((item, i) => (
                <span
                  key={`face-${i}`}
                  ref={(el) => {
                    faceRefs.current[i] = el;
                  }}
                  aria-hidden
                  // Placed by the layout effect above, not from here. Hidden
                  // until then, so the un-transformed stack is never shown.
                  className={`absolute inset-0 [backface-visibility:hidden] [will-change:transform,opacity] ${faceClassName}`}
                  style={{ visibility: "hidden" }}
                >
                  {item}
                </span>
              ))}
            </span>
          </span>
        </span>
      ) : (
        /*
         * The flat fallback: before the first measurement, and for anybody who
         * asked for reduced motion.
         *
         * It renders exactly where the ghost box is, at exactly its natural
         * size, which is what makes the hand-off to the drum invisible — the
         * centred face lands on the same pixels. It is also what the server
         * renders, so hydration has nothing to reconcile.
         */
        <span
          key={`flat-${index}`}
          aria-hidden
          className={`col-start-1 row-start-1 ${faceClassName}`}
          style={
            reduced && index > 0
              ? { animation: "ohq-headline-fade 300ms ease both" }
              : undefined
          }
        >
          {items[index] ?? items[0]}
        </span>
      )}
    </span>
  );
}
