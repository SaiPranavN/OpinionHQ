import { SENTIMENT_COLOR } from "@/lib/taxonomy";

/**
 * Explicit "Positive 8% · Neutral 14% · Negative 78%" readout. Pairs with
 * `SentimentBar` so nobody has to infer what a colour segment means.
 */
export function SentimentLegend({
  pos,
  neu,
  neg,
  size = "md",
}: {
  pos: number;
  neu: number;
  neg: number;
  size?: "sm" | "md";
}) {
  const rows = [
    { label: "Positive", pct: pos, color: SENTIMENT_COLOR.Positive },
    { label: "Neutral", pct: neu, color: SENTIMENT_COLOR.Neutral },
    { label: "Negative", pct: neg, color: SENTIMENT_COLOR.Negative },
  ];

  return (
    <span
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${
        size === "sm" ? "text-[11px]" : "text-[12px]"
      } text-dim`}
    >
      {rows.map((row, i) => (
        <span key={row.label} className="flex items-center gap-1.5 whitespace-nowrap">
          {i > 0 ? (
            <span aria-hidden className="mr-0.5 text-white/18">
              ·
            </span>
          ) : null}
          <span
            aria-hidden
            className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
            style={{ background: row.color }}
          />
          {row.label}{" "}
          <strong className="font-mono text-[0.95em] font-medium text-soft">
            {row.pct}%
          </strong>
        </span>
      ))}
    </span>
  );
}
