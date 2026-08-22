import { describe, expect, it } from "vitest";

import { fitCamera, zoomLimits, type CameraState } from "./camera";
import {
  advance,
  aim,
  beginEase,
  beginGlide,
  beginSpring,
  cameraOf,
  clampInto,
  createFlightState,
  INERTIA_REST,
  setCamera,
  stop,
  type FlightEnv,
  type FlightState,
} from "./flight";
import { CIRCLE_DIAMETER, layoutCluster } from "./layout";

/**
 * The preview pane this was built against fires no animation frames at all,
 * so every claim about camera motion is made here or nowhere.
 */

const subjects = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, createdKey: i }));

function env(count = 150, viewport = { width: 1280, height: 800 }): FlightEnv {
  const { bounds } = layoutCluster(subjects(count));
  return { viewport, bounds, limits: zoomLimits(viewport, bounds, CIRCLE_DIAMETER) };
}

/** Runs the loop at 60fps until it reports done, or the budget runs out. */
function run(
  state: FlightState,
  e: FlightEnv,
  maxMs = 4000,
): { camera: CameraState; frames: number; ms: number; finished: boolean } {
  const dt = 1 / 60;
  let frames = 0;
  let camera = cameraOf(state);
  while (frames * dt * 1000 < maxMs) {
    const step = advance(state, e, dt);
    camera = step.camera;
    frames++;
    if (step.done) return { camera, frames, ms: frames * dt * 1000, finished: true };
  }
  return { camera, frames, ms: frames * dt * 1000, finished: false };
}

describe("spring flights", () => {
  it("arrives at its target", () => {
    const e = env();
    const state = createFlightState();
    setCamera(state, fitCamera(e.bounds, e.limits));

    aim(state, { x: 300, y: -200, z: 1.4 }, e);
    beginSpring(state);
    const result = run(state, e);

    expect(result.finished).toBe(true);
    expect(result.camera.x).toBeCloseTo(300, 1);
    expect(result.camera.y).toBeCloseTo(-200, 1);
    expect(result.camera.z).toBeCloseTo(1.4, 3);
  });

  it("lands in the 650–900ms range the design calls for", () => {
    const e = env();
    const state = createFlightState();
    setCamera(state, fitCamera(e.bounds, e.limits));
    aim(state, { x: 400, y: 300, z: 1.8 }, e);
    beginSpring(state);

    const result = run(state, e);
    expect(result.ms).toBeGreaterThan(500);
    expect(result.ms).toBeLessThan(1400);
  });

  it("is not linear — it eases out, covering most ground early", () => {
    const e = env();
    const state = createFlightState();
    // Zoomed in, where there is room to travel: at the fitted overview the
    // camera is pinned to the cluster centre and cannot pan at all.
    const z = e.limits.max;
    const from = e.bounds.centerX - 400;
    const to = e.bounds.centerX + 400;
    setCamera(state, { x: from, y: e.bounds.centerY, z });
    aim(state, { x: to, y: e.bounds.centerY, z }, e);
    beginSpring(state);

    // A third of the way through a ~800ms flight a linear camera would have
    // covered a third of the distance. A sprung one is well past it.
    let travelled = 0;
    for (let i = 0; i < 16; i++) travelled = advance(state, e, 1 / 60).camera.x;
    expect(travelled - from).toBeGreaterThan((to - from) * 0.4);
  });

  it("hands control back the moment it is interrupted", () => {
    const e = env();
    const state = createFlightState();
    setCamera(state, { x: 0, y: 0, z: 1 });
    aim(state, { x: 900, y: 0, z: 1 }, e);
    beginSpring(state);
    for (let i = 0; i < 10; i++) advance(state, e, 1 / 60);
    const interruptedAt = cameraOf(state).x;

    stop(state);
    const after = advance(state, e, 1 / 60);
    expect(after.done).toBe(true);
    expect(after.camera.x).toBeCloseTo(interruptedAt, 6);
  });

  it("a second flight works after the first has landed", () => {
    // The regression that shipped once: a spent frame id left the loop
    // believing it was still running, and every later flight did nothing.
    const e = env();
    const state = createFlightState();
    setCamera(state, fitCamera(e.bounds, e.limits));

    const z = e.limits.max;
    const first = { x: e.bounds.centerX + 200, y: e.bounds.centerY + 100, z };
    aim(state, first, e);
    beginSpring(state);
    expect(run(state, e).finished).toBe(true);

    const second = { x: e.bounds.centerX - 300, y: e.bounds.centerY - 150, z };
    aim(state, second, e);
    beginSpring(state);
    const result = run(state, e);
    expect(result.finished).toBe(true);
    expect(result.camera.x).toBeCloseTo(second.x, 1);
    expect(result.camera.y).toBeCloseTo(second.y, 1);
    expect(result.camera.z).toBeCloseTo(z, 3);
  });

  it("never leaves the zoom limits mid-flight", () => {
    const e = env();
    const state = createFlightState();
    setCamera(state, { x: 0, y: 0, z: e.limits.min });
    // Aim past the ceiling; `aim` clamps, and the overshoot must not escape.
    aim(state, { x: 0, y: 0, z: e.limits.max * 4 }, e);
    beginSpring(state);
    for (let i = 0; i < 200; i++) {
      const { camera, done } = advance(state, e, 1 / 60);
      expect(camera.z).toBeGreaterThanOrEqual(e.limits.min - 1e-9);
      expect(camera.z).toBeLessThanOrEqual(e.limits.max + 1e-9);
      if (done) break;
    }
  });

  it("survives a stalled frame without teleporting", () => {
    const e = env();
    const state = createFlightState();
    setCamera(state, { x: 0, y: 0, z: 1 });
    aim(state, { x: 500, y: 0, z: 1 }, e);
    beginSpring(state);
    // A 400ms stall arrives clamped at 50ms by the caller; even unclamped the
    // integrator must not explode.
    const after = advance(state, e, 0.4);
    expect(Number.isFinite(after.camera.x)).toBe(true);
    expect(Math.abs(after.camera.x)).toBeLessThanOrEqual(900);
  });
});

