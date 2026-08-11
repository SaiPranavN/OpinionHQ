import { statusStyle } from "@/lib/taxonomy";
import type { StatusId } from "@/lib/types";

/**
 * Status chip with semantic colour. Colour is never the only signal: the label
 * always renders, and the full meaning is exposed as a title/aria description.
 */
export function StatusBadge({
  status,
  size = "md",
}: {
  status: StatusId;
  size?: "sm" | "md";
}) {
  const style = statusStyle(status);
  const compact = size === "sm";

  return (
    <span
      title={style.meaning}
      className={`inline-flex items-center gap-[6px] rounded-full border font-medium whitespace-nowrap ${
        compact ? "px-2 py-[3px] text-[10.5px]" : "px-2.5 py-[4px] text-[11.5px]"
      }`}
      style={{ color: style.fg, background: style.bg, borderColor: style.border }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: style.fg }}
      />
      {status}
      <span className="sr-only"> — {style.meaning}</span>
    </span>
  );
}
