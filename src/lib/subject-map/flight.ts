/**
 * The camera's motion, as arithmetic.
 *
 * PULLED OUT OF THE HOOK FOR THE SAME REASON `lib/motion/spring.ts` was pulled
 * out of the roller: this is the part with claims in it — that a flight
 * actually reaches its target, that a glide decays and dies at the cluster
 * boundary, that any of it can be interrupted mid-air — and a claim that only
 * exists inside a `requestAnimationFrame` callback is a claim nothing can
 * check. The preview pane this was built against never fires an animation
 * frame at all, so a loop that lived only in the component would have shipped
 * unverified.
 *
 * Everything here is pure over a mutable state object and a fixed `dt`. The
 * hook owns the clock, the DOM write and the rAF scheduling; this module owns
 * what the numbers do.
 */

import {
  clampCenter,
  clampZoom,
  type CameraState,
  type Viewport,
  type ZoomLimits,
} from "@/lib/subject-map/camera";
import type { ClusterBounds } from "@/lib/subject-map/layout";
import { springAtRest, stepSpring, type SpringState } from "@/lib/motion/spring";

/** Just under critical damping (2·√k ≈ 20.5): one small overshoot, no wobble. */
export const FLIGHT_SPRING = { stiffness: 105, damping: 19.5, mass: 1 };
/** Reduced-motion flights: short, direct, done. */
export const EASE_MS = 180;
/** Inertia friction, per second, exponential. */
export const FRICTION = 4.6;
/** World-units-per-second below which a glide is over. */
export const INERTIA_REST = 6;

export type FlightMode = "idle" | "spring" | "ease" | "inertia";

export interface FlightEnv {
  viewport: Viewport;
  bounds: ClusterBounds;
  limits: ZoomLimits;
}

export interface FlightState {
  x: SpringState;
  y: SpringState;
  /** Zoom springs in LOG space, so halving and doubling feel symmetric. */
  lz: SpringState;
  target: { x: number; y: number; lz: number };
  mode: FlightMode;
  ease: { fromX: number; fromY: number; fromLz: number; elapsed: number };
  glide: { vx: number; vy: number };
}

export function createFlightState(): FlightState {
  return {
    x: { x: 0, v: 0 },
    y: { x: 0, v: 0 },
    lz: { x: 0, v: 0 },
    target: { x: 0, y: 0, lz: 0 },
    mode: "idle",
    ease: { fromX: 0, fromY: 0, fromLz: 0, elapsed: 0 },
    glide: { vx: 0, vy: 0 },
  };
}

export function cameraOf(state: FlightState): CameraState {
  return { x: state.x.x, y: state.y.x, z: Math.exp(state.lz.x) };
}

export function setCamera(state: FlightState, camera: CameraState): void {
  state.x.x = camera.x;
  state.y.x = camera.y;
  state.lz.x = Math.log(camera.z);
  state.x.v = state.y.v = state.lz.v = 0;
}

/**
 * Pulls the camera back inside the rules and reports where it landed.
 *
 * Called after every frame and after every direct manipulation, and it writes
 * the clamped values back into the springs rather than only returning them —
 * a spring that keeps integrating past a wall it cannot cross would build up
 * velocity and then snap when the wall moved.
 */
export function clampInto(state: FlightState, env: FlightEnv): CameraState {
  const z = clampZoom(Math.exp(state.lz.x), env.limits);
  state.lz.x = Math.log(z);
  const centred = clampCenter(state.x.x, state.y.x, z, env.viewport, env.bounds);
  state.x.x = centred.x;
  state.y.x = centred.y;
  return { x: centred.x, y: centred.y, z };
}

/** Points a flight at a destination, clamped to what the rules allow. */
export function aim(state: FlightState, target: Partial<CameraState>, env: FlightEnv): void {
  const cam = cameraOf(state);
  const z = clampZoom(target.z ?? cam.z, env.limits);
  const centred = clampCenter(
    target.x ?? cam.x,
    target.y ?? cam.y,
    z,
    env.viewport,
    env.bounds,
  );
  state.target = { x: centred.x, y: centred.y, lz: Math.log(z) };
}

export function beginSpring(state: FlightState): void {
  state.mode = "spring";
}

export function beginEase(state: FlightState): void {
  state.mode = "ease";
  state.ease = {
    fromX: state.x.x,
    fromY: state.y.x,
    fromLz: state.lz.x,
    elapsed: 0,
  };
}

export function beginGlide(state: FlightState, vx: number, vy: number): boolean {
  state.glide = { vx, vy };
  if (Math.hypot(vx, vy) < INERTIA_REST) return false;
  state.mode = "inertia";
  return true;
}

export function stop(state: FlightState): void {
  state.mode = "idle";
}

/**
 * Advances the camera by `dt` seconds and reports whether it has arrived.
 *
 * Returns `true` when the movement is finished and the caller should stop
 * scheduling frames. An `idle` state finishes immediately, which is what makes
 * an interruption take effect on the very next frame.
 */
export function advance(
  state: FlightState,
  env: FlightEnv,
  dt: number,
): { camera: CameraState; done: boolean } {
  if (state.mode === "idle") {
    return { camera: clampInto(state, env), done: true };
  }

  if (state.mode === "spring") {
    stepSpring(state.x, state.target.x, dt, FLIGHT_SPRING);
    stepSpring(state.y, state.target.y, dt, FLIGHT_SPRING);
    stepSpring(state.lz, state.target.lz, dt, FLIGHT_SPRING);
    const camera = clampInto(state, env);
    const settled =
      springAtRest(state.x, state.target.x, 0.05) &&
      springAtRest(state.y, state.target.y, 0.05) &&
      springAtRest(state.lz, state.target.lz, 0.0008);
    if (settled) {
      state.x.x = state.target.x;
      state.y.x = state.target.y;
      state.lz.x = state.target.lz;
      state.x.v = state.y.v = state.lz.v = 0;
      state.mode = "idle";
      return { camera: clampInto(state, env), done: true };
    }
    return { camera, done: false };
  }

  if (state.mode === "ease") {
    state.ease.elapsed += dt * 1000;
    const t = Math.min(state.ease.elapsed / EASE_MS, 1);
    const k = 1 - (1 - t) * (1 - t) * (1 - t);
    state.x.x = state.ease.fromX + (state.target.x - state.ease.fromX) * k;
    state.y.x = state.ease.fromY + (state.target.y - state.ease.fromY) * k;
    state.lz.x = state.ease.fromLz + (state.target.lz - state.ease.fromLz) * k;
    const camera = clampInto(state, env);
    if (t >= 1) {
      state.mode = "idle";
      return { camera, done: true };
    }
    return { camera, done: false };
  }

  // Inertia.
  const decay = Math.exp(-FRICTION * dt);
  state.glide.vx *= decay;
  state.glide.vy *= decay;
  const wantX = state.glide.vx * dt;
  const wantY = state.glide.vy * dt;
  const beforeX = state.x.x;
  const beforeY = state.y.x;
  state.x.x += wantX;
  state.y.x += wantY;
  const camera = clampInto(state, env);
  // An axis that asked to move and did not has hit the cluster boundary. Its
  // velocity dies there rather than grinding against the wall for a second.
  if (Math.abs(state.x.x - beforeX) < Math.abs(wantX) * 0.5) state.glide.vx = 0;
  if (Math.abs(state.y.x - beforeY) < Math.abs(wantY) * 0.5) state.glide.vy = 0;
  if (Math.hypot(state.glide.vx, state.glide.vy) < INERTIA_REST) {
    state.mode = "idle";
    return { camera, done: true };
  }
  return { camera, done: false };
}
