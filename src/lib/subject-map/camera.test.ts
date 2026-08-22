import { describe, expect, it } from "vitest";

import {
  clampCenter,
  clampZoom,
  detailTier,
  fitCamera,
  fitFontSize,
  focusZoom,
  FOCUS_FRACTION,
  inspectZoom,
  lensScale,
  LENS_EDGE,
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
  zoomLimits,
} from "./camera";
import { CIRCLE_DIAMETER, layoutCluster } from "./layout";

const subjects = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, createdKey: i }));
const desktop = { width: 1280, height: 800 };
const phone = { width: 390, height: 700 };

describe("zoomLimits", () => {
  it("fits the whole cluster inside the viewport at minimum zoom", () => {
    const { bounds } = layoutCluster(subjects(150));
    const limits = zoomLimits(desktop, bounds, CIRCLE_DIAMETER);
    expect(bounds.width * limits.min).toBeLessThanOrEqual(desktop.width);
    expect(bounds.height * limits.min).toBeLessThanOrEqual(desktop.height);
  });

  it("does not let a single subject blow up to fill the viewport at the overview", () => {
    const { bounds } = layoutCluster(subjects(1));
    const limits = zoomLimits(desktop, bounds, CIRCLE_DIAMETER);
    expect(limits.min).toBeLessThanOrEqual(1.05);
  });

  it("puts a focused circle at the stated fraction of the smaller dimension", () => {
    const { bounds } = layoutCluster(subjects(150));
    const limits = zoomLimits(desktop, bounds, CIRCLE_DIAMETER);
    expect(CIRCLE_DIAMETER * limits.max).toBeCloseTo(FOCUS_FRACTION * 800, 5);
    // Inside the 70–82% band the spec allows on desktop.
    const fraction = (CIRCLE_DIAMETER * limits.max) / Math.min(desktop.width, desktop.height);
    expect(fraction).toBeGreaterThanOrEqual(0.7);
    expect(fraction).toBeLessThanOrEqual(0.82);
  });

  it("keeps a usable zoom range even for a tiny cluster", () => {
    const { bounds } = layoutCluster(subjects(2));
    const limits = zoomLimits(phone, bounds, CIRCLE_DIAMETER);
    expect(limits.max).toBeGreaterThan(limits.min * 1.5);
  });

  it("on a portrait phone the focused circle spans 75–86% of the width", () => {
    const { bounds } = layoutCluster(subjects(80));
    const limits = zoomLimits(phone, bounds, CIRCLE_DIAMETER);
    const fraction = (CIRCLE_DIAMETER * limits.max) / phone.width;
    expect(fraction).toBeGreaterThanOrEqual(0.75);
    expect(fraction).toBeLessThanOrEqual(0.86);
  });
});

describe("clampCenter", () => {
  const { bounds } = layoutCluster(subjects(150));
  const limits = zoomLimits(desktop, bounds, CIRCLE_DIAMETER);

  /**
   * The panning contract, and it is deliberately not "the window stays inside
   * the cluster". That rule pinned the camera dead still at the default zoom,
   * where the whole cluster already fits — dragging did nothing and the map
   * read as broken. What has to be true is only that the cluster can never be
   * driven off screen and lost.
   */
  it("is draggable at the fitted overview rather than pinned", () => {
    const dragged = clampCenter(bounds.centerX + 400, bounds.centerY, limits.min, desktop, bounds);
    expect(dragged.x).toBeGreaterThan(bounds.centerX);
  });

  it("still stops — a hard shove lands at a bounded distance, not infinity", () => {
    const shoved = clampCenter(1e9, 1e9, limits.min, desktop, bounds);
    const halfW = desktop.width / (2 * limits.min);
    const halfH = desktop.height / (2 * limits.min);
    expect(shoved.x).toBeLessThanOrEqual(bounds.maxX + halfW);
    expect(shoved.y).toBeLessThanOrEqual(bounds.maxY + halfH);
  });

  it("always leaves part of the cluster on screen, at every zoom level", () => {
    for (const z of [limits.min, limits.min * 2, limits.max / 2, limits.max]) {
      for (const [px, py] of [
        [1e9, 1e9],
        [-1e9, -1e9],
        [1e9, -1e9],
        [-1e9, 1e9],
      ]) {
        const c = clampCenter(px!, py!, z, desktop, bounds);
        const halfW = desktop.width / (2 * z);
        const halfH = desktop.height / (2 * z);
        // The visible window and the cluster must still overlap.
        expect(c.x - halfW).toBeLessThan(bounds.maxX);
        expect(c.x + halfW).toBeGreaterThan(bounds.minX);
        expect(c.y - halfH).toBeLessThan(bounds.maxY);
        expect(c.y + halfH).toBeGreaterThan(bounds.minY);
      }
    }
  });

  it("leaves an in-bounds camera untouched", () => {
    const z = limits.max;
    const clamped = clampCenter(bounds.centerX + 10, bounds.centerY - 10, z, desktop, bounds);
    expect(clamped.x).toBeCloseTo(bounds.centerX + 10);
    expect(clamped.y).toBeCloseTo(bounds.centerY - 10);
  });

  it("a one-subject cluster is still draggable, just not far", () => {
    const tiny = layoutCluster(subjects(1));
    const tinyLimits = zoomLimits(desktop, tiny.bounds, CIRCLE_DIAMETER);
    const dragged = clampCenter(1e9, 0, tinyLimits.min, desktop, tiny.bounds);
    expect(dragged.x).toBeGreaterThan(tiny.bounds.centerX);
    expect(Number.isFinite(dragged.x)).toBe(true);
  });
});

