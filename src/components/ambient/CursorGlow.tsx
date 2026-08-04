/**
 * A faint light that trails the pointer.
 *
 * Positioned entirely from the two custom properties the pointer loop writes,
 * so this component never re-renders — it is one div whose `transform` the
 * compositor updates. At 5% alpha over a near-black page it is closer to a
 * change in the room's lighting than to a cursor effect, which is the point:
 * the page should feel responsive without anything appearing to follow you.
 *
 * Mounted only when the runtime reports a fine pointer on a desktop-sized
 * viewport, so touch devices never pay for it.
 */

import { ALPHA } from "@/lib/motion/config";

export function CursorGlow() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{ transition: "opacity 600ms var(--ease-ohq)" }}
    >
      <div
        className="absolute top-1/2 left-1/2 h-[46vmax] w-[46vmax] rounded-full"
        style={{
          // Translated by half the viewport in each direction at the extremes,
          // which puts the glow under the pointer without ever reading its
          // position in JavaScript on this element.
          transform:
            "translate3d(calc(-50% + var(--ohq-px, 0) * 50vw), calc(-50% + var(--ohq-py, 0) * 50vh), 0)",
          background: `radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-positive) ${(
            ALPHA.cursorGlow * 100
          ).toFixed(1)}%, transparent), transparent 62%)`,
          willChange: "transform",
        }}
      />
    </div>
  );
}
