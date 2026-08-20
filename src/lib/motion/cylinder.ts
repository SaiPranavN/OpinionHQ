/**
 * The geometry of a vertical text drum.
 *
 * Separated from the component that renders it because this is the part with
 * the claims in it — that the faces tile the cylinder exactly, that the centred
 * face lands at 1:1, that the line a reader has settled on is never blurred —
 * and a claim that only exists inside a `requestAnimationFrame` callback is a
 * claim nothing can check. See CylinderRoller for how it is wired up.
 */

/** Signed shortest distance from `x` to 0 on a ring of `n`. */
export function wrap(x: number, n: number): number {
  const m = ((x % n) + n) % n;
  return m > n / 2 ? m - n : m;
}

/**
 * The radius at which faces `step` degrees apart tile a cylinder exactly.
 *
 * Each face subtends `step` degrees; the chord it spans has to be its own
 * height, which puts it at `(h/2) / tan(step/2)` from the axis. Get this wrong
 * and the consequence is not subtle curvature — too small and consecutive lines
 * overlap the one being read, too large and the drum shows gaps between them.
 */
export function radiusFor(faceHeight: number, step: number): number {
  if (faceHeight <= 0 || step <= 0) return 0;
  return faceHeight / 2 / Math.tan((step * Math.PI) / 360);
}

/** Past this many steps off centre a face is edge-on: nothing to composite. */
export const CULL = 1.55;

export interface FaceStyle {
  transform: string;
  opacity: string;
  filter: string;
  visibility: "visible" | "hidden";
}

/**
 * Where face `i` sits, given a drum position measured in faces.
 *
 * Pure, and called from two places for one reason: the render pass needs it for
 * the *initial* inline style. Painting only from the animation loop would leave
 * one frame in which every face is stacked at the top of the drum, unrotated and
 * fully opaque — a visible flash of the whole list, once, on mount.
 */
export function faceStyleAt(
  i: number,
  x: number,
  count: number,
  radius: number,
  step: number,
  blurPx: number,
): FaceStyle {
  const d = wrap(i - x, count);
  const away = Math.abs(d);
  if (away > CULL) {
    return { transform: "", opacity: "0", filter: "none", visibility: "hidden" };
  }

  // Blur is dropped rather than set to zero once a face is near the centre. A
  // blur filter forces its own raster layer, and text rasterised through one
  // never comes back quite as crisp — which is exactly what would be wrong with
  // the line a reader has just settled on.
  const blur = away < 0.06 ? 0 : Math.min(away, 1.4) * blurPx;

  return {
    // The sign is what makes the drum roll *upward*: as the position advances,
    // the face being left behind takes a positive rotateX and lifts away over
    // the top, and the one arriving comes up from below.
    transform: `rotateX(${(-d * step).toFixed(3)}deg) translateZ(${radius.toFixed(
      2,
    )}px) scale(${(1 - away * 0.045).toFixed(4)})`,
    /*
     * Opacity dips hard through the turn and recovers.
     *
     * This was `1 - away² * 0.86`, which is a perfectly reasonable falloff and
     * was wrong in one specific place: halfway through a change both faces sit
     * at `away = 0.5`, and that curve put both of them at 79%. On the pill,
     * where a face is four words, two lines at 79% is a legible crossfade. On
     * the hero headline at phone width, where a phrase runs to three lines, it
     * is six lines of display type stacked in a window one line tall — and the
     * roll reads as a smear rather than as an object turning.
     *
     * The quadratic below passes through three points chosen for what each of
     * them is for: 1.0 at the centre, because the line being read must be
     * solid; 0.46 at half a step, so the turn dips like a shutter instead of
     * dissolving; and 0.14 at a full step, which is the resting hint of the
     * next line that `peek` exists to show.
     */
    opacity: Math.max(0, 1 - 1.28 * away + 0.42 * away * away).toFixed(3),
    filter: blur === 0 ? "none" : `blur(${blur.toFixed(2)}px)`,
    visibility: "visible",
  };
}

/**
 * The clip and drum insets, as percentage strings.
 *
 * A percentage `top` on an absolutely positioned box resolves against its
 * containing block's height — which is the roller's own layout box, the thing
 * the invisible ghosts already size correctly for free. So the clip extends past
 * the box by exactly `peek` of it and the drum sits back inside at exactly the
 * box's height, at every viewport and every wrap, with nothing in JavaScript
 * having to be right about any of it.
 *
 * That separation is the point. The measured pixel height can be momentarily
 * stale — before a web font swaps, or on a host that throttles ResizeObserver —
 * and if the window's geometry depended on it too, a stale read would mis-size
 * and mis-place the clip rather than merely rounding the curvature off.
 */
export function windowInsets(peek: number) {
  return {
    clip: `${(-peek * 100).toFixed(4)}%`,
    drum: `${((peek / (1 + 2 * peek)) * 100).toFixed(4)}%`,
    masked: peek > 0.04,
  };
}

/**
 * The window's edge fade.
 *
 * The opaque band is exactly the centred face and the fade is exactly the
 * overhang either side of it, which is the only definition that holds at every
 * `peek`.
 *
 * It was a fixed `transparent 0%, #000 19%, #000 81%, transparent` first, and
 * that is worth recording because it looked deliberate: at peek 0.18 the centred
 * face occupies 13.2%–86.8% of the clip, so an opaque band of 19%–81% faded out
 * the top and bottom of *the line being read*. On a one-line chip nobody would
 * have noticed. On a two-line headline it dissolved the second line.
 */
export function edgeMask(drumInset: string): string {
  return `linear-gradient(to bottom, transparent 0%, #000 ${drumInset}, #000 calc(100% - ${drumInset}), transparent 100%)`;
}