describe("zoomAtPoint", () => {
  it("keeps the world point under the pointer fixed", () => {
    const camera = { x: 40, y: -25, z: 0.8 };
    const pointer = { x: 900, y: 150 };
    const before = screenToWorld(pointer.x, pointer.y, camera, desktop);
    const zoomed = zoomAtPoint(camera, 1.6, pointer.x, pointer.y, desktop);
    const after = screenToWorld(pointer.x, pointer.y, zoomed, desktop);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("round-trips with worldToScreen", () => {
    const camera = { x: -12, y: 300, z: 2.2 };
    const screen = worldToScreen(55, 70, camera, desktop);
    const world = screenToWorld(screen.x, screen.y, camera, desktop);
    expect(world.x).toBeCloseTo(55);
    expect(world.y).toBeCloseTo(70);
  });
});

describe("inspect and focus zooms", () => {
  const { bounds } = layoutCluster(subjects(100));
  const limits = zoomLimits(desktop, bounds, CIRCLE_DIAMETER);

  it("first click zooms a small circle to a readable inspection size", () => {
    const z = inspectZoom(limits.min, desktop, CIRCLE_DIAMETER, limits);
    expect(CIRCLE_DIAMETER * z).toBeCloseTo(320, 0);
  });

  it("never zooms out from an already-close camera", () => {
    const close = limits.max * 0.9;
    expect(inspectZoom(close, desktop, CIRCLE_DIAMETER, limits)).toBeGreaterThanOrEqual(close);
  });

  it("focus zoom is the maximum zoom", () => {
    expect(focusZoom(desktop, CIRCLE_DIAMETER, limits)).toBeCloseTo(limits.max);
  });

  it("fitCamera returns the centred overview", () => {
    const cam = fitCamera(bounds, limits);
    expect(cam).toEqual({ x: bounds.centerX, y: bounds.centerY, z: limits.min });
  });
});

describe("clampZoom", () => {
  it("clamps to both limits", () => {
    const limits = { min: 0.4, max: 3 };
    expect(clampZoom(0.1, limits)).toBe(0.4);
    expect(clampZoom(9, limits)).toBe(3);
    expect(clampZoom(1.5, limits)).toBe(1.5);
  });
});

describe("lensScale", () => {
  it("is full size at the viewport centre", () => {
    const { scale, opacity } = lensScale(desktop.width / 2, desktop.height / 2, desktop);
    expect(scale).toBe(1);
    expect(opacity).toBe(1);
  });

  it("reaches exactly the edge scale at a corner and never below", () => {
    const corner = lensScale(0, 0, desktop);
    expect(corner.scale).toBeCloseTo(LENS_EDGE, 5);
    const beyond = lensScale(-500, -500, desktop);
    expect(beyond.scale).toBeGreaterThanOrEqual(LENS_EDGE);
  });

  it("stays subtle — edge opacity remains high", () => {
    expect(lensScale(0, 0, desktop).opacity).toBeGreaterThan(0.8);
  });
});

describe("detailTier", () => {
  it("hides titles on unreadably small circles", () => {
    expect(detailTier(30)).toBe("dot");
  });
  it("steps through the tiers as the circle grows", () => {
    expect(detailTier(70)).toBe("small");
    expect(detailTier(140)).toBe("medium");
    expect(detailTier(400)).toBe("large");
  });
});

describe("fitFontSize", () => {
  it("gives short titles the maximum size", () => {
    expect(fitFontSize(10, 90, 60, 7, 13)).toBe(13);
  });

  it("shrinks long titles but never below the minimum", () => {
    const long = fitFontSize(400, 90, 60, 7, 13);
    expect(long).toBe(7);
    const medium = fitFontSize(120, 90, 60, 7, 13);
    expect(medium).toBeGreaterThan(7);
    expect(medium).toBeLessThan(13);
  });

  it("a 200-character question still fits the focused text box at minimum size", () => {
    // Capacity at the floor size must exceed the longest realistic question:
    // chars * 0.52f * 1.25f versus the box area.
    const f = fitFontSize(200, 96, 66, 7, 13);
    expect(200 * 0.52 * f * 1.25 * f).toBeLessThanOrEqual(96 * 66 * 1.05);
  });
});
