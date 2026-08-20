import { describe, expect, it } from "vitest";

import {
  CULL,
  edgeMask,
  faceStyleAt,
  radiusFor,
  windowInsets,
  wrap,
} from "@/lib/motion/cylinder";
import { SPRING, springAtRest, stepSpring } from "@/lib/motion/spring";

/** Pulls the numbers back out of a transform string, for the assertions below. */
function parse(transform: string) {
  const deg = Number(/rotateX\((-?[\d.]+)deg\)/.exec(transform)?.[1]);
  const z = Number(/translateZ\((-?[\d.]+)px\)/.exec(transform)?.[1]);
  const scale = Number(/scale\((-?[\d.]+)\)/.exec(transform)?.[1]);
  return { deg, z, scale };
}

/**
 * Where a face's centre lands on screen, in px from the drum's centre.
 *
 * The composition is `translateZ(-R)` on the drum and `rotateX(a) translateZ(R)`
 * on the face. `rotateX(a)` maps the z axis to `(0, -sin a, cos a)`, so the face
 * centre ends up at `y = -R sin a`, `z = R cos a - R`.
 */
function project(deg: number, radius: number) {
  const a = (deg * Math.PI) / 180;
  return { y: -radius * Math.sin(a), z: radius * Math.cos(a) - radius };
}

describe("ring arithmetic", () => {
  it("takes the short way round", () => {
    expect(wrap(0, 8)).toBe(0);
    expect(wrap(1, 8)).toBe(1);
    // 7 forward on a ring of 8 is 1 backward, and the drum must place it there
    // rather than spinning six faces past the reader to reach it.
    expect(wrap(7, 8)).toBe(-1);
    expect(wrap(-7, 8)).toBe(1);
  });

  it("is unaffected by how many times the drum has been round", () => {
    // The position is unbounded on purpose — it only ever increases, so the drum
    // always turns the same way and never unwinds through six lines to get from
    // the last back to the first. This is the property that lets it be: a whole
    // number of revolutions later, the geometry has to be identical.
    //
    // A revolution is `count` faces, not a round number of them. The first
    // version of this test compared position 1000.4 against 0.4 on a ring of 3
    // and failed, correctly: 1000.4 is congruent to 1.4 mod 3, so those are two
    // genuinely different positions on the drum.
    for (const count of [3, 8]) {
      for (const laps of [1, 7, 400]) {
        for (let i = 0; i < count; i++) {
          expect(wrap(i - (0.4 + laps * count), count), `${count}/${laps}`).toBeCloseTo(
            wrap(i - 0.4, count),
            10,
          );
        }
      }
    }
  });
});

describe("drum geometry", () => {
  it("places faces so they tile the cylinder exactly", () => {
    // The whole claim of the component: the bottom edge of one line and the top
    // edge of the next are the same point on the drum. Tested by projecting both
    // and checking the gap between them closes.
    for (const step of [20, 26, 30, 34, 45]) {
      const h = 120;
      const R = radiusFor(h, step);
      const centreBottom = h / 2;
      const next = project(-step, R);
      // The next face is rotated, so its own half-height foreshortens.
      const nextTop = next.y - (h / 2) * Math.cos((step * Math.PI) / 180);
      expect(Math.abs(nextTop - centreBottom), `step ${step}`).toBeLessThan(0.001);
    }
  });

  it("lands the centred face at exactly 1:1", () => {
    // Without the drum's `translateZ(-R)` pushback the perspective divide would
    // render the centred line larger than the box reserved for it — a headline
    // that visibly jumps the moment the drum takes over from the flat fallback.
    const R = radiusFor(140, 26);
    const { z } = project(0, R);
    expect(z).toBeCloseTo(0, 10);
    expect(parse(faceStyleAt(0, 0, 3, R, 26, 5).transform).scale).toBe(1);
  });

  it("degenerates safely rather than dividing by zero", () => {
    expect(radiusFor(0, 26)).toBe(0);
    expect(radiusFor(-10, 26)).toBe(0);
    expect(radiusFor(120, 0)).toBe(0);
  });

  it("rolls upward: the face being left behind lifts away over the top", () => {
    const R = radiusFor(120, 30);
    // Mid-transition from face 0 to face 1.
    const leaving = parse(faceStyleAt(0, 0.5, 3, R, 30, 5).transform);
    const arriving = parse(faceStyleAt(1, 0.5, 3, R, 30, 5).transform);
    expect(project(leaving.deg, R).y).toBeLessThan(0);
    expect(project(arriving.deg, R).y).toBeGreaterThan(0);
  });
});

