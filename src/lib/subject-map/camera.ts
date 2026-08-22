/**
 * Camera mathematics for the subject-map viewport.
 *
 * PURE. The camera itself — springs, inertia, gesture state — lives in a hook;
 * everything here is arithmetic over plain numbers, because these are the
 * rules with consequences: the viewer must always be able to see the whole
 * cluster at minimum zoom, must never be able to wander into empty space, and
 * a focused circle must land at a stated fraction of the viewport. Rules like
 * that belong where a test can state them.
 *
 * Conventions: the camera is (x, y, z) where (x, y) is the WORLD point at the
 * centre of the viewport and z is the zoom scale. A world point w appears on
 * screen at `(w - centre) * z + viewport/2`.
 */

import type { ClusterBounds } from "@/lib/subject-map/layout";

export interface Viewport {
  width: number;
  height: number;
}

export interface CameraState {
  x: number;
  y: number;
  z: number;
}

export interface ZoomLimits {
  min: number;
  max: number;
}

/** Comfortable air around the outermost circles at the fitted overview. */
export const FIT_PADDING = 48;

/**
 * How much of the smaller viewport dimension a focused circle occupies at
 * maximum zoom. 0.78 sits inside both stated ranges: 70–82% on desktop and
 * 75–86% of the width on a portrait phone, where the width IS the smaller
 * dimension.
 */
export const FOCUS_FRACTION = 0.78;

/**
 * The overview may not enlarge past this. Without the cap a catalogue of one
 * or two subjects would "fit" at a zoom that blows a single circle up to the
 * whole viewport — with it, a small collection simply sits at natural size.
 */
const OVERVIEW_ZOOM_CAP = 1.05;

/** The overview must stay a real overview even for a tiny cluster. */
const MIN_ZOOM_RANGE = 1.6;

export function zoomLimits(
  viewport: Viewport,
  bounds: ClusterBounds,
  diameter: number,
  padding = FIT_PADDING,
): ZoomLimits {
  const usableW = Math.max(viewport.width - padding * 2, 1);
  const usableH = Math.max(viewport.height - padding * 2, 1);
  const fit = Math.min(usableW / Math.max(bounds.width, 1), usableH / Math.max(bounds.height, 1));

  const min = Math.min(fit, OVERVIEW_ZOOM_CAP);
  const focus = (FOCUS_FRACTION * Math.min(viewport.width, viewport.height)) / diameter;
  const max = Math.max(focus, min * MIN_ZOOM_RANGE);

  return { min, max };
}

export function clampZoom(z: number, limits: ZoomLimits): number {
  return Math.min(Math.max(z, limits.min), limits.max);
}

/**
 * How far past the cluster edge the camera centre may travel, as a fraction
 * of the visible half-extent on that axis.
 *
 * THIS IS WHY THE MAP FEELS LIKE A MAP. The first version clamped the window
 * strictly inside the cluster and, once the whole cluster fitted on screen,
 * pinned the centre exactly — so at the default zoom dragging did nothing at
 * all, which reads as a broken canvas rather than a deliberate boundary.
 *
 * A map instead lets you drag freely and simply refuses to lose the world:
 * you can push the cluster toward an edge, and it stops while a good part of
 * it is still on screen. At 0.55 the furthest you can shove it leaves rather
 * more than half the viewport still looking at cluster, and the bound is the
 * same rule at every zoom level, so panning never changes character.
 */
const PAN_SLACK = 0.55;

/**
 * Clamps the camera centre so the cluster can be moved around freely but
 * never driven off into empty space.
 *
 * Per axis the centre may roam across the cluster's own extent, widened by
 * `PAN_SLACK` of the visible half-extent at each end. When the cluster is
 * smaller than the window that range is still non-empty — it is centred on
 * the cluster and `PAN_SLACK` wide — so a small catalogue is draggable too,
 * just over a shorter distance. Nothing is ever pinned.
 */
export function clampCenter(
  x: number,
  y: number,
  z: number,
  viewport: Viewport,
  bounds: ClusterBounds,
): { x: number; y: number } {
  const halfW = viewport.width / (2 * z);
  const halfH = viewport.height / (2 * z);

  const clampAxis = (value: number, min: number, max: number, half: number, centre: number) => {
    const slack = half * PAN_SLACK;
    const lo = Math.min(min - slack, centre);
    const hi = Math.max(max + slack, centre);
    return Math.min(Math.max(value, lo), hi);
  };

  return {
    x: clampAxis(x, bounds.minX, bounds.maxX, halfW, bounds.centerX),
    y: clampAxis(y, bounds.minY, bounds.maxY, halfH, bounds.centerY),
  };
}

