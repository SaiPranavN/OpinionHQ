"use client";

/**
 * The distribution for whoever is currently selected.
 *
 * This is the panel that makes a cross-filter mean something. Clicking
 * "Karnataka" in the breakdown beside it is only interesting if some number
 * visibly moves, and this is that number — the same split the page reports at
 * the top, re-read for the slice in scope.
 *
 * IT ANIMATES BETWEEN READINGS, which the headline chart never has to. A donut
 * that snaps to a new shape loses the one thing the filter exists to show: that
 * the split moved, and by how much. The eased interpolation is the finding.
 *
 * Two shapes, one component. A topic splits three ways and reads best as a
 * ring; a poll splits up to four ways between named options and reads best as a
 * bar, which is also what each dashboard already uses above. Same data, same
 * arithmetic, different instrument.
 */

import { useEffect, useRef, useState } from "react";

import type { AudienceSeries } from "@/lib/audience/cells";

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

export function ScopeReading({
  shares,
  total,
  series,
  scope,
  shape,
  noun,
}: {
  /** Whole numbers summing to 100, aligned with `series`. */
  shares: number[];
  /** People in scope, for the caption under the reading. */
  total: number;
  series: AudienceSeries[];
  /** "Everyone", or the active cross-filter. */
  scope: string;
  shape: "donut" | "bar";
  noun: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const smooth = useEased(shares);

  const empty = total === 0;
  const dominant = empty ? 0 : shares.indexOf(Math.max(...shares));
  const focus = active ?? dominant;
  const row = series[focus] ?? series[0];

  const caption = `${total.toLocaleString("en-IN")} ${total === 1 ? noun : `${noun}s`}`;

  return (
    <figure className="m-0 flex flex-col gap-4">
      {empty ? (
        <div className="flex min-h-[150px] flex-col items-center justify-center gap-1.5 text-center">
          <span className="font-display text-[22px] leading-none font-semibold text-muted">
            Nobody
          </span>
          <span className="max-w-[220px] text-[12.5px] leading-[1.5] text-dim">
            No {noun} matches every filter at once. Clear one to widen it.
          </span>
        </div>
      ) : shape === "donut" ? (
        <div
          className="relative mx-auto aspect-square w-[min(100%,204px)]"
          onMouseLeave={() => setActive(null)}
        >
          <svg
            viewBox="0 0 200 200"
            role="img"
            aria-label={`${scope}: ${series
              .map((s, i) => `${s.label} ${shares[i]} percent`)
              .join(", ")}, across ${caption}.`}
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
            {/* Drawn largest-first so a small slice is never buried under a
                big one. */}
            {[...shares.keys()]
              .sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0))
              .map((i) => {
                let run = 0;
                for (let k = 0; k < i; k += 1) run += ((smooth[k] ?? 0) / 100) * C;
                const len = ((smooth[i] ?? 0) / 100) * C;
                return (
                  <circle
                    key={series[i]?.id ?? i}
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke={series[i]?.color}
                    strokeWidth={active === i ? 22 : 17}
                    strokeDasharray={`${len} ${C - len}`}
                    strokeDashoffset={-run}
                    opacity={active !== null && active !== i ? 0.3 : 1}
                    onMouseEnter={() => setActive(i)}
                    className="cursor-default transition-[opacity,stroke-width] duration-300 ease-ohq"
                  />
                );
              })}
          </svg>

          <div className="pointer-events-none absolute inset-[21%] flex flex-col items-center justify-center gap-0.5 text-center">
            <span
              className="font-display text-[clamp(1.8rem,4vw,2.4rem)] leading-none font-bold tracking-[-0.02em] tabular-nums transition-colors duration-300"
              style={{ color: row?.color }}
            >
              {shares[focus]}%
            </span>
            <span
              className="text-[12px] font-semibold tracking-[-0.01em] transition-colors duration-300"
              style={{ color: row?.color }}
            >
              {row?.label}
            </span>
            <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-dim">
              {active === null ? "dominant view" : "of this group"}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div
            role="img"
            aria-label={`${scope}: ${series
              .map((s, i) => `${s.label} ${shares[i]} percent`)
              .join(", ")}, across ${caption}.`}
            className="flex h-[38px] w-full gap-[3px] overflow-hidden rounded-[7px]"
            onMouseLeave={() => setActive(null)}
          >
            {series.map((s, i) => (
              <span
                key={s.id}
                onMouseEnter={() => setActive(i)}
                className="flex items-center justify-center transition-[width,opacity] duration-700 ease-ohq"
                style={{
                  width: `${smooth[i] ?? 0}%`,
                  background: s.color,
                  opacity: active !== null && active !== i ? 0.4 : 1,
                }}
              >
                {(shares[i] ?? 0) >= 12 ? (
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-[rgba(6,10,8,0.82)]">
                    {shares[i]}%
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <span className="font-display text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums" style={{ color: row?.color }}>
            {shares[focus]}%{" "}
            <span className="font-sans text-[13px] font-semibold">{row?.label}</span>
          </span>
        </div>
      )}

      {/* The legend doubles as the colour key for every stacked bar in the
          breakdown beside it — which is why it renders even when the scope is
          empty and there is nothing to read out. */}
      <ul
        className="m-0 flex list-none flex-col gap-px p-0 text-[12.5px] text-muted"
        onMouseLeave={() => setActive(null)}
      >
        {series.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${s.label}: ${shares[i] ?? 0} percent`}
              className="flex w-full cursor-default items-center gap-2 rounded-[7px] px-1.5 py-1.5 text-left transition-colors duration-300 outline-none hover:bg-veil/4 focus-visible:ring-2 focus-visible:ring-positive/60"
              style={{ opacity: active !== null && active !== i ? 0.45 : 1 }}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: s.color }}
              />
              <span className="min-w-0 truncate">{s.label}</span>
              <span className="ml-auto shrink-0 font-mono tabular-nums text-cream">
                {shares[i] ?? 0}%
              </span>
            </button>
          </li>
        ))}
      </ul>

      <figcaption className="border-t border-line pt-3 text-center font-mono text-[10px] tracking-[0.08em] uppercase text-dim">
        {caption} in scope
      </figcaption>
    </figure>
  );
}
