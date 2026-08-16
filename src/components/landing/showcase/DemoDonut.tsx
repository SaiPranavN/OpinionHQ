"use client";

/**
 * The sentiment donut, in miniature.
 *
 * Deliberately the same instrument as components/topic/SentimentDonut.tsx and
 * deliberately not that component: the real one takes a `DecoratedTopic` off
 * the database and is the last place a synthetic reading should be able to
 * reach. This one takes three numbers and knows nothing else.
 *
 * What it keeps is the behaviour worth demonstrating — the ring and the legend
 * highlight each other, the centre reads out whatever is being pointed at, and
 * every legend row is a real button so a keyboard gets the same detail.
 *
 * The ring also *animates between readings*, which the live one never has to:
 * cross-filtering re-reads the whole chart, and a donut that snaps to a new
 * shape loses the one thing the filter is trying to show — that the split moved
 * and by how much.
 */

import { useEffect, useRef, useState } from "react";

import { SENTIMENT_ROWS } from "@/components/landing/showcase/data";

const R = 80;
const C = 2 * Math.PI * R;

/** Eased interpolation towards a new reading, so a filter change is legible. */
function useEased(target: readonly number[], ms = 620): number[] {
  const [shown, setShown] = useState<number[]>(() => [...target]);
  const from = useRef<number[]>([...target]);
  const frame = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      from.current = [...target];
      setShown([...target]);
      return;
    }

    const start = performance.now();
    const origin = [...from.current];
    const tick = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      const eased = 1 - (1 - t) ** 3;
      const next = target.map((v, i) => (origin[i] ?? 0) + (v - (origin[i] ?? 0)) * eased);
      from.current = next;
      setShown(next);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // `target` is a fresh array every render; its contents are the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.join(","), ms]);

  return shown;
}

export function DemoDonut({
  sentiment,
  scope,
}: {
  /** Positive, neutral, negative — whole numbers summing to 100. */
  sentiment: [number, number, number];
  /** What the reading is of: "Everyone", or the active cross-filter. */
  scope: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const smooth = useEased(sentiment);

  // Drawn largest-first so a small slice is never buried under a big one.
  const order = [...sentiment.keys()].sort((a, b) => (sentiment[b] ?? 0) - (sentiment[a] ?? 0));

  let run = 0;
  const arcs = smooth.map((pct) => {
    const len = (pct / 100) * C;
    const arc = { dash: `${len} ${C - len}`, offset: -run };
    run += len;
    return arc;
  });

  const dominant = sentiment.indexOf(Math.max(...sentiment));
  const focus = active ?? dominant;
  const row = SENTIMENT_ROWS[focus] ?? SENTIMENT_ROWS[0];

  return (
    <figure className="m-0 flex flex-col gap-4">
      <div
        className="relative mx-auto aspect-square w-[min(100%,208px)]"
        onMouseLeave={() => setActive(null)}
      >
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`${scope}: ${sentiment[0]} percent in favour, ${sentiment[1]} percent no strong view, ${sentiment[2]} percent against.`}
          className="block h-full w-full -rotate-90"
        >
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="color-mix(in oklab, var(--color-veil) 5%, transparent)"
            strokeWidth="17"
          />
          {order.map((i) => {
            const arc = arcs[i];
            const dim = active !== null && active !== i;
            if (!arc) return null;
            return (
              <circle
                key={i}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={SENTIMENT_ROWS[i]?.color}
                strokeWidth={active === i ? 22 : 17}
                strokeDasharray={arc.dash}
                strokeDashoffset={arc.offset}
                opacity={dim ? 0.3 : 1}
                onMouseEnter={() => setActive(i)}
                className="cursor-default transition-[opacity,stroke-width] duration-300 ease-ohq"
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-[21%] flex flex-col items-center justify-center gap-0.5 text-center">
          <span
            className="font-display text-[clamp(1.9rem,4vw,2.6rem)] leading-none font-bold tracking-[-0.02em] tabular-nums transition-colors duration-300"
            style={{ color: row?.color }}
          >
            {sentiment[focus]}%
          </span>
          <span
            className="text-[12.5px] font-semibold tracking-[-0.01em] transition-colors duration-300"
            style={{ color: row?.color }}
          >
            {row?.label}
          </span>
          <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-dim">
            {active === null ? "dominant view" : "of this group"}
          </span>
        </div>
      </div>

      <ul
        className="m-0 flex list-none flex-col gap-px p-0 text-[12.5px] text-muted"
        onMouseLeave={() => setActive(null)}
      >
        {SENTIMENT_ROWS.map((r, i) => (
          <li key={r.key}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${r.label}: ${sentiment[i]} percent`}
              className="flex w-full cursor-default items-center gap-2 rounded-[7px] px-1.5 py-1.5 text-left transition-colors duration-300 outline-none hover:bg-veil/4 focus-visible:ring-2 focus-visible:ring-positive/60"
              style={{ opacity: active !== null && active !== i ? 0.45 : 1 }}
            >
              <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: r.color }} />
              {r.label}
              <span className="ml-auto font-mono tabular-nums text-cream">{sentiment[i]}%</span>
            </button>
          </li>
        ))}
      </ul>
    </figure>
  );
}
