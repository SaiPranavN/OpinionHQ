"use client";

/**
 * The single source of runtime truth for the ambient system.
 *
 * Every layer asks this hook the same four questions — how much motion am I
 * allowed, how big is the device, is the page even visible, and where is the
 * pointer — so the answers cannot diverge between layers, and so there is
 * exactly one `matchMedia` listener and one pointer listener on the page
 * rather than one per effect.
 *
 * Everything starts in its most conservative state and widens after mount.
 * The server has no viewport and no motion preference, so rendering the full
 * system first and pulling it back would both mismatch hydration and briefly
 * animate at a visitor who asked for stillness.
 */

import { useEffect, useRef, useState } from "react";

import {
  deviceTierFor,
  type DeviceTier,
  type MotionTier,
} from "@/lib/motion/config";

export interface AmbientRuntime {
  /** How much of the system may run. */
  motion: MotionTier;
  device: DeviceTier;
  /** False when the tab is hidden — animation loops must stop. */
  visible: boolean;
  /** True once mounted; layers that cannot be server-rendered gate on this. */
  ready: boolean;
  /** Pointer effects are desktop-and-mouse only. */
  pointerFine: boolean;
}

export function useAmbientMotion(): AmbientRuntime {
  const [state, setState] = useState<AmbientRuntime>({
    motion: "static",
    device: "mobile",
    visible: true,
    ready: false,
    pointerFine: false,
  });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");

    const read = () => {
      // A zero width is not a small device — it is a viewport that has not
      // been measured yet (a background tab, a detached frame, a pane the host
      // has collapsed). Classifying it as mobile would silently strip the
      // system down and leave it stripped, since nothing would re-run until a
      // resize. Staying un-ready is the honest answer: nothing renders, and
      // the first real measurement settles it.
      if (window.innerWidth === 0) return;

      const device = deviceTierFor(window.innerWidth);
      setState((prev) => ({
        ...prev,
        ready: true,
        // A reduced-motion request disables continuous motion outright. Mobile
        // is not "reduced" — it keeps the slow gradient but drops the loops,
        // which the layers implement by reading `device` rather than `motion`.
        motion: reduce.matches ? "reduced" : "full",
        device,
        // Coarse pointers get no cursor effects at all: there is no hover
        // state to respond to, and tracking touches would fight scrolling.
        pointerFine: fine.matches && device === "desktop",
      }));
    };

    read();

    const onVisibility = () =>
      setState((prev) => ({ ...prev, visible: !document.hidden }));

    // `resize` is throttled through rAF: the handler reads layout, and an
    // unthrottled one during a drag-resize is a textbook layout thrash.
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };

    reduce.addEventListener("change", read);
    fine.addEventListener("change", read);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      reduce.removeEventListener("change", read);
      fine.removeEventListener("change", read);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return state;
}

/**
 * Publishes the pointer position as CSS custom properties on a host element,
 * normalised to -1..1 from the centre of the viewport.
 *
 * Custom properties rather than React state on purpose: a pointer move that
 * re-rendered the tree would re-render the whole page sixty times a second.
 * This writes two strings on one element and lets the compositor do the rest.
 */
export function usePointerVars(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
): React.RefObject<{ x: number; y: number }> {
  // Held in a ref so the rAF loop reads the latest target without re-binding.
  const target = useRef({ x: 0, y: 0 });
  // Returned to callers that need the value per-frame rather than as a CSS
  // variable — the node canvas nudges individual dots and cannot read a
  // custom property without a `getComputedStyle` on every frame.
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const host = ref.current;
    if (!host || !enabled) return;

    const onMove = (e: PointerEvent) => {
      target.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };

    let frame = 0;
    const tick = () => {
      // Exponential ease toward the pointer. The lag is the effect: an
      // instantly-tracking glow reads as a cursor, a trailing one as light.
      const k = 0.06;
      current.current.x += (target.current.x - current.current.x) * k;
      current.current.y += (target.current.y - current.current.y) * k;
      host.style.setProperty("--ohq-px", current.current.x.toFixed(4));
      host.style.setProperty("--ohq-py", current.current.y.toFixed(4));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Bound on `document` in the capture phase rather than on `window`. A
    // bubble listener at the top of the tree only sees a move that nothing
    // below it stopped — one `stopPropagation` in a component, or an embedding
    // context that does not re-dispatch to `window`, and the glow silently
    // freezes at the origin with no error to explain why.
    document.addEventListener("pointermove", onMove, {
      passive: true,
      capture: true,
    });
    return () => {
      document.removeEventListener("pointermove", onMove, { capture: true });
      cancelAnimationFrame(frame);
      host.style.removeProperty("--ohq-px");
      host.style.removeProperty("--ohq-py");
    };
  }, [ref, enabled]);

  return current;
}

/**
 * Publishes scroll depth as a custom property, for the parallax layers.
 *
 * Same reasoning as the pointer: one property write per frame, no re-render,
 * and a single passive listener shared by every layer that wants depth.
 */
export function useScrollVar(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const host = ref.current;
    if (!host || !enabled) return;

    let frame = 0;
    const write = () => {
      frame = 0;
      host.style.setProperty("--ohq-scroll", String(Math.round(window.scrollY)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(write);
    };

    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      host.style.removeProperty("--ohq-scroll");
    };
  }, [ref, enabled]);
}
