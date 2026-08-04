import { formatNumber } from "@/lib/derive";
import { opinionsFor } from "@/lib/sample-data/opinions";
import { timelineFor } from "@/lib/sample-data/timeline";

/**
 * Section 02 — puts a verified development and a participant opinion side by
 * side so the difference in card treatment is the argument (brief §5.4).
 */
export function IntegritySection() {
  const verified = timelineFor("neet")[2];
  const opinion = opinionsFor("neet")[0];
  if (!verified || !opinion) return null;

  return (
    <section
      id="facts"
      className="relative scroll-mt-24 border-t border-veil/5 bg-linear-to-b from-ink via-ink-soft to-ink px-5 py-[clamp(90px,13vh,170px)] sm:px-10 lg:px-20"
    >
      <div className="mx-auto max-w-[1180px]">
        <div
          data-reveal
          className="ohq-reveal mb-[clamp(40px,6vw,72px)] max-w-[720px]"
        >
          <div className="mb-[22px] font-mono text-[11px] tracking-[0.16em] uppercase text-positive">
            02 — Integrity
          </div>
          <h2 className="m-0 mb-5 font-serif text-[clamp(2.4rem,4.6vw,4.2rem)] leading-none font-normal tracking-[-0.025em] text-cream-bright">
            Facts stay <em className="italic">separate</em> from opinions.
          </h2>
          <p className="m-0 text-[16px] leading-[1.65] font-light text-pretty text-muted">
            Sourced developments are published by editors and marked as verified.
            Everything a participant writes is labelled as their own view. The two never
            share a card treatment.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[clamp(20px,3vw,32px)]">
          <article
            data-reveal
            className="ohq-reveal ohq-verified relative p-[clamp(22px,2.6vw,32px)] delay-[60ms]"
          >
            <header className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-[7px] rounded-[4px] bg-positive/14 px-[11px] py-[5px] font-mono text-[10.5px] tracking-[0.12em] uppercase text-positive-light">
                <span aria-hidden>✓</span>Verified update
              </span>
              <time className="font-mono text-[11.5px] text-dim">{verified.date}</time>
            </header>
            <h3 className="m-0 mb-2.5 text-[18px] font-semibold tracking-[-0.015em] text-cream-bright">
              {verified.title}
            </h3>
            <p className="m-0 mb-5 text-[14.5px] leading-[1.6] text-muted">
              {verified.desc}
            </p>
            <footer className="flex items-center gap-2.5 border-t border-positive/18 pt-4 text-[12.5px]">
              <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-dim">
                Source
              </span>
              <span className="text-positive-light">{verified.src} ↗</span>
            </footer>
          </article>

          <article
            data-reveal
            className="ohq-reveal ohq-panel relative p-[clamp(22px,2.6vw,32px)] delay-[140ms]"
          >
            <header className="mb-5 flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-[34px] w-[34px] place-items-center rounded-full bg-avatar text-[12.5px] font-semibold text-soft"
              >
                {opinion.initials}
              </span>
              <span className="flex flex-col gap-[3px]">
                <span className="text-[14px] font-semibold text-cream">
                  {opinion.name}
                </span>
                <span className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-dim">
                  Participant opinion
                </span>
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-negative/35 px-2.5 py-[5px] text-[11.5px] font-medium text-negative-light">
                <span aria-hidden>▼</span>
                {opinion.vote}
              </span>
            </header>
            <p className="m-0 mb-5 text-[14.5px] leading-[1.65] text-soft">
              {opinion.text}
            </p>
            <footer className="flex flex-wrap items-center gap-[18px] border-t border-line pt-4 text-[12.5px] text-dim">
              <span>{opinion.time}</span>
              <span>· {formatNumber(opinion.helpful)} found this helpful</span>
              <span>· {opinion.replies} replies</span>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}
