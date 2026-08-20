/**
 * A damped spring, integrated in fixed substeps.
 *
 * Pulled out of the roller so the physics can be asserted without a DOM: this
 * is the part with a claim in it — that the drum has mass, overshoots its mark
 * and settles — and a claim that only exists inside a `requestAnimationFrame`
 * callback is a claim nothing can check.
 *
 * WHY SUBSTEPS. The naive `v += a * dt; x += v * dt` at whatever `dt` the frame
 * happened to take is semi-implicit Euler, and it is only stable while
 * `dt < 2/sqrt(k/m)`. At k=170 that is 153ms — which sounds like plenty until a
 * tab is backgrounded, a garbage collection lands, or a 30Hz display doubles
 * the frame time under load, and the integrator quietly explodes instead of
 * settling. Stepping at a fixed 1/240s makes the motion identical on a 60Hz
 * panel, a 120Hz one and a frame that took 80ms, which is the other half of
 * why it is here: a spring whose feel depends on the refresh rate is a spring
 * that was tuned on one machine.
 */

export interface SpringConfig {
  /** Pull toward the target. Higher is snappier. */
  stiffness: number;
  /** Resistance. Below `2 * sqrt(stiffness * mass)` the spring overshoots. */
  damping: number;
  mass: number;
}

export interface SpringState {
  /** Current position. */
  x: number;
  /** Current velocity, in units per second. */
  v: number;
}

/** The longest slice the integrator will take, in seconds. */
const SUBSTEP = 1 / 240;

/** Frame times above this are treated as a stall and clamped, not simulated. */
const MAX_FRAME = 0.05;

/**
 * Advances `state` toward `target` by `dt` seconds. Mutates and returns it.
 *
 * `dt` is clamped rather than trusted: a 400ms frame after a stall is not 400ms
 * of motion anyone watched, and simulating it would teleport the drum.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  dt: number,
  config: SpringConfig,
): SpringState {
  let remaining = Math.min(Math.max(dt, 0), MAX_FRAME);
  const { stiffness, damping, mass } = config;

  while (remaining > 0) {
    const h = Math.min(remaining, SUBSTEP);
    const a = (-stiffness * (state.x - target) - damping * state.v) / mass;
    state.v += a * h;
    state.x += state.v * h;
    remaining -= h;
  }

  return state;
}

/**
 * Whether the spring has stopped in any sense a viewer could perceive.
 *
 * Both conditions matter. Position alone would call it settled at the instant
 * it crosses the target at full speed — the exact middle of an overshoot —
 * and the caller would cancel the loop with the drum still moving.
 */
export function springAtRest(
  state: SpringState,
  target: number,
  epsilon = 0.0004,
): boolean {
  return Math.abs(state.x - target) < epsilon && Math.abs(state.v) < epsilon * 12;
}

/**
 * Named presets, so two rollers on the same screen cannot be tuned apart by
 * accident. Both are deliberately just under critical damping
 * (`2 * sqrt(k * m)`), which is what produces one small overshoot and no
 * second one — a drum with mass in it does not halt dead on the mark, and it
 * does not wobble either.
 */
export const SPRING: Record<"headline" | "chip", SpringConfig> = {
  // k=140 → critical damping is 23.7. At 21 it passes the mark by about 3%.
  headline: { stiffness: 140, damping: 21, mass: 1 },
  // Lighter and quicker: a chip carries four words, not twelve.
  chip: { stiffness: 210, damping: 26, mass: 1 },
};
