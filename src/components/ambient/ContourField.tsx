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

import { ALPHA, DURATION, PARALLAX } from "@/lib/motion/config";
import { contourBands, CONTOUR_VIEWBOX } from "@/lib/motion/contours";

interface ContourFieldProps {
  count: number;
  animate: boolean;
  parallax: boolean;
  /** Draws the faint fragmented grid behind the contours. Internal pages. */
  grid?: boolean;
}

const EDGE_FADE =
  "radial-gradient(ellipse 78% 68% at 50% 46%, #000 32%, rgba(0,0,0,0.55) 62%, transparent 88%)";

export function ContourField({
  count,
  animate,
  parallax,
  grid = false,
}: ContourFieldProps) {
  const bands = contourBands(count);
  if (bands.length === 0 && !grid) return null;

  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        maskImage: EDGE_FADE,
        WebkitMaskImage: EDGE_FADE,
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

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${CONTOUR_VIEWBOX.width} ${CONTOUR_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid slice"
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
