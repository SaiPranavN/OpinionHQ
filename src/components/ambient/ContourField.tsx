/**
 * Layer 2 — organic contour lines.
 *
 * Replaces the square grid. Where the grid said "dashboard", these say
 * "a field with a gradient in it": nested bands that crowd and thin, drawn
 * from sums of sines rather than from any map.
 *
 * The whole set is one `<svg>` with a handful of paths and no per-frame JS.
 * Drift is a CSS transform on grouped bands, so the browser composites it;
 * the only other motion is a slow `stroke-dashoffset` crawl, which reads as
 * signal travelling along the line and costs nothing to animate.
 *
 * Two things keep it from becoming clutter: a radial mask that dissolves the
 * lines toward every edge, and per-band weights that draw the middle bands —
 * the ones crossing the content column — faintest of all.
 */

import { ALPHA, DURATION, PARALLAX, type DeviceTier } from "@/lib/motion/config";
import { contourBands, CONTOUR_VIEWBOX } from "@/lib/motion/contours";

interface ContourFieldProps {
  count: number;
  animate: boolean;
  parallax: boolean;
  /** Decides the fit and the edge fade. See the two constants below. */
  device: DeviceTier;
  /** Draws the faint fragmented grid behind the contours. Internal pages. */
  grid?: boolean;
}

/**
 * The edge fade, per shape of screen.
 *
 * A 78%-wide ellipse on a 1440px desktop leaves ~300px of field either side of
 * the content column with something in it. The same ellipse on a 390px phone is
 * 304px wide, and since the content column *is* the screen there, it dissolves
 * the lines exactly where they are the only thing to see. The portrait fade is
 * wider and holds full strength further out.
 */
const EDGE_FADE =
  "radial-gradient(ellipse 78% 68% at 50% 46%, #000 32%, rgba(0,0,0,0.55) 62%, transparent 88%)";
const EDGE_FADE_PORTRAIT =
  "radial-gradient(ellipse 108% 76% at 50% 46%, #000 46%, rgba(0,0,0,0.62) 74%, transparent 97%)";

export function ContourField({
  count,
  animate,
  parallax,
  device,
  grid = false,
}: ContourFieldProps) {
  const bands = contourBands(count);
  if (bands.length === 0 && !grid) return null;

  const portrait = device === "mobile";
  const fade = portrait ? EDGE_FADE_PORTRAIT : EDGE_FADE;

  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        maskImage: fade,
        WebkitMaskImage: fade,
        ...(parallax
          ? {
              transform: `translate3d(0, calc(var(--ohq-scroll, 0) * ${-PARALLAX.contour}px), 0)`,
              willChange: "transform",
            }
          : {}),
      }}
    >
      {/*
        The old square grid, kept only where a variant asks for it: composers
        and verification screens, where the page is a form and a faint ruling
        is genuinely useful. At 4.5% it is a third of its former weight and is
        always cut with contours on top, so it can no longer dominate.
      */}
      {grid ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, color-mix(in oklab, var(--color-veil) ${
              ALPHA.gridLine * 100
            }%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-veil) ${
              ALPHA.gridLine * 100
            }%, transparent) 1px, transparent 1px)`,
            backgroundSize: "clamp(56px, 6vw, 84px) clamp(56px, 6vw, 84px)",
          }}
        />
      ) : null}

      {/*
        `slice` on a phone is why there were barely any lines to see.

        The field is authored in a 1200×700 landscape box. Covering a 390×844
        portrait viewport with `slice` scales it by 1.21 to match the *height*,
        which renders the field 1447px wide inside a 390px window — so a phone
        was shown the middle 27% of it, magnified past the point where any of the
        curvature survives. Seven bands became seven almost-straight lines, and
        then the edge mask took most of those.

        `none` shows the whole field instead. It squashes horizontally, which
        raises the wave frequency — on a texture at 5.5% alpha that reads as
        more of the thing rather than as distortion, and `non-scaling-stroke`
        below keeps every line a true hairline through it.
      */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${CONTOUR_VIEWBOX.width} ${CONTOUR_VIEWBOX.height}`}
        preserveAspectRatio={portrait ? "none" : "xMidYMid slice"}
        // Decorative: the contours carry no information a reader could lose.
        aria-hidden
        focusable="false"
      >
        {bands.map((band, i) => (
          <g
            key={i}
            style={
              animate
                ? {
                    animation: `ohq-contour-${band.drift} ${
                      DURATION.contour[band.drift % DURATION.contour.length]
                    }s ease-in-out infinite`,
                    // Each band starts somewhere different in its cycle, so the
                    // set never moves as one sheet.
                    animationDelay: `${-i * 7.3}s`,
                  }
                : undefined
            }
          >
            <path
              d={band.d}
              fill="none"
              stroke={`color-mix(in oklab, var(--color-veil) ${(
                band.weight * ALPHA.contourLine * 100
              ).toFixed(2)}%, transparent)`}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {/*
              A brighter dashed copy of every third band, crawling slowly along
              its own path. This is the "signal moving through the field" note —
              at 8.5% alpha it is barely a glimmer, which is the intent.
            */}
            {animate && i % 3 === 1 ? (
              <path
                d={band.d}
                fill="none"
                stroke={`color-mix(in oklab, var(--color-positive) ${(
                  ALPHA.contourLineStrong * 100
                ).toFixed(2)}%, transparent)`}
                strokeWidth="1.2"
                strokeDasharray="3 190"
                vectorEffect="non-scaling-stroke"
                style={{
                  animation: `ohq-contour-crawl ${42 + i * 6}s linear infinite`,
                }}
              />
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}
