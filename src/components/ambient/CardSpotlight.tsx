"use client";

/**
 * Pointer-tracked spotlight for cards, driven by exactly one listener.
 *
 * The obvious implementation — a client wrapper per card with its own
 * `pointermove` handler — puts sixty listeners on a catalog page and makes
 * every card a client component. This instead mounts once, delegates from the
 * document, and writes two custom properties on whichever `[data-spotlight]`
 * element the pointer is inside. The cards stay server components and the
 * page keeps one listener regardless of how many are rendered.
 *
 * The visual half lives in globals.css as a `::before` on `[data-spotlight]`,
 * so a card with JavaScript disabled still gets its border and lift on hover —
 * only the spotlight's *position* needs this.
 */

import { useEffect } from "react";

export function CardSpotlight() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let active: HTMLElement | null = null;
    let frame = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;

    const write = () => {
      frame = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      el.style.setProperty("--ohq-mx", `${x.toFixed(1)}px`);
      el.style.setProperty("--ohq-my", `${y.toFixed(1)}px`);
    };

    const clear = (el: HTMLElement) => {
      el.style.removeProperty("--ohq-mx");
      el.style.removeProperty("--ohq-my");
    };

    const onMove = (e: PointerEvent) => {
      const target = e.target;
      const card =
        target instanceof Element
          ? target.closest<HTMLElement>("[data-spotlight]")
          : null;

      if (card !== active) {
        if (active) clear(active);
        active = card;
      }
      if (!card) return;

      // One `getBoundingClientRect` per frame, on one element — the read is
      // batched into the same rAF as the write so it never interleaves with
      // style mutations and forces a synchronous layout.
      const rect = card.getBoundingClientRect();
      pending = {
        el: card,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      if (!frame) frame = requestAnimationFrame(write);
    };

    // A card can be scrolled out from under a stationary pointer; without this
    // its spotlight would stay frozen mid-card until the pointer moved again.
    const onLeave = () => {
      if (active) clear(active);
      active = null;
    };

    // Capture phase for the same reason as the ambient pointer loop: a card is
    // a link full of nested elements, and this must see every move regardless
    // of what any of them does with the event.
    document.addEventListener("pointermove", onMove, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      document.removeEventListener("pointermove", onMove, { capture: true });
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      if (frame) cancelAnimationFrame(frame);
      if (active) clear(active);
    };
  }, []);

  return null;
}