describe("what stays sharp", () => {
  it("never blurs the line being read", () => {
    const R = radiusFor(120, 26);
    expect(faceStyleAt(0, 0, 3, R, 26, 5).filter).toBe("none");
    // And not merely at dead centre: a spring settles asymptotically, so a face
    // a thousandth of a step out is still the line somebody is reading.
    expect(faceStyleAt(0, 0.001, 3, R, 26, 5).filter).toBe("none");
    expect(faceStyleAt(0, 0.05, 3, R, 26, 5).filter).toBe("none");
  });

  it("dips through the turn instead of dissolving", () => {
    // The three points the falloff is built from. The middle one is the reason
    // it exists: halfway through a change both faces sit at away = 0.5, and the
    // old curve put both at 79% — which on the hero headline at phone width is
    // six lines of display type stacked in a one-line window.
    const R = radiusFor(120, 26);
    const opacityAt = (away: number) =>
      Number(faceStyleAt(0, away, 8, R, 26, 5).opacity);
    expect(opacityAt(0)).toBe(1);
    expect(opacityAt(0.5)).toBeCloseTo(0.465, 2);
    expect(opacityAt(1)).toBeCloseTo(0.14, 2);
    // Monotonic across the whole visible range: a face must never brighten as
    // it turns away.
    for (let a = 0; a < CULL; a += 0.02) {
      expect(opacityAt(a + 0.02), `away ${a}`).toBeLessThanOrEqual(opacityAt(a));
    }
  });

  it("blurs and fades the neighbours", () => {
    const R = radiusFor(120, 26);
    const neighbour = faceStyleAt(1, 0, 3, R, 26, 5);
    expect(neighbour.filter).toMatch(/^blur\(/);
    expect(Number(neighbour.opacity)).toBeLessThan(0.2);
    expect(Number(neighbour.opacity)).toBeGreaterThan(0);
  });

  it("stops compositing faces that have gone edge-on", () => {
    const R = radiusFor(120, 26);
    const far = faceStyleAt(0, CULL + 0.2, 12, R, 26, 5);
    expect(far.visibility).toBe("hidden");
    expect(far.opacity).toBe("0");
  });

  it("keeps opacity a real number at every position on the ring", () => {
    const R = radiusFor(120, 26);
    for (let x = 0; x < 8; x += 0.05) {
      for (let i = 0; i < 8; i++) {
        const o = Number(faceStyleAt(i, x, 8, R, 26, 5).opacity);
        expect(Number.isFinite(o)).toBe(true);
        expect(o).toBeGreaterThanOrEqual(0);
        expect(o).toBeLessThanOrEqual(1);
      }
    }
  });

  it("has exactly one fully-opaque face at rest", () => {
    const R = radiusFor(120, 26);
    const solid = [0, 1, 2, 3, 4, 5, 6, 7].filter(
      (i) => Number(faceStyleAt(i, 3, 8, R, 26, 5).opacity) > 0.9,
    );
    expect(solid).toEqual([3]);
  });
});

describe("the window", () => {
  it("frames the centred face and fades only the overhang", () => {
    // The bug this replaced: a fixed 19%/81% opaque band against a centred face
    // that occupies 13.2%–86.8% of the clip, which dissolved the top and bottom
    // of the line being read.
    for (const peek of [0.08, 0.18, 0.24, 0.4]) {
      const { drum } = windowInsets(peek);
      // Where the centred face actually sits inside the clip.
      const band = (peek / (1 + 2 * peek)) * 100;
      expect(Number(drum.replace("%", "")), `peek ${peek}`).toBeCloseTo(band, 3);
      expect(edgeMask(drum)).toContain(`#000 ${drum}`);
      expect(edgeMask(drum)).toContain(`calc(100% - ${drum})`);
    }
  });

  it("does not mask a window with no overhang to dissolve", () => {
    // A flush clip has nothing outside the line, so a gradient there could only
    // eat the line itself.
    expect(windowInsets(0).masked).toBe(false);
    expect(windowInsets(0.18).masked).toBe(true);
  });
});

describe("the spring", () => {
  it("settles on its target", () => {
    const s = { x: 0, v: 0 };
    for (let i = 0; i < 240 && !springAtRest(s, 1); i++) {
      stepSpring(s, 1, 1 / 60, SPRING.headline);
    }
    expect(springAtRest(s, 1)).toBe(true);
    expect(s.x).toBeCloseTo(1, 3);
  });

  it("overshoots once and comes back — it has mass in it", () => {
    const s = { x: 0, v: 0 };
    let peak = 0;
    for (let i = 0; i < 240; i++) {
      stepSpring(s, 1, 1 / 60, SPRING.headline);
      peak = Math.max(peak, s.x);
    }
    expect(peak).toBeGreaterThan(1);
    // Enough to feel like inertia, not enough to read as a bounce.
    expect(peak).toBeLessThan(1.12);
  });

  it("looks the same at 60Hz, 120Hz and after a stall", () => {
    // The reason for fixed substeps. A spring whose feel depends on the refresh
    // rate is a spring that was tuned on one machine — and naive Euler at a long
    // frame does not merely feel different, it diverges.
    const run = (dt: number, steps: number) => {
      const s = { x: 0, v: 0 };
      for (let i = 0; i < steps; i++) stepSpring(s, 1, dt, SPRING.headline);
      return s.x;
    };
    expect(run(1 / 120, 60)).toBeCloseTo(run(1 / 60, 30), 3);
    expect(run(1 / 240, 120)).toBeCloseTo(run(1 / 60, 30), 3);
  });

  it("clamps a stalled frame instead of simulating it", () => {
    // 400ms after a garbage collection is not 400ms of motion anyone watched,
    // and integrating it would teleport the drum past its target.
    const s = { x: 0, v: 0 };
    stepSpring(s, 1, 4, SPRING.headline);
    expect(s.x).toBeLessThan(1);
    expect(Number.isFinite(s.x)).toBe(true);
  });

  it("is not called at rest while it is still moving through the target", () => {
    // Position alone would call it settled at the instant it crosses at full
    // speed — the exact middle of the overshoot — and the loop would be
    // cancelled with the drum still visibly turning.
    const s = { x: 1, v: 3 };
    expect(springAtRest(s, 1)).toBe(false);
  });

  it("keeps both presets just under critical damping", () => {
    for (const [name, c] of Object.entries(SPRING)) {
      const critical = 2 * Math.sqrt(c.stiffness * c.mass);
      expect(c.damping, name).toBeLessThan(critical);
      // Far enough under to overshoot, close enough not to wobble twice.
      expect(c.damping / critical, name).toBeGreaterThan(0.8);
    }
  });
});
