import { formatNumber } from "@/lib/derive";
import type { DecoratedTopic } from "@/lib/types";

export function SentimentDonut({ topic }: { topic: DecoratedTopic }) {
  const rows = [
    {
      label: "Positive",
      color: "#1DB954",
      icon: "▲",
      pct: topic.pos,
      count: topic.posCount,
    },
    {
      label: "Neutral",
      color: "#A1A1A1",
      icon: "●",
      pct: topic.neu,
      count: topic.neuCount,
    },
    {
      label: "Negative",
      color: "#E5484D",
      icon: "▼",
      pct: topic.neg,
      count: topic.negCount,
    },
  ];

  return (
    <figure className="ohq-panel m-0 flex min-w-0 flex-[1_1_300px] flex-col gap-5 p-5 sm:p-7">
      <figcaption className="ohq-eyebrow">Sentiment distribution</figcaption>

      <div className="relative aspect-square w-[min(100%,240px)] self-center">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={topic.barsLabel}
          className="block h-full w-full -rotate-90"
        >
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="17"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#E5484D"
            strokeWidth="17"
            strokeDasharray={topic.negArc.dash}
            strokeDashoffset={topic.negArc.offset}
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#A1A1A1"
            strokeWidth="17"
            strokeDasharray={topic.neuArc.dash}
            strokeDashoffset={topic.neuArc.offset}
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#1DB954"
            strokeWidth="17"
            strokeDasharray={topic.posArc.dash}
            strokeDashoffset={topic.posArc.offset}
          />
        </svg>
        <div className="pointer-events-none absolute inset-[22%] flex flex-col items-center justify-center gap-0.5 text-center">
          <span
            className="font-serif text-[clamp(2rem,4vw,2.7rem)] leading-none"
            style={{ color: topic.dominantColor }}
          >
            {topic.dominantPct}%
          </span>
          <span
            className="text-[13px] font-semibold tracking-[-0.01em]"
            style={{ color: topic.dominantColor }}
          >
            {topic.dominant}
          </span>
          <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-dim">
            dominant view
          </span>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col gap-[9px] p-0 text-[13px] text-muted">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-[9px]">
            <span
              aria-hidden
              className="h-2 w-2 rounded-[2px]"
              style={{ background: row.color }}
            />
            <span aria-hidden className="text-[8px]" style={{ color: row.color }}>
              {row.icon}
            </span>
            {row.label}
            <span className="ml-auto font-mono whitespace-nowrap text-cream">
              {row.pct}% · {formatNumber(row.count)}
            </span>
          </li>
        ))}
      </ul>

      <p className="m-0 border-t border-line pt-4 text-[13px] leading-[1.5] text-soft">
        {topic.sampleLabel}. Self-selected sample — not a representative poll of the
        public.
      </p>
    </figure>
  );
}
