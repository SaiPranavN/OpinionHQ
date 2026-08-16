"use client";

/**
 * The aspect questions — the sub-opinions under a headline vote.
 *
 * The feature the landing page has never shown and the one that most often
 * decides whether a subject is worth a page at all: a topic is not asked "rate
 * this out of five", it is asked four or five questions written for that
 * subject. A film gets asked about its second half. This one gets asked whether
 * the work can actually be covered on the fifth day.
 *
 * Answerable here, on the same terms as the live panel: one click, no submit
 * step, click again to withdraw. Nothing is recorded — the tally underneath is
 * part of the illustration and does not move when you answer, because a tally
 * that ticked up by one would be claiming somebody had been counted.
 */

import { useState } from "react";

import { ASPECTS } from "@/components/landing/showcase/data";

const TONE: Record<"Positive" | "Neutral" | "Negative", string> = {
  Positive: "var(--color-positive)",
  Neutral: "var(--color-neutral)",
  Negative: "var(--color-negative)",
};

export function DemoAspects() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answered = Object.keys(answers).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="m-0 max-w-[520px] text-[13px] leading-[1.55] text-dim">
          Four aspects, written for this subject rather than for its category. One click
          each, no submit button — and the headline vote stays a separate question.
        </p>
        {answered > 0 ? (
          <span className="rounded-full border border-positive/35 bg-positive/10 px-3 py-1 font-mono text-[10px] tracking-[0.1em] uppercase text-positive-light">
            {answered}/{ASPECTS.length} answered
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ASPECTS.map((aspect) => {
          const chosen = answers[aspect.id];
          const leading = [...aspect.options].sort((a, b) => b.pct - a.pct)[0];

          return (
            <div
              key={aspect.id}
              className="flex flex-col gap-2.5 rounded-[14px] border border-veil/7 bg-surface p-4"
            >
              <div className="flex flex-col gap-1">
                <h4 className="font-display m-0 text-[14px] font-semibold tracking-[-0.01em] text-cream">
                  {aspect.label}
                </h4>
                <p className="m-0 text-[12px] leading-[1.45] text-dim">{aspect.prompt}</p>
              </div>

              <div role="group" aria-label={aspect.prompt} className="grid grid-cols-3 gap-1.5">
                {aspect.options.map((option) => {
                  const active = chosen === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setAnswers((prev) => {
                          const next = { ...prev };
                          if (next[aspect.id] === option.id) delete next[aspect.id];
                          else next[aspect.id] = option.id;
                          return next;
                        })
                      }
                      className="cursor-pointer rounded-[10px] border px-2 py-2 text-[11.5px] leading-tight font-medium transition-[color,background,border-color] duration-300 outline-none hover:border-veil/30 focus-visible:ring-2 focus-visible:ring-positive/60"
                      style={{
                        borderColor: active
                          ? TONE[option.tone]
                          : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                        background: active
                          ? `color-mix(in oklab, ${TONE[option.tone]} 14%, transparent)`
                          : "transparent",
                        color: active ? "var(--color-cream-bright)" : "var(--color-muted)",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1.5">
                <div
                  role="img"
                  aria-label={aspect.options
                    .map((o) => `${o.label} ${o.pct} percent`)
                    .join(", ")}
                  className="flex h-1.5 gap-0.5"
                >
                  {aspect.options.map((option) => (
                    <span
                      key={option.id}
                      className="rounded-[2px]"
                      style={{ width: `${option.pct}%`, background: TONE[option.tone] }}
                    />
                  ))}
                </div>
                <p className="m-0 flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-dim">
                  <span>
                    <strong className="font-semibold text-soft">{leading?.pct}%</strong> said{" "}
                    <span className="text-soft">{leading?.label}</span>
                  </span>
                  {chosen ? (
                    <span className="text-positive-light">Click again to withdraw</span>
                  ) : null}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