/** The fitted overview: whole cluster, centred, at minimum zoom. */
export function fitCamera(bounds: ClusterBounds, limits: ZoomLimits): CameraState {
  return { x: bounds.centerX, y: bounds.centerY, z: limits.min };
}

/**
 * Zoom toward a screen point: the world point under the pointer stays under
 * the pointer. This is what makes wheel-zoom feel like leaning toward a spot
 * rather than the map inflating from its middle.
 */
export function zoomAtPoint(
  camera: CameraState,
  newZ: number,
  screenX: number,
  screenY: number,
  viewport: Viewport,
): CameraState {
  const offsetX = screenX - viewport.width / 2;
  const offsetY = screenY - viewport.height / 2;
  const worldX = camera.x + offsetX / camera.z;
  const worldY = camera.y + offsetY / camera.z;
  return {
    x: worldX - offsetX / newZ,
    y: worldY - offsetY / newZ,
    z: newZ,
  };
}

/** Screen position of a world point under a camera. */
export function worldToScreen(
  wx: number,
  wy: number,
  camera: CameraState,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: (wx - camera.x) * camera.z + viewport.width / 2,
    y: (wy - camera.y) * camera.z + viewport.height / 2,
  };
}

/** World position under a screen point. */
export function screenToWorld(
  sx: number,
  sy: number,
  camera: CameraState,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: camera.x + (sx - viewport.width / 2) / camera.z,
    y: camera.y + (sy - viewport.height / 2) / camera.z,
  };
}

/**
 * The medium "inspection" zoom a first click lands on: the circle readable at
 * roughly 320 screen px — or under half the smaller viewport dimension on a
 * screen too small for that. Never zooms *out*: clicking a circle while
 * already close does not pull the viewer away from it.
 */
export function inspectZoom(
  currentZ: number,
  viewport: Viewport,
  diameter: number,
  limits: ZoomLimits,
): number {
  const target = Math.min(320, Math.min(viewport.width, viewport.height) * 0.48) / diameter;
  return clampZoom(Math.max(target, currentZ), limits);
}

/** The full focus zoom — the circle at FOCUS_FRACTION of the viewport. */
export function focusZoom(viewport: Viewport, diameter: number, limits: ZoomLimits): number {
  return clampZoom((FOCUS_FRACTION * Math.min(viewport.width, viewport.height)) / diameter, limits);
}

/* ------------------------------------------------------------------- lens */

/**
 * The Apple Watch lens: circles near the viewport centre read at full size,
 * circles at the edges pull back slightly. Screen-space, subtle, and bounded —
 * the multiplier never leaves [LENS_EDGE, 1], so layout spacing can account
 * for it exactly.
 */
export const LENS_EDGE = 0.78;
export const LENS_EDGE_OPACITY = 0.86;

function smoothstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c * c * (3 - 2 * c);
}

export function lensScale(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): { scale: number; opacity: number } {
  const dx = screenX - viewport.width / 2;
  const dy = screenY - viewport.height / 2;
  // Normalise against the half-diagonal so corners reach exactly the edge value.
  const reach = Math.hypot(viewport.width, viewport.height) / 2;
  const t = smoothstep(Math.hypot(dx, dy) / Math.max(reach, 1));
  return {
    scale: 1 - (1 - LENS_EDGE) * t,
    opacity: 1 - (1 - LENS_EDGE_OPACITY) * t,
  };
}

/* ----------------------------------------------------------------- detail */

/**
 * Level of detail, from the on-screen diameter every circle shares.
 *
 * "dot" is icon-only — a title at that size would be smaller than the pixels
 * it is made of, and unreadable text is worse than no text.
 */
export type DetailTier = "dot" | "small" | "medium" | "large";

export function detailTier(screenDiameter: number): DetailTier {
  if (screenDiameter < 52) return "dot";
  if (screenDiameter < 104) return "small";
  if (screenDiameter < 190) return "medium";
  return "large";
}

/* ------------------------------------------------------------- text fit */

/**
 * A font size that lets `chars` characters of wrapped text fit a box, without
 * measuring the DOM. Deliberately heuristic: average glyph width ≈ 0.52 em,
 * line height 1.25 — generous enough that real titles fit with air, and pure
 * enough to run for five hundred circles without a layout pass. The clamps
 * are the real contract: never below `min` (screen-illegible) and never above
 * `max` (a three-word title should not become a poster).
 */
export function fitFontSize(
  chars: number,
  boxWidth: number,
  boxHeight: number,
  min: number,
  max: number,
): number {
  if (chars <= 0) return max;
  const area = boxWidth * boxHeight;
  // chars * (0.52 * f) * (1.25 * f) <= area  →  f = sqrt(area / (0.65 * chars))
  const ideal = Math.sqrt(area / (0.65 * chars));
  return Math.min(Math.max(ideal, min), max);
}
