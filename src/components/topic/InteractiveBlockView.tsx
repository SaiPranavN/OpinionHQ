"use client";

/**
 * The interaction embedded in one Pro contribution.
 *
 * THE LINE THIS COMPONENT EXISTS TO HOLD: what happens here belongs to this
 * contribution and to nothing else. It never calls `submitVote`, never writes
 * to `votes`, and never reaches the topic's sentiment split, its participation
 * count, or any poll in the Polls section. The card says so on screen too —
 * not as a disclaimer, but because a reader who has just answered something
 * that looks exactly like the topic vote deserves to know which number they
 * moved.
 *
 * Six kinds, one shape. Every block is "a prompt and some options with counts
 * on them", which is why `rank` here asks which factor comes *first* rather
 * than offering a drag-to-order list: one tap inside a feed card, and the
 * result is still a ranking signal. A block nobody answers measures nothing.
 */

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { BLOCK_KIND_LABEL, blockResults, blockTotal } from "@/lib/contributions";
import { formatNumber } from "@/lib/derive";
import type { InteractiveBlock } from "@/lib/types";

export function InteractiveBlockView({
  block,
  contributionId,
  accent,
  compact,
}: {
  block: InteractiveBlock;
  contributionId: string;
  accent: string;
  /** The Opinions-tab rendering: same block, less air around it. */
  compact?: boolean;
}) {
  const { chooseBlock, blockChoice, signedIn, openAuth } = usePrototype();
  const mine = blockChoice(contributionId, block.id);
  const results = blockResults(block, mine);
  const total = blockTotal(block, mine);
  const answered = Boolean(mine);

  const press = (optionId: string) => {
    if (!signedIn) {
      openAuth("signin");
      return;
    }
    chooseBlock(contributionId, block.id, optionId);
  };

  return (
    <section
      aria-label={`${BLOCK_KIND_LABEL[block.kind]} on this contribution`}
      className={`flex flex-col gap-3 rounded-[14px] border ${compact ? "p-3.5" : "p-4 sm:p-[18px]"}`}
      style={{
        borderColor: `color-mix(in oklab, ${accent} 28%, transparent)`,
        background: `color-mix(in oklab, ${accent} 6%, transparent)`,
      }}
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
          style={{ color: accent }}
        >
          {BLOCK_KIND_LABEL[block.kind]}
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-dim">
          {total === 0 ? "No responses yet" : `${formatNumber(total)} responses`}
        </span>
      </header>

      <p className="m-0 text-[14px] leading-[1.5] font-medium text-pretty text-cream">
        {block.prompt}
      </p>

      {/* The rating scale reads left to right as a row of steps; every other
          kind is a stack of labelled choices. Same data, same handler — only
          the arrangement differs, because a 1–5 scale laid out vertically
          stops looking like a scale. */}
      <div className={block.kind === "rating" ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
        {results.map((option) => {
          const chosen = option.mine;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => press(option.id)}
              aria-pressed={chosen}
              className={`relative cursor-pointer overflow-hidden rounded-[10px] border text-left transition-[border-color,background] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/50 ${
                block.kind === "rating"
                  ? "min-w-[54px] flex-1 px-3 py-2.5 text-center"
                  : "px-3.5 py-2.5"
              }`}
              style={{
                borderColor: chosen
                  ? `color-mix(in oklab, ${accent} 62%, transparent)`
                  : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                background: chosen
                  ? `color-mix(in oklab, ${accent} 12%, transparent)`
                  : "transparent",
              }}
            >
              {/* The result bar. Painted behind the label rather than beside
                  it so answering changes the same row you pressed, instead of
                  replacing the choices with a chart and losing your place. */}
              {answered ? (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-ohq"
                  style={{
                    width: `${option.pct}%`,
                    background: `color-mix(in oklab, ${accent} 14%, transparent)`,
                  }}
                />
              ) : null}
              <span className="relative flex items-baseline gap-2">
                <span
                  className="text-[13.5px] leading-[1.4]"
                  style={{ color: chosen ? accent : "var(--color-soft)" }}
                >
                  {option.label}
                </span>
                {answered ? (
                  <span
                    className="ml-auto font-mono text-[11.5px] tabular-nums"
                    style={{ color: chosen ? accent : "var(--color-dim)" }}
                  >
                    {option.pct}%
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <p className="m-0 text-[11px] leading-[1.5] text-dim">
        {answered
          ? "Counted on this contribution only — it does not move the topic's sentiment or any poll."
          : signedIn
            ? "Answers stay on this contribution. Nothing here changes the topic's numbers."
            : "Sign in to answer. Your response stays on this contribution."}
      </p>
    </section>
  );
}
