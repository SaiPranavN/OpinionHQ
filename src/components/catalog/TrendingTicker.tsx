"use client";

/**
 * The "Trending" strip that sits under the nav on both catalogs.
 *
 * One item at a time, with a three-part readout: title, then headline figure ·
 * how many took part · what changed. The whole item is a link; cycling pauses
 * on hover, on focus, when the tab is hidden, and whenever the visitor asks it
 * to.
 *
 * IT TAKES ITEMS, NOT TOPICS. It used to reach into `DecoratedTopic` for every
 * field, which is why polls could not have one — a poll has a leader and a
 * verdict where a topic has a sentiment and a weekly change, and neither is the
 * other. Each catalog now flattens its own rows into `TickerItem` and this
 * draws whatever it is given, so the two strips are the same instrument reading
 * two different things rather than two components that drifted apart.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AnimatedMetric } from "@/components/motion/AnimatedMetric";
import { formatCompact } from "@/lib/derive";
import type { TickerItem } from "@/lib/types";

const CYCLE_MS = 5200;

/** Green for opinions, violet for polls — the colour each section already owns. */
const ACCENT = {
  positive: {
    dot: "bg-positive",
    label: "text-positive-light",
    ring: "focus-visible:ring-positive/60",
    border: "hover:border-positive/45",
  },
  poll: {
    dot: "bg-poll",
    label: "text-poll-soft",
    ring: "focus-visible:ring-poll/60",
    border: "hover:border-poll/45",
  },
} as const;

export function TrendingTicker({
  items,
  accent = "positive",
}: {
  items: TickerItem[];
  accent?: keyof typeof ACCENT;
}) {
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const itemRef = useRef<HTMLAnchorElement>(null);

  const total = items.length;
  const current = items[index % total];
  const skin = ACCENT[accent];

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
      aria-label="Trending"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setHoverPaused(true)}
      onBlurCapture={() => setHoverPaused(false)}
      onKeyDown={onKeyDown}
      style={{ top: "var(--ohq-nav-h)" }}
      className="sticky z-40 border-b border-veil/8 bg-surface-sunken/95 backdrop-blur-[14px]"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-2.5 px-4 py-2.5 sm:gap-5 sm:px-8 lg:px-14">
        <span
          className={`flex shrink-0 items-center gap-2 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap uppercase ${skin.label}`}
        >
          <span className={`h-1.5 w-1.5 animate-pulse-dot rounded-full ${skin.dot}`} />
          {/* Short enough to keep at every width — the label used to shorten to
              "Hot" on a phone, which read as a different section. */}
          Trending
        </span>

        <div aria-live="polite" className="min-w-0 flex-1 overflow-hidden">
          <Link
            ref={itemRef}
            href={current.href}
            className={`flex min-w-0 flex-col gap-0.5 rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:flex-row sm:items-baseline sm:gap-3 ${skin.ring}`}
          >
            <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-cream">
              {current.title}
            </span>
            <span className="flex min-w-0 items-baseline gap-1.5 truncate text-[12px] text-dim">
              <span className="truncate font-semibold" style={{ color: current.metricColor }}>
                {current.metric}
              </span>
              {/* Three facts do not fit on one line of a 390px screen, and
                  three truncated facts are worse than one whole one. The
                  headline figure is the half that says something on its own —
                  "2 participants" without it is trivia — so the count joins it
                  from `sm` and the change or verdict from `md`. */}
              <span aria-hidden className="hidden text-veil/20 sm:inline">
                ·
              </span>
              {/* The one figure that changes between items counts to its new
                  value rather than swapping, so the eye reads the ticker as
                  one instrument re-measuring rather than as a slideshow. Keyed
                  by item so each one restarts the count. */}
              <span className="hidden shrink-0 items-baseline gap-1 whitespace-nowrap sm:flex">
                <AnimatedMetric
                  key={current.id}
                  value={current.count}
                  format={formatCompact}
                />
                {current.countLabel ? <span>{current.countLabel}</span> : null}
              </span>
              <span aria-hidden className="hidden text-veil/20 md:inline">
                ·
              </span>
              <span
                className="hidden truncate md:inline"
                style={{ color: current.noteColor }}
              >
                {current.note}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="mr-0.5 hidden font-mono text-[10px] text-dim sm:inline">
            {(index % total) + 1}/{total}
          </span>
          <TickerButton
            label="Previous trending item"
            skin={skin}
            onClick={() => {
              setUserPaused(true);
              step(-1);
            }}
          >
            ‹
          </TickerButton>
          <TickerButton
            label="Next trending item"
            skin={skin}
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
            skin={skin}
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
  skin,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  skin: (typeof ACCENT)[keyof typeof ACCENT];
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      // 28px is below the 44px touch target the rest of the app keeps, and
      // deliberately: three of these at 44px would eat a third of a phone's
      // width. The padding widens the tappable box without widening the glyph.
      // `rounded-full`, like every other control on these pages. Three 7px
      // rectangles sitting directly above a row of pills was the only square
      // corner on the catalog.
      className={`grid h-8 min-w-8 cursor-pointer place-items-center rounded-full border border-veil/12 px-1.5 text-[11px] leading-none text-muted transition-[border-color,color] duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${skin.border} ${skin.ring}`}
    >
      {children}
    </button>
  );
}
