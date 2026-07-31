import type { DecoratedPoll } from "@/lib/types";

/**
 * The head-to-head bar. Two segments meeting in the middle, each labelled with
 * its own percentage inside the fill, so the split is readable without a legend
 * and without relying on colour alone.
 */
export function PollSplitBar({
  poll,
  height = 34,
  showNames = true,
}: {
  poll: DecoratedPoll;
  height?: number;
  showNames?: boolean;
}) {
  const [a, b] = poll.sides;

  return (
    <div className="flex flex-col gap-2">
      {showNames ? (
        <div className="flex items-baseline justify-between gap-4 text-[12.5px]">
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: a.color }}
            />
            <span className="truncate font-medium text-soft">{a.name}</span>
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-soft">{b.name}</span>
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: b.color }}
            />
          </span>
        </div>
      ) : null}

      {poll.unvoted ? (
        // An empty track, not a 50/50 fill — a fresh poll has no split, and
        // showing one would read as a dead heat.
        <div
          role="img"
          aria-label={poll.splitLabel}
          className="w-full rounded-[4px] border border-dashed border-white/12 bg-white/3"
          style={{ height }}
        />
      ) : (
        <div
          role="img"
          aria-label={poll.splitLabel}
          className="flex w-full gap-[3px] overflow-hidden"
          style={{ height }}
        >
          <span
            className="flex items-center justify-start rounded-[4px] pl-2.5 font-semibold tabular-nums transition-[width] duration-700 ease-ohq"
            style={{
              width: `${a.pct}%`,
              background: a.color,
              color: "#07240f",
              fontSize: Math.min(height * 0.42, 15),
            }}
          >
            {a.pct >= 12 ? `${a.pct}%` : null}
          </span>
          <span
            className="flex items-center justify-end rounded-[4px] pr-2.5 font-semibold tabular-nums transition-[width] duration-700 ease-ohq"
            style={{
              width: `${b.pct}%`,
              background: b.color,
              color: "#1B1233",
              fontSize: Math.min(height * 0.42, 15),
            }}
          >
            {b.pct >= 12 ? `${b.pct}%` : null}
          </span>
        </div>
      )}
    </div>
  );
}
