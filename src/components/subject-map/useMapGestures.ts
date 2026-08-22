"use client";

/**
 * Pointer, wheel and double-tap handling for the map viewport.
 *
 * One set of listeners on the container, never one per circle. The heart of
 * it is the tap/drag distinction: a pointer that moves past a small threshold
 * becomes a drag (with pointer capture, so it survives leaving the element),
 * and the click that would otherwise land on whatever circle happened to be
 * under the finger is swallowed in the capture phase. That is the rule that
 * keeps "I meant to pan" from opening a dashboard.
 *
 * Native listeners rather than React props for wheel — it must be registered
 * `passive: false` to preventDefault, or the page scrolls under the map.
 */

import { useEffect } from "react";

import type { CameraApi } from "@/components/subject-map/useMapCamera";

/** Movement in px before a press stops being a tap. Fingers wobble more. */
const DRAG_THRESHOLD = { mouse: 5, touch: 9, pen: 7 } as const;
/** Two taps this close in time and space are a double-tap. */
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 32;
/** Velocity samples older than this do not describe the release. */
const VELOCITY_WINDOW_MS = 90;

export interface GestureCallbacks {
  /** Tap or click that landed on empty space (not on a circle). */
  onTapEmpty(): void;
  /** Double-click / double-tap on a circle. */
  onDoubleCircle(id: string): void;
  /** Double-click / double-tap on empty space, at container coordinates. */
  onDoubleEmpty(sx: number, sy: number): void;
}

