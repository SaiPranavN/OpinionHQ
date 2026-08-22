"use client";

/**
 * The map's camera engine — the clock, the DOM and the scheduling.
 *
 * Imperative on purpose: the camera moves at frame rate, and a React state
 * update per pointer move would re-render several hundred circles to change
 * one transform. The position lives in a ref, every frame writes exactly one
 * `translate3d(...) scale(...)` to the world element, and React only hears
 * about the coarse things it renders from — the detail tier, the selection.
 *
 * WHAT THE NUMBERS DO LIVES IN `lib/subject-map/flight.ts`, which is pure
 * and tested. This file owns only the three things a test cannot hold: the
 * clock, the element, and `requestAnimationFrame`.
 *
 * Every movement is interruptible: any gesture calls `interrupt()` and the
 * user has the camera back on the next frame.
 */

import { useEffect, useMemo, useRef } from "react";

import {
  clampZoom,
  fitCamera,
  zoomAtPoint,
  type CameraState,
  type Viewport,
} from "@/lib/subject-map/camera";
import {
  advance,
  aim,
  beginEase,
  beginGlide,
  beginSpring,
  cameraOf,
  clampInto,
  createFlightState,
  setCamera,
  stop,
  type FlightEnv,
} from "@/lib/subject-map/flight";

export type CameraEnv = FlightEnv;

export interface CameraApi {
  get(): CameraState;
  /** Immediate move — clamped, written this frame, no animation. */
  jump(next: Partial<CameraState>): void;
  /** Pan by a screen-space delta (positive dx moves the view right). */
  panBy(dxScreen: number, dyScreen: number): void;
  /** Multiply zoom by `factor`, keeping the world point at (sx, sy) fixed. */
  zoomBy(factor: number, sx: number, sy: number): void;
  /** Animated flight. Falls back to a short ease under reduced motion. */
  flyTo(target: Partial<CameraState>): void;
  /** Fitted overview of the whole cluster. */
  fitAll(animated?: boolean): void;
  /** Begin a post-drag glide with a world-space velocity. */
  glide(vx: number, vy: number): void;
  /** Stop any programmatic movement and hand control back to the user. */
  interrupt(): void;
  /** Re-clamp and repaint after the viewport or cluster changed. */
  refresh(): void;
  isMoving(): boolean;
}

export function useMapCamera(options: {
  worldRef: React.RefObject<HTMLDivElement | null>;
  /** Read fresh every frame — the component keeps it current. */
  envRef: React.RefObject<CameraEnv>;
  reducedRef: React.RefObject<boolean>;
  /** Called after every frame write with the settled-this-frame camera. */
  onFrame: (camera: CameraState, viewport: Viewport) => void;
}): CameraApi {
  const { worldRef, envRef, reducedRef, onFrame } = options;

  const flight = useRef(createFlightState());
  const loop = useRef({ raf: 0, lastTick: 0 });

  const api = useMemo<CameraApi>(() => {
    const s = flight.current;
    const l = loop.current;

    const paint = (camera: CameraState) => {
      const env = envRef.current;
      const world = worldRef.current;
      if (!env || !world) return;
      const tx = env.viewport.width / 2 - camera.x * camera.z;
      const ty = env.viewport.height / 2 - camera.y * camera.z;
      world.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${camera.z.toFixed(4)})`;
      onFrame(camera, env.viewport);
    };

    /** Clamp where we are, then paint it. The path every direct move takes. */
    const settleAndPaint = () => {
      const env = envRef.current;
      if (!env) return;
      paint(clampInto(s, env));
    };

    const stopLoop = () => {
      if (l.raf) cancelAnimationFrame(l.raf);
      l.raf = 0;
      stop(s);
    };

    const tick = (now: number) => {
      // The scheduled frame has arrived, so its id is spent. Clearing it here
      // is what makes `l.raf` mean "a frame is pending" rather than "a frame
      // was requested at some point" — and that invariant is load-bearing:
      // `startLoop` refuses to schedule while it believes one is pending, so
      // one stale id would freeze every flight for the life of the page.
      l.raf = 0;
      const env = envRef.current;
      if (!env) return;
      const dt = Math.min(Math.max((now - l.lastTick) / 1000, 0), 0.05);
      l.lastTick = now;
      const { camera, done } = advance(s, env, dt);
      paint(camera);
      if (!done) l.raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!l.raf) {
        l.lastTick = performance.now();
        l.raf = requestAnimationFrame(tick);
      }
    };

    const api: CameraApi = {
      get: () => cameraOf(s),

      jump(next) {
        stopLoop();
        const cam = cameraOf(s);
        setCamera(s, {
          x: next.x ?? cam.x,
          y: next.y ?? cam.y,
          z: next.z ?? cam.z,
        });
        settleAndPaint();
      },

      panBy(dxScreen, dyScreen) {
        stopLoop();
        const z = cameraOf(s).z;
        s.x.x += dxScreen / z;
        s.y.x += dyScreen / z;
        settleAndPaint();
      },

      zoomBy(factor, sx, sy) {
        stopLoop();
        const env = envRef.current;
        if (!env) return;
        const cam = cameraOf(s);
        const z = clampZoom(cam.z * factor, env.limits);
        setCamera(s, zoomAtPoint(cam, z, sx, sy, env.viewport));
        settleAndPaint();
      },

      flyTo(target) {
        const env = envRef.current;
        if (!env) return;
        aim(s, target, env);
        if (reducedRef.current) beginEase(s);
        else beginSpring(s);
        startLoop();
      },

      fitAll(animated = true) {
        const env = envRef.current;
        if (!env) return;
        const cam = fitCamera(env.bounds, env.limits);
        if (animated) api.flyTo(cam);
        else api.jump(cam);
      },

      glide(vx, vy) {
        if (reducedRef.current) return;
        if (beginGlide(s, vx, vy)) startLoop();
      },

      interrupt: stopLoop,

      refresh: settleAndPaint,

      isMoving: () => s.mode !== "idle",
    };

    return api;
    // Everything reads through refs; the API itself never goes stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teardown goes through the same reset the rest of the engine uses, rather
  // than cancelling behind its back. React's development double-mount runs
  // this cleanup and then reuses the very same state object, so a teardown
  // that cancelled the frame without clearing the id left the remounted
  // camera believing a flight was already in progress — and every
  // programmatic movement after that silently did nothing.
  useEffect(() => () => api.interrupt(), [api]);

  return api;
}
