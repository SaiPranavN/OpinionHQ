import { Brand } from "@/components/ui/Brand";
import { formatNumber } from "@/lib/derive";
import { getTopic } from "@/lib/topics";

/**
 * Section 01 — explains the single-measurement model, using a real topic from
 * the catalog rather than a mock so the number on the landing page always
 * matches the dashboard it links to.
 */
export function StructureSection() {
  const topic = getTopic("iima");
  if (!topic) return null;

  return (
    <section
      id="structured"
      className="relative border-t border-veil/5 px-5 py-[clamp(90px,13vh,170px)] sm:px-10 lg:px-20"
    >
      <div className="mx-auto grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-center gap-[clamp(40px,6vw,90px)]">
        <div data-reveal className="ohq-reveal">
          <div className="mb-[22px] font-mono text-[11px] tracking-[0.16em] uppercase text-positive">
            01 — Structure
          </div>
          <h2 className="m-0 mb-5 font-display text-[clamp(2.4rem,4.6vw,4.2rem)] leading-none font-bold tracking-[-0.025em] text-cream-bright">
            Opinion, <em className="italic">structured.</em>
          </h2>
          <p className="m-0 max-w-[440px] text-[16px] leading-[1.65] font-light text-pretty text-muted">
            Every topic carries one continuous measurement instead of a thousand
            scattered comments. Votes, written opinions and replies roll up into a
            distribution you can read in a second — and the sample size is always in
            view.
          </p>
        </div>

        <div data-reveal className="ohq-reveal delay-100">
          <figure className="ohq-panel-raised m-0 p-6 shadow-[0_40px_80px_-50px_rgba(0,0,0,0.9)] sm:p-[38px]">
            <figcaption className="mb-[26px] flex items-baseline justify-between gap-4">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-cream">
                {topic.name}
              </span>
              <span className="ohq-eyebrow tracking-[0.1em]">
                {topic.category.short}
              </span>
            </figcaption>

            <div className="mb-[18px] flex items-end gap-3">
              <span
                className="font-display font-bold text-[clamp(3rem,5.4vw,4.4rem)] tracking-[-0.02em] leading-[0.85]"
                style={{ color: topic.dominantVar }}
              >
                {topic.neg}
                <span className="text-[0.42em] tracking-[-0.01em]">%</span>
              </span>
              <span className="pb-2 text-[13.5px] font-medium text-soft">oppose</span>
            </div>

            <div
              role="img"
              aria-label={topic.barsLabel}
              className="mb-4 flex h-3 gap-[3px]"
            >
              <span
                data-bar={topic.pos}
                className="w-0 rounded-[3px] bg-positive transition-[width] delay-200 duration-[1300ms] ease-ohq"
              />
              <span
                data-bar={topic.neu}
                className="w-0 rounded-[3px] bg-neutral transition-[width] delay-300 duration-[1300ms] ease-ohq"
              />
              <span
                data-bar={topic.neg}
                className="w-0 rounded-[3px] bg-negative transition-[width] delay-[400ms] duration-[1300ms] ease-ohq"
              />
            </div>

            <ul className="m-0 mb-6 flex list-none flex-wrap gap-x-[22px] gap-y-2 p-0 text-[12.5px] text-muted">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-[2px] bg-positive" />
                Positive
                <span className="font-mono text-cream">
                  {topic.pos}% · {formatNumber(topic.posCount)}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-[2px] bg-neutral" />
                Neutral
                <span className="font-mono text-cream">
                  {topic.neu}% · {formatNumber(topic.neuCount)}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-[2px] bg-negative" />
                Negative
                <span className="font-mono text-cream">
                  {topic.neg}% · {formatNumber(topic.negCount)}
                </span>
              </li>
            </ul>

            <p className="m-0 border-t border-line pt-[18px] text-[13.5px] leading-[1.5] text-soft">
              <strong className="font-semibold">
                {topic.neg}% of {formatNumber(topic.participants)} <Brand />
                participants
              </strong>{" "}
              oppose this.{" "}
              <span className="text-dim">
                Sample is self-selected — never read as the general public.
              </span>
            </p>
          </figure>
        </div>
      </div>
    </section>
  );
}
