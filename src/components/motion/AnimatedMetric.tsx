"use client";

/**
 * A number that counts up when it first enters the viewport.
 *
 * The correctness rule this obeys: **the real value is never unavailable.**
 * The exact figure is rendered on the server, is what a screen reader
 * announces, and is what sits in the DOM if JavaScript never runs. Only the
 * *visible glyphs* interpolate, and only after hydration — so there is no
 * moment where the page is showing a number nobody can check, and no layout
 * shift, because the element is already the width of its final value.
 *
 * A reader who arrives mid-animation sees a number climbing to the truth. A
 * reader using assistive technology, or one who asked for reduced motion, sees
 * the truth immediately. Neither is shown something false.
 */

import { useEffect, useRef, useState } from "react";

import { DURATION } from "@/lib/motion/config";

interface AnimatedMetricProps {
  value: number;
  /** Formatter for the display string. Defaults to Indian digit grouping. */
  format?: (n: number) => string;
  className?: string;
}

const defaultFormat = (n: number) => n.toLocaleString("en-IN");

export function AnimatedMetric({
  value,
  format = defaultFormat,
  className,
}: AnimatedMetricProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Starts at the true value so the server output and the first client paint
  // agree exactly — animating from zero on the server would flash a wrong
  // number and, worse, change the element's width after hydration.
  const [shown, setShown] = useState(value);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || played.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || played.current) return;
        played.current = true;
        observer.disconnect();

        const from = 0;
        const start = performance.now();
        let frame = 0;

        const tick = (now: number) => {
          const t = Math.min((now - start) / DURATION.metricMs, 1);
          // Ease-out cubic. Data products want a number that decelerates into
          // place; a spring would overshoot and briefly display a value higher
          // than the real one, which is exactly the wrong lie to tell.
          const eased = 1 - (1 - t) ** 3;
          setShown(Math.round(from + (value - from) * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);

        // Captured so an unmount mid-count cannot leave a loop running.
        cleanup = () => cancelAnimationFrame(frame);
      },
      { threshold: 0.4 },
    );

    let cleanup = () => {};
    observer.observe(el);
    return () => {
      observer.disconnect();
      cleanup();
    };
  }, [value]);

  return (
    // A one-cell grid holding both copies on top of each other. The real value
    // is what sizes the box and what a screen reader announces; the animating
    // copy is painted over it and is invisible to assistive tech.
    //
    // This is what keeps the count from shifting layout: "476" and "41.3K" are
    // different widths, and a metric that resizes while it counts pushes its
    // siblings around for the length of the animation. Sizing from the final
    // value means the box is correct before the first frame.
    <span ref={ref} className={`inline-grid ${className ?? ""}`}>
      <span
        aria-hidden
        className="col-start-1 row-start-1 justify-self-start tabular-nums"
      >
        {format(shown)}
      </span>
      <span className="col-start-1 row-start-1 justify-self-start opacity-0">
        {format(value)}
      </span>
    </span>
  );
}
