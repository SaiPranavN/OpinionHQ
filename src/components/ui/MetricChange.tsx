import { changeLabel } from "@/lib/derive";
import type { MetricChange as MetricChangeValue } from "@/lib/types";

/**
 * Seven-day change, always spelled out.
 *
 * A bare "▲ +38.2%" is ambiguous — on a negative-sentiment topic an upward
 * arrow in green reads as good news when it means the opposite. The label says
 * what moved, and the colour follows the meaning rather than the direction.
 *
 * Pass the decorated topic's `label` and `arrow`; both are empty when there is
 * nothing to report, so nothing implies a movement that did not happen.
 */
export function MetricChange({
  change,
  color,
  label,
  arrow,
  size = "md",
}: {
  change: MetricChangeValue;
  color: string;
  label?: string;
  arrow?: string;
  size?: "sm" | "md";
}) {
  const glyph = arrow ?? (change.direction === "up" ? "▲" : "▼");

  return (
    <span
      className={`flex items-center gap-1.5 ${
        size === "sm" ? "text-[11.5px]" : "text-[12.5px]"
      } leading-snug`}
      style={{ color }}
    >
      {glyph ? (
        <span aria-hidden className="text-[8px]">
          {glyph}
        </span>
      ) : null}
      {label ?? changeLabel(change)}
    </span>
  );
}
