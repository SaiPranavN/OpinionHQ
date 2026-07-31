"use client";

/**
 * The "Hot right now" strip (brief §12.2).
 *
 * One topic at a time, with a simplified three-part readout: name, then
 * headline sentiment · participants · what moved this week. The whole item is
 * a link; cycling pauses on hover, on focus, when the tab is hidden, and
 * whenever the visitor asks it to.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { changeLabel } from "@/lib/derive";
import type { DecoratedTopic } from "@/lib/types";

const CYCLE_MS = 5200;

export function TrendingTicker({ topics }: { topics: DecoratedTopic[] }) {
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const itemRef = useRef<HTMLAnchorElement>(null);

  const total = topics.length;
  const current = topics[index % total];

  const step = useCallback(
    (direction: number) => setIndex((i) => (i + direction + total) % total),
    [total],
  );

  useEffect(() => {
    if (userPaused || hoverPaused || total < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      // A hidden tab freezes CSS animations but not timers, so advancing here
      // would restart the slide-up forever and leave the row invisible.
      if (document.hidden) return;
      step(1);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [userPaused, hoverPaused, total, step]);

  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "ohq-tick-in .5s cubic-bezier(.2,.7,.2,1)";
    // Guard against an animation interrupted mid-flight leaving the row stuck
    // on its 0% keyframe (opacity 0).
    const settle = window.setTimeout(() => {
      el.style.animation = "none";
    }, 700);
    return () => window.clearTimeout(settle);
  }, [index]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setUserPaused(true);
      step(1);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setUserPaused(true);
      step(-1);
    }
  };

  if (!current) return null;

  return (
    <section
      aria-label="Hot right now"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setHoverPaused(true)}
      onBlurCapture={() => setHoverPaused(false)}
      onKeyDown={onKeyDown}
      style={{ top: "var(--ohq-nav-h)" }}
      className="sticky z-40 border-b border-white/8 bg-[rgba(14,14,14,0.94)] backdrop-blur-[14px]"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5 sm:gap-5 sm:px-8 lg:px-14">
        <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap uppercase text-positive-light">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-positive" />
          <span className="hidden sm:inline">Hot right now</span>
          <span className="sm:hidden">Hot</span>
        </span>

        <div aria-live="polite" className="min-w-0 flex-1 overflow-hidden">
          <Link
            ref={itemRef}
            href={`/topics/${current.id}`}
            className="flex min-w-0 flex-col gap-0.5 rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-positive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e0e] sm:flex-row sm:items-baseline sm:gap-3"
          >
            <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-cream">
              {current.name}
            </span>
            <span className="flex min-w-0 items-baseline gap-1.5 truncate text-[12px] text-dim">
              <span className="font-semibold" style={{ color: current.dominantColor }}>
                {current.headlineMetric}
              </span>
              <span aria-hidden className="text-white/20">
                ·
              </span>
              <span className="whitespace-nowrap">{current.participantsShort}</span>
              <span aria-hidden className="hidden text-white/20 md:inline">
                ·
              </span>
              <span
                className="hidden truncate md:inline"
                style={{ color: current.changeColor }}
              >
                {changeLabel(current.change)}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="mr-0.5 hidden font-mono text-[10px] text-dim sm:inline">
            {(index % total) + 1}/{total}
          </span>
          <TickerButton
            label="Previous trending topic"
            onClick={() => {
              setUserPaused(true);
              step(-1);
            }}
          >
            ‹
          </TickerButton>
          <TickerButton
            label="Next trending topic"
            onClick={() => {
              setUserPaused(true);
              step(1);
            }}
          >
            ›
          </TickerButton>
          <TickerButton
            label={userPaused ? "Resume auto-cycling" : "Pause auto-cycling"}
            pressed={userPaused}
            onClick={() => setUserPaused((p) => !p)}
          >
            {userPaused ? "▶" : "❙❙"}
          </TickerButton>
        </div>
      </div>
    </section>
  );
}

function TickerButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="grid h-7 min-w-7 cursor-pointer place-items-center rounded-[7px] border border-white/12 px-1.5 text-[11px] leading-none text-muted transition-[border-color,color] duration-300 outline-none hover:border-positive/45 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e0e]"
    >
      {children}
    </button>
  );
}
