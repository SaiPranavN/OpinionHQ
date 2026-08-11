"use client";

/**
 * The shared read-out for every interactive chart.
 *
 * One component so a hover on a donut, a trend line, a participation bar and a
 * poll segment all produce the same object in the same place. Charts that each
 * invent their own tooltip teach the reader a new convention per chart.
 *
 * Positioned absolutely inside a `relative` parent and translated to sit above
 * the pointer, clamped so it never leaves the panel. `pointer-events-none`
 * throughout: a tooltip that can be hovered will flicker.
 */
export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  /** Rendered dimmer, under the values. */
  note?: boolean;
}

export function ChartTooltip({
  x,
  y,
  title,
  rows,
  align = "center",
}: {
  /** Percentage across the parent, 0–100. */
  x: number;
  /** Percentage down the parent, 0–100. */
  y: number;
  title?: string;
  rows: TooltipRow[];
  align?: "center" | "left" | "right";
}) {
  const clampedX = Math.min(Math.max(x, 4), 96);
  const translate =
    align === "left" ? "0%" : align === "right" ? "-100%" : "-50%";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 min-w-[132px] rounded-[10px] border border-veil/12 bg-surface-sunken/95 px-3 py-2.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-[6px]"
      style={{
        left: `${clampedX}%`,
        top: `${y}%`,
        transform: `translate(${translate}, calc(-100% - 10px))`,
      }}
    >
      {title ? (
        <div className="mb-1.5 text-[11px] font-medium tracking-[-0.01em] whitespace-nowrap text-cream">
          {title}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center gap-2.5 whitespace-nowrap ${
              row.note ? "text-[10.5px] text-dim" : "text-[11.5px]"
            }`}
          >
            {row.color ? (
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: row.color }}
              />
            ) : null}
            <span className={row.note ? "" : "text-muted"}>{row.label}</span>
            {!row.note ? (
              <span className="ml-auto font-mono font-medium tabular-nums text-cream-bright">
                {row.value}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
