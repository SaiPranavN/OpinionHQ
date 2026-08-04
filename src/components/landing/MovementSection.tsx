import { Brand } from "@/components/ui/Brand";
import { formatNumber } from "@/lib/derive";
import { getTopic } from "@/lib/topics";

const AXIS_LABELS = ["4 May", "11 May", "18 May", "25 May", "2 Jun"];

/**
 * Section 03 — the same trend geometry the topic dashboard uses, annotated
 * with the verified developments that bracket the movement.
 */
export function MovementSection() {
  const topic = getTopic("neet");
  if (!topic) return null;

  const negStart = Math.max(topic.neg - 34, 6);
  const areaPath = `${topic.negPath} L800 240 L0 240 Z`;

  return (
    <section
      id="movement"
      className="relative border-t border-veil/5 px-5 py-[clamp(90px,13vh,170px)] sm:px-10 lg:px-20"
    >
      <div className="mx-auto max-w-[1180px]">
        <div
          data-reveal
          className="ohq-reveal mb-[clamp(38px,5vw,64px)] max-w-[700px]"
        >
          <div className="mb-[22px] font-mono text-[11px] tracking-[0.16em] uppercase text-positive">
            03 — History
          </div>
          <h2 className="m-0 mb-5 font-serif text-[clamp(2.4rem,4.6vw,4.2rem)] leading-none font-normal tracking-[-0.025em] text-cream-bright">
            Watch sentiment <em className="italic">move.</em>
          </h2>
          <p className="m-0 text-[16px] leading-[1.65] font-light text-pretty text-muted">
            Verified developments are plotted onto the trend, so a shift in opinion can
            be read against the event that caused it.
          </p>
        </div>

        <figure
          data-reveal
          className="ohq-reveal m-0 rounded-[22px] border border-line bg-linear-to-b from-surface-raised to-[#101010] p-5 delay-100 sm:p-[34px]"
        >
          <figcaption className="mb-7 flex flex-wrap items-baseline justify-between gap-4">
            <span className="flex flex-col gap-1.5">
              <span className="text-[15.5px] font-semibold tracking-[-0.01em] text-cream">
                {topic.name}
              </span>
              <span className="text-[12.5px] text-dim">
                Sentiment share since the allegations surfaced ·{" "}
                {formatNumber(topic.participants)} <Brand /> participants
              </span>
            </span>
            <span className="flex gap-[18px] text-[12.5px] text-muted">
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-3.5 bg-negative" />
                Negative
              </span>
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-3.5 bg-positive" />
                Positive
              </span>
            </span>
          </figcaption>

          <div className="relative w-full">
            <svg
              viewBox="0 0 800 260"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Line chart of sentiment share. Negative opinion rises from ${negStart} percent to ${topic.neg} percent while positive falls to ${topic.pos} percent, with the sharpest movement after the investigation committee was formed on 11 May 2026.`}
              className="block h-[clamp(220px,30vw,340px)] w-full"
            >
              <defs>
                <linearGradient id="ohqNegFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E5484D" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#E5484D" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g stroke="color-mix(in oklab, var(--color-veil) 6%, transparent)" strokeWidth="1">
                <line x1="0" y1="40" x2="800" y2="40" />
                <line x1="0" y1="90" x2="800" y2="90" />
                <line x1="0" y1="140" x2="800" y2="140" />
                <line x1="0" y1="190" x2="800" y2="190" />
                <line x1="0" y1="240" x2="800" y2="240" />
              </g>
              <line
                x1="144"
                y1="20"
                x2="144"
                y2="240"
                stroke="color-mix(in oklab, var(--color-veil) 22%, transparent)"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
              <line
                x1="368"
                y1="20"
                x2="368"
                y2="240"
                stroke="color-mix(in oklab, var(--color-veil) 22%, transparent)"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
              <path d={areaPath} fill="url(#ohqNegFill)" />
              <path
                data-line
                d={topic.negPath}
                fill="none"
                stroke="#E5484D"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                data-line
                d={topic.posPath}
                fill="none"
                stroke="#1DB954"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>

            <span className="absolute top-0 left-[27.5%] inline-flex max-w-[min(46%,220px)] items-center gap-[7px] overflow-hidden rounded-[4px] border border-positive/30 bg-ink/94 px-2.5 py-[5px] font-mono text-[clamp(8.5px,1.1vw,10px)] tracking-[0.06em] text-ellipsis whitespace-nowrap uppercase text-positive-light">
              <span aria-hidden>✓</span>6 May · NTA acknowledges
            </span>
            <span className="absolute top-11 right-0 inline-flex max-w-[min(44%,220px)] items-center gap-[7px] overflow-hidden rounded-[4px] border border-positive/30 bg-ink/94 px-2.5 py-[5px] font-mono text-[clamp(8.5px,1.1vw,10px)] tracking-[0.06em] text-ellipsis whitespace-nowrap uppercase text-positive-light">
              <span aria-hidden>✓</span>11 May · Committee formed
            </span>
          </div>

          <div className="mt-3.5 flex justify-between font-mono text-[10.5px] tracking-[0.08em] text-dim">
            {AXIS_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <p className="m-0 mt-6 border-t border-line pt-[18px] text-[13.5px] leading-[1.55] text-soft">
            Negative sentiment moved from{" "}
            <strong className="font-semibold">
              {negStart}% to {topic.neg}%
            </strong>{" "}
            across the period — measured among {formatNumber(topic.participants)}{" "}
            <Brand /> participants who voted on this topic.
          </p>
        </figure>
      </div>
    </section>
  );
}
