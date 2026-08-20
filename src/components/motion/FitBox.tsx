"use client";

/**
 * Scales its content down, if and only if it would not otherwise fit.
 *
 * This exists because of one hard constraint the pinned stages introduced: a
 * step that is pinned to the viewport has to fit the viewport, and there is no
 * viewport height that can be assumed. A laptop with a browser toolbar and a
 * dock has around 700px of usable height; a desktop monitor has twice that. The
 * alternative to this is picking a fixed height, and a fixed height is a bet
 * that is wrong at one end or the other — either the panel is clipped on a short
 * screen, or it floats in a sea of empty space on a tall one.
 *
 * So the box takes whatever height its flex parent gives it, and the content is
 * scaled to fit that. At full size — which is the common case — nothing is
 * applied at all: no transform, no layer, no cost.
 *
 * ── The floor ───────────────────────────────────────────────────────────────
 *
 * It will not scale below `min`. Past a certain point shrinking stops being a
 * graceful fit and starts being unreadable body copy, and unreadable is worse
 * than clipped: clipped content is visibly incomplete and a reader knows to go
 * and find the real thing, whereas 8px type looks like it was meant. If the
 * floor is hit, the overflow is masked to transparent rather than cut, so what
 * is missing reads as "continues below" instead of as a rendering fault.
 */

import { useEffect, useRef, useState } from "react";

const FADE =
  "linear-gradient(to bottom, #000 0%, #000 82%, rgba(0,0,0,0.35) 94%, transparent 100%)";

export function FitBox({
  children,
  min = 0.74,
  className = "",
  enabled = true,
}: {
  children: React.ReactNode;
  /** Never scales below this. See the note above. */
  min?: number;
  className?: string;
  /** False leaves the content entirely alone — the phone and reduced paths. */
  enabled?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content || !enabled) {
      setScale(1);
      return;
    }

    const fit = () => {
      const available = box.clientHeight;
      // `scrollHeight` rather than a bounding rect: the rect is the *scaled*
      // height, so measuring it while a scale is applied would feed the result
      // back into itself and converge on something arbitrary.
      const natural = content.scrollHeight;
      if (available <= 0 || natural <= 0) return;
      const next = Math.min(1, available / natural);
      setScale((prev) => {
        const clamped = Math.max(min, next);
        // Ignored below a percent: a height that breathes by a pixel across
        // resizes would otherwise re-scale on every frame of a window drag.
        return Math.abs(prev - clamped) < 0.01 ? prev : clamped;
      });
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
    // `children` is deliberately not a dependency. It is a new React element on
    // every render, so listing it would tear the observer down and rebuild it
    // several times a second while a scene is being scrubbed — and it would buy
    // nothing, because the observer is watching the rendered content directly
    // and already fires when swapping children changes its height.
  }, [min, enabled]);

  const clipped = scale <= min + 0.001 && scale < 1;

  return (
    <div
      ref={boxRef}
      className={`relative min-h-0 ${className}`}
      style={clipped ? { maskImage: FADE, WebkitMaskImage: FADE } : undefined}
    >
      <div
        ref={contentRef}
        style={
          scale < 1
            ? { transform: `scale(${scale.toFixed(3)})`, transformOrigin: "top center" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
