import { SENTIMENT_COLOR } from "@/lib/taxonomy";

interface SentimentBarProps {
  pos: number;
  neu: number;
  neg: number;
  /** Full sentence used as the accessible description of the bar. */
  label: string;
  height?: number;
}

/**
 * Three-segment distribution bar. Always paired with `SentimentLegend` so the
 * split is readable without relying on colour.
 */
export function SentimentBar({
  pos,
  neu,
  neg,
  label,
  height = 6,
}: SentimentBarProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex w-full gap-0.5 overflow-hidden"
      style={{ height }}
    >
      <span
        className="rounded-[2px]"
        style={{ width: `${pos}%`, background: SENTIMENT_COLOR.Positive }}
      />
      <span
        className="rounded-[2px]"
        style={{ width: `${neu}%`, background: SENTIMENT_COLOR.Neutral }}
      />
      <span
        className="rounded-[2px]"
        style={{ width: `${neg}%`, background: SENTIMENT_COLOR.Negative }}
      />
    </div>
  );
}