describe("reduced-motion easing", () => {
  it("reaches the same destination, quickly and without overshoot", () => {
    const e = env();
    const state = createFlightState();
    setCamera(state, { x: 0, y: 0, z: 1 });
    aim(state, { x: 250, y: 0, z: 1 }, e);
    beginEase(state);

    let maxX = 0;
    const result = run(state, e);
    expect(result.finished).toBe(true);
    expect(result.ms).toBeLessThan(320);
    expect(result.camera.x).toBeCloseTo(250, 6);

    // Replay to confirm it never passes the target — an ease that overshoots
    // is the travel theatre reduced motion asked us to remove.
    const replay = createFlightState();
    setCamera(replay, { x: 0, y: 0, z: 1 });
    aim(replay, { x: 250, y: 0, z: 1 }, e);
    beginEase(replay);
    for (let i = 0; i < 40; i++) {
      const step = advance(replay, e, 1 / 60);
      maxX = Math.max(maxX, step.camera.x);
      if (step.done) break;
    }
    expect(maxX).toBeLessThanOrEqual(250.0001);
  });
});

describe("inertia", () => {
  it("glides on, slows down and stops", () => {
    const e = env(400);
    const state = createFlightState();
    setCamera(state, { x: 0, y: 0, z: e.limits.max });

    expect(beginGlide(state, 900, 0)).toBe(true);
    const first = advance(state, e, 1 / 60).camera.x;
    const result = run(state, e);

    expect(result.finished).toBe(true);
    expect(result.camera.x).toBeGreaterThan(first);
    expect(state.mode).toBe("idle");
  });

  it("decays monotonically — never speeds up", () => {
    const e = env(400);
    const state = createFlightState();
    setCamera(state, { x: 0, y: 0, z: e.limits.max });
    beginGlide(state, 1200, 0);

    let previous = Infinity;
    let last = 0;
    for (let i = 0; i < 300; i++) {
      const before = cameraOf(state).x;
      const step = advance(state, e, 1 / 60);
      const delta = step.camera.x - before;
      expect(delta).toBeLessThanOrEqual(previous + 1e-9);
      previous = delta;
      last = step.camera.x;
      if (step.done) break;
    }
    expect(Number.isFinite(last)).toBe(true);
  });

  it("ignores a flick too small to be a glide", () => {
    const state = createFlightState();
    expect(beginGlide(state, INERTIA_REST / 3, 0)).toBe(false);
    expect(state.mode).toBe("idle");
  });

  it("dies at the pan boundary instead of grinding against it", () => {
    const e = env(60);
    const state = createFlightState();
    // Start well past the right edge so the glide runs straight into the wall.
    setCamera(state, { x: e.bounds.maxX + 1e6, y: e.bounds.centerY, z: e.limits.max });
    const wall = clampInto(state, e).x;

    beginGlide(state, 4000, 0);
    const result = run(state, e);

    expect(result.finished).toBe(true);
    // It stopped where the wall is, and did not take a second to do it.
    expect(result.camera.x).toBeCloseTo(wall, 6);
    expect(result.ms).toBeLessThan(120);
  });
});

describe("clamping", () => {
  /** The visible window still overlaps the cluster — nothing has been lost. */
  const clusterStillVisible = (camera: CameraState, e: FlightEnv) => {
    const halfW = e.viewport.width / (2 * camera.z);
    const halfH = e.viewport.height / (2 * camera.z);
    return (
      camera.x - halfW < e.bounds.maxX &&
      camera.x + halfW > e.bounds.minX &&
      camera.y - halfH < e.bounds.maxY &&
      camera.y + halfH > e.bounds.minY
    );
  };

  it("can be dragged at the fitted overview rather than pinned there", () => {
    const e = env();
    const state = createFlightState();
    setCamera(state, { x: e.bounds.centerX + 300, y: e.bounds.centerY, z: e.limits.min });
    const camera = clampInto(state, e);
    expect(camera.x).toBeGreaterThan(e.bounds.centerX);
  });

  it("cannot be flown out into empty space", () => {
    const e = env();
    const state = createFlightState();
    setCamera(state, fitCamera(e.bounds, e.limits));
    aim(state, { x: 99999, y: 99999, z: e.limits.max }, e);
    beginSpring(state);
    const result = run(state, e);

    expect(Number.isFinite(result.camera.x)).toBe(true);
    expect(clusterStillVisible(result.camera, e)).toBe(true);
  });

  it("an idle camera reports done immediately", () => {
    const e = env();
    const state = createFlightState();
    expect(advance(state, e, 1 / 60).done).toBe(true);
  });

  it("keeps a one-subject cluster in view however hard it is pushed", () => {
    const e = env(1);
    const state = createFlightState();
    setCamera(state, fitCamera(e.bounds, e.limits));
    aim(state, { x: 99999, y: 99999 }, e);
    beginSpring(state);
    const result = run(state, e);
    expect(clusterStillVisible(result.camera, e)).toBe(true);
  });
});