export function useMapGestures(options: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  camera: CameraApi;
  reducedRef: React.RefObject<boolean>;
  callbacksRef: React.RefObject<GestureCallbacks>;
}) {
  // `camera` is stable for the component's lifetime — the engine builds it
  // once and reads everything else through refs — so the listeners below can
  // close over it directly rather than through another mirror.
  const { containerRef, camera, reducedRef, callbacksRef } = options;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let mode: "idle" | "maybe" | "drag" | "pinch" = "idle";
    let pressed = { x: 0, y: 0 };
    let samples: { t: number; x: number; y: number }[] = [];
    let didDrag = false;
    let pinch = { dist: 0, midX: 0, midY: 0 };
    let lastTap = { t: 0, x: 0, y: 0 };
    let touchDoubleHandledAt = 0;

    const local = (e: { clientX: number; clientY: number }) => {
      const rect = el.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const circleIdAt = (target: EventTarget | null): string | null => {
      if (!(target instanceof Element)) return null;
      return target.closest<HTMLElement>("[data-circle-id]")?.dataset.circleId ?? null;
    };

    /** Controls floating over the map, as opposed to the map itself. */
    const isChrome = (target: EventTarget | null): boolean =>
      target instanceof Element && target.closest("[data-map-chrome]") !== null;

    const beginPinch = () => {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      mode = "pinch";
      pinch = {
        dist: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // A touch anywhere takes the camera back from any flight, immediately.
      camera.interrupt();
      const pos = local(e);
      pointers.set(e.pointerId, pos);
      if (pointers.size === 1) {
        mode = "maybe";
        pressed = pos;
        didDrag = false;
        samples = [{ t: performance.now(), ...pos }];
      } else if (pointers.size === 2) {
        didDrag = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* capture is best-effort */
        }
        beginPinch();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const pos = local(e);
      const prev = pointers.get(e.pointerId)!;
      pointers.set(e.pointerId, pos);

      if (mode === "maybe") {
        const threshold =
          DRAG_THRESHOLD[e.pointerType as keyof typeof DRAG_THRESHOLD] ?? DRAG_THRESHOLD.mouse;
        if (Math.hypot(pos.x - pressed.x, pos.y - pressed.y) > threshold) {
          mode = "drag";
          didDrag = true;
          try {
            el.setPointerCapture(e.pointerId);
          } catch {
            /* capture is best-effort */
          }
        }
      }

      if (mode === "drag") {
        camera.panBy(prev.x - pos.x, prev.y - pos.y);
        const now = performance.now();
        samples.push({ t: now, ...pos });
        while (samples.length > 8) samples.shift();
      } else if (mode === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        if (!a || !b) return;
        const dist = Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        camera.zoomBy(dist / pinch.dist, midX, midY);
        camera.panBy(pinch.midX - midX, pinch.midY - midY);
        pinch = { dist, midX, midY };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const pos = local(e);
      pointers.delete(e.pointerId);

      if (mode === "drag" && pointers.size === 0) {
        // Glide from the velocity of the last few samples, in world units.
        const now = performance.now();
        const recent = samples.filter((sample) => now - sample.t <= VELOCITY_WINDOW_MS);
        const first = recent[0];
        const last = recent[recent.length - 1];
        if (first && last && last.t > first.t && !reducedRef.current) {
          const dt = (last.t - first.t) / 1000;
          const z = camera.get().z;
          camera.glide(
            -((last.x - first.x) / dt) / z,
            -((last.y - first.y) / dt) / z,
          );
        }
        mode = "idle";
        return;
      }

      if (mode === "pinch") {
        if (pointers.size === 1) {
          // One finger lifted mid-pinch: the survivor keeps panning.
          mode = "drag";
          samples = [{ t: performance.now(), ...[...pointers.values()][0]! }];
        } else if (pointers.size === 0) {
          mode = "idle";
        }
        return;
      }

      if (mode === "maybe" && pointers.size === 0) {
        mode = "idle";
        // Manual double-tap for touch — browsers do not reliably synthesise
        // dblclick with touch-action: none in play.
        if (e.pointerType === "touch") {
          const now = performance.now();
          if (
            now - lastTap.t < DOUBLE_TAP_MS &&
            Math.hypot(pos.x - lastTap.x, pos.y - lastTap.y) < DOUBLE_TAP_PX
          ) {
            lastTap = { t: 0, x: 0, y: 0 };
            touchDoubleHandledAt = now;
            const id = circleIdAt(e.target);
            if (id) callbacksRef.current.onDoubleCircle(id);
            else callbacksRef.current.onDoubleEmpty(pos.x, pos.y);
          } else {
            lastTap = { t: now, x: pos.x, y: pos.y };
          }
        }
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) mode = "idle";
      else if (pointers.size === 1) mode = "drag";
    };

    // Capture phase: a click that ends a drag is not a click on anything.
    const onClickCapture = (e: MouseEvent) => {
      if (didDrag) {
        didDrag = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onClick = (e: MouseEvent) => {
      // Empty space means the field itself — not the chrome floating over it.
      // Without the second test, pressing "+" or "Fit all" would also read as
      // "tapped nothing" and quietly drop the viewer's selection.
      if (!circleIdAt(e.target) && !isChrome(e.target)) {
        callbacksRef.current.onTapEmpty();
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      // Ignore the synthetic dblclick some browsers still emit after a
      // double-tap this hook already handled.
      if (performance.now() - touchDoubleHandledAt < 600) return;
      // Two quick presses on a zoom button are two zooms, not a zoom-out.
      if (isChrome(e.target)) return;
      e.preventDefault();
      const id = circleIdAt(e.target);
      const pos = local(e);
      if (id) callbacksRef.current.onDoubleCircle(id);
      else callbacksRef.current.onDoubleEmpty(pos.x, pos.y);
    };

    const onWheel = (e: WheelEvent) => {
      if (isChrome(e.target)) return;
      e.preventDefault();
      camera.interrupt();
      const pos = local(e);
      // Trackpad pinches arrive as ctrl+wheel with small deltas; treat them
      // as a stronger zoom than plain scrolling.
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0024));
      camera.zoomBy(factor, pos.x, pos.y);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("click", onClick);
    el.addEventListener("dblclick", onDoubleClick);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("click", onClick);
      el.removeEventListener("dblclick", onDoubleClick);
      el.removeEventListener("wheel", onWheel);
    };
  }, [containerRef, callbacksRef, reducedRef, camera]);
}
