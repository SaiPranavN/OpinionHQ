"use client";

/**
 * The circumference of a subject circle: its real distribution as SVG arcs.
 *
 * Vector on purpose — the map zooms, and a ring that rasterises at one size is
 * a smudge at every other. The arcs are dash geometry over a normalised
 * pathLength of 100, which is what lets a data change animate: the browser
 * interpolates `stroke-dasharray` between two readings, so a vote arriving
 * lengthens one arc and shortens another instead of redrawing the ring from
 * nothing.
 *
 * NOTHING HERE IS INVENTED, AND NOTHING STANDS IN FOR NOTHING. No votes means
 * no ring at all: the circumference is simply bare. A placeholder ring —
 * dashed or otherwise — reads as a distribution seen from too far away, and
 * the empty state is already said in words inside the circle.
 *
 * The whole SVG is `aria-hidden`: the distribution reaches screen readers
 * through the circle's accessible name, not through eleven anonymous arcs.
 */

import { ringArcs, type RingSegment } from "@/lib/subject-map/subjects";

export function DistributionRing({
  segments,
  emphasis = 1,
  pulse = false,
}: {
  segments: readonly RingSegment[];
  /** 0–1 multiplier on stroke alpha; the lens dims edge rings slightly. */
  emphasis?: number;
  /** One ripple around the ring — search landings and new arrivals. */
  pulse?: boolean;
}) {
  const arcs = ringArcs(segments);
  if (arcs.length === 0 && !pulse) return null;

  return (
    <svg
      viewBox="0 0 148 148"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <g transform="rotate(-90 74 74)">
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx="74"
            cy="74"
            r="68"
            fill="none"
            pathLength={100}
            stroke={arc.color}
            strokeWidth="4"
            strokeLinecap={arc.rounded ? "round" : "butt"}
            strokeDasharray={arc.dash}
            strokeDashoffset={arc.offset}
            opacity={0.92 * emphasis}
            style={{
              transition:
                "stroke-dasharray 700ms var(--ease-ohq), stroke-dashoffset 700ms var(--ease-ohq)",
            }}
          />
        ))}
      </g>
      {pulse ? (
        <circle
          cx="74"
          cy="74"
          r="68"
          fill="none"
          stroke="var(--color-veil)"
          strokeWidth="1.5"
          className="ohq-map-ripple"
        />
      ) : null}
    </svg>
  );
}
