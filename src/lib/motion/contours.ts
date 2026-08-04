/**
 * Contour band geometry.
 *
 * The lines read as a topographic section or a density field — opinion
 * gathering at some depths and thinning at others. They are emphatically *not*
 * a map: there is no coastline, no landmass, and no projection. What they
 * borrow from topography is only the idea that nested lines describe a
 * gradient you cannot see directly, which is a fair picture of sentiment.
 *
 * Every path is a sum of three sines. That is cheap, produces the uneven
 * spacing real contours have (bands crowd where the field is steep), and —
 * critically — is a pure function of the band index. Nothing here reads
 * `Math.random`, so the server and the client generate byte-identical `d`
 * attributes and React never reports a hydration mismatch.
 */

/** The viewBox every generated path is expressed in. */
export const CONTOUR_VIEWBOX = { width: 1200, height: 700 } as const;

/** Samples per path. Enough for a smooth curve, few enough to keep `d` small. */
const SAMPLES = 34;

export interface ContourBand {
  /** SVG path data. */
  d: string;
  /** 0–1, how strongly this band should be drawn. */
  weight: number;
  /** Index into the drift keyframe set. */
  drift: number;
}

/**
 * Deterministic per-band phase. A hash rather than an index so consecutive
 * bands do not march in lockstep, which would read as a rigid pattern — the
 * exact failure this system exists to replace.
 */
function phase(band: number, harmonic: number): number {
  const h = Math.sin(band * 12.9898 + harmonic * 78.233) * 43758.5453;
  return (h - Math.floor(h)) * Math.PI * 2;
}

/**
 * One contour band as a smooth open path across the viewBox.
 *
 * `spread` pushes bands apart toward the vertical edges so the field looks
 * denser through the middle, where a page's content column sits — the lines
 * thin out exactly where they would otherwise compete with body text.
 */
export function contourPath(band: number, total: number): string {
  const { width, height } = CONTOUR_VIEWBOX;
  // Bands run from just above the top edge to just below the bottom one, so no
  // path terminates inside the frame where a loose end would be visible.
  const t = total <= 1 ? 0.5 : band / (total - 1);
  const base = -60 + t * (height + 120);

  // Amplitude tapers at the extremes: the outer bands stay calm so the edge
  // fade has something quiet to dissolve.
  const taper = Math.sin(Math.PI * t) * 0.7 + 0.3;
  const a1 = 46 * taper;
  const a2 = 19 * taper;
  const a3 = 8 * taper;

  const p1 = phase(band, 1);
  const p2 = phase(band, 2);
  const p3 = phase(band, 3);

  const points: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES;
    const x = u * width;
    const y =
      base +
      a1 * Math.sin(u * Math.PI * 1.7 + p1) +
      a2 * Math.sin(u * Math.PI * 3.1 + p2) +
      a3 * Math.sin(u * Math.PI * 5.3 + p3);
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  // A polyline through 35 dense samples is visually indistinguishable from a
  // spline at this scale and keeps the attribute a third of the size.
  return `M${points.join(" L")}`;
}

/** The full set of bands for a variant. */
export function contourBands(total: number): ContourBand[] {
  if (total <= 0) return [];
  return Array.from({ length: total }, (_, band) => {
    const t = total <= 1 ? 0.5 : band / (total - 1);
    return {
      d: contourPath(band, total),
      // Middle bands are drawn faintest. They cross the content column, and a
      // strong line behind a paragraph is the thing that makes a background
      // feel like clutter rather than depth.
      weight: 0.45 + Math.abs(t - 0.5) * 1.1,
      drift: band % 3,
    };
  });
}
