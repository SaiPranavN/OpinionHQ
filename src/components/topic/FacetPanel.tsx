"use client";

/**
 * Category-specific opinion dimensions.
 *
 * One click per question, no submit step. Answering is possible while signed
 * out and is kept locally; the aggregate bar underneath always shows what
 * everyone else said, so a question is worth reading even without answering.
 */

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { formatCompact, formatNumber, sentimentColor } from "@/lib/derive";
import type { DecoratedTopic, FacetTally } from "@/lib/types";

export function FacetPanel({ topic }: { topic: DecoratedTopic }) {
  const { facetAnswers, answerFacet, ready } = usePrototype();

  if (topic.facets.length === 0) return null;

  const answered = topic.facets.filter(
    (f) => facetAnswers[`${topic.id}:${f.facet.id}`],
  ).length;

  return (
    <section
      aria-label={`Aspects of ${topic.name}`}
      className="ohq-panel-raised p-5 sm:p-8"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 mb-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.05] font-bold tracking-[-0.02em] text-cream-bright">
            The parts people actually <em>argue about</em>
          </h2>
          <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.55] text-dim">
            {topic.facets.length} aspects, written for this topic rather than for
            its category — the sub-opinions under your headline vote. One click
            each, no submit button.
          </p>
        </div>
        {ready && answered > 0 ? (
          <span className="rounded-full border border-positive/35 bg-positive/10 px-3 py-1 font-mono text-[10.5px] tracking-[0.1em] uppercase text-positive-light">
            {answered}/{topic.facets.length} answered
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {topic.facets.map((result) => {
          const key = `${topic.id}:${result.facet.id}`;
          const chosen = facetAnswers[key];

          return (
            <div
              key={result.facet.id}
              className="flex flex-col gap-3 rounded-[14px] border border-veil/7 bg-surface p-4"
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-display m-0 text-[14.5px] font-semibold tracking-[-0.01em] text-cream">
                  {result.facet.label}
                </h3>
                <p className="m-0 text-[12.5px] leading-[1.45] text-dim">
                  {result.facet.prompt}
                </p>
              </div>

              <div
                role="group"
                aria-label={result.facet.prompt}
                className="grid grid-cols-3 gap-1.5"
              >
                {result.facet.options.map((option) => {
                  const active = chosen === option.id;
                  const tone = sentimentColor(option.tone);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => answerFacet(topic.id, result.facet.id, option.id)}
                      aria-pressed={active}
                      className="cursor-pointer rounded-[10px] border px-2 py-2 text-[12px] leading-tight font-medium transition-[color,background,border-color] duration-300 outline-none hover:border-veil/30 focus-visible:ring-2 focus-visible:ring-positive/60"
                      style={{
                        borderColor: active ? tone : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                        background: active ? `${tone}1F` : "transparent",
                        color: active ? "#F7F5F1" : "#A1A1A1",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {result.responses > 0 ? (
                <>
                  <FacetTallyBar tallies={result.tallies} />
                  <p className="m-0 flex flex-wrap items-baseline justify-between gap-2 text-[11.5px] text-dim">
                    <span>
                      <strong className="font-semibold text-soft">
                        {result.leading.pct}%
                      </strong>{" "}
                      said <span className="text-soft">{result.leading.label}</span>
                    </span>
                    <span className="font-mono text-[10.5px]">
                      {formatCompact(result.responses)} answered
                    </span>
                  </p>
                </>
              ) : (
                <p className="m-0 text-[11.5px] text-dim">
                  No answers yet — yours would be the first.
                </p>
              )}

              {chosen ? (
                <p className="m-0 text-[11.5px] text-positive-light">
                  Your answer is counted. Click it again to withdraw it.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="m-0 mt-5 border-t border-line pt-4 text-[12px] leading-[1.55] text-dim">
        {topic.unrated
          ? "Nobody has answered these yet. Shares will describe the people who answer each aspect — not the public."
          : `Each aspect is answered by a different number of people, so shares are of that aspect’s respondents — not of all ${formatNumber(topic.participants)} ${topic.participants === 1 ? "participant" : "participants"}, and not of the public.`}
      </p>
    </section>
  );
}

function FacetTallyBar({ tallies }: { tallies: FacetTally[] }) {
  const label = tallies.map((t) => `${t.label} ${t.pct} percent`).join(", ");
  return (
    <div className="flex flex-col gap-1.5">
      <div role="img" aria-label={label} className="flex h-1.5 gap-0.5">
        {tallies.map((tally) => (
          <span
            key={tally.id}
            className="rounded-[2px]"
            style={{ width: `${tally.pct}%`, background: sentimentColor(tally.tone) }}
          />
        ))}
      </div>
      <span className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10.5px] text-dim">
        {tallies.map((tally) => (
          <span key={tally.id} className="flex items-center gap-1 whitespace-nowrap">
            <span
              aria-hidden
              className="h-[6px] w-[6px] rounded-[1px]"
              style={{ background: sentimentColor(tally.tone) }}
            />
            {tally.label} <span className="font-mono text-soft">{tally.pct}%</span>
          </span>
        ))}
      </span>
    </div>
  );
}
