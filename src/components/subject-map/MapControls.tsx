"use client";

/**
 * Zoom controls for the map — the accessible, always-visible way in
 * and out of the map. Gestures are the fast path; these are the guaranteed
 * one. They float bottom-right inside the viewport, clear of the focused
 * centre circle, and sit above the safe-area inset so a phone's home
 * indicator never covers "Fit all".
 */

export function MapControls({
  accent,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  accent: "positive" | "poll";
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  const ring =
    accent === "poll" ? "focus-visible:ring-poll/60" : "focus-visible:ring-positive/60";
  const shell = `grid h-10 w-10 cursor-pointer place-items-center border border-veil/14 bg-surface-raised/90 text-[17px] leading-none text-soft outline-none backdrop-blur-sm transition-colors duration-200 hover:border-veil/30 hover:text-cream-bright focus-visible:ring-2 ${ring}`;

  return (
    <div
      // Marks this as chrome rather than map, so a press here is not read as
      // tapping empty space and does not drop the viewer's selection.
      data-map-chrome
      className="absolute right-3 bottom-3 z-20 flex flex-col items-end gap-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex flex-col overflow-hidden rounded-[12px] shadow-[0_10px_30px_-16px_rgba(0,0,0,0.8)]">
        <button type="button" aria-label="Zoom in" onClick={onZoomIn} className={shell}>
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={onZoomOut}
          className={`${shell} border-t-0`}
        >
          −
        </button>
      </div>
      <button
        type="button"
        onClick={onFit}
        className={`cursor-pointer rounded-full border border-veil/14 bg-surface-raised/90 px-3.5 py-2 font-mono text-[10.5px] tracking-[0.12em] whitespace-nowrap uppercase text-soft shadow-[0_10px_30px_-16px_rgba(0,0,0,0.8)] outline-none backdrop-blur-sm transition-colors duration-200 hover:border-veil/30 hover:text-cream-bright focus-visible:ring-2 ${ring}`}
      >
        Fit all
      </button>
    </div>
  );
}
