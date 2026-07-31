import Link from "next/link";

import { PollSplitBar } from "@/components/polls/PollSplitBar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { formatNumber } from "@/lib/derive-poll";
import type { DecoratedPoll } from "@/lib/types";

/** Whole card is one link, same interaction contract as the topic cards. */
export function PollCard({ poll }: { poll: DecoratedPoll }) {
  return (
    <Link
      href={`/polls/${poll.id}`}
      aria-label={`${poll.question} — ${poll.splitLabel}. Open poll.`}
      className="group ohq-panel relative flex cursor-pointer flex-col gap-3.5 p-5 transition-[border-color,box-shadow,transform] duration-300 ease-ohq outline-none hover:-translate-y-0.5 hover:border-white/18 hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9),0_0_0_1px_rgba(167,139,250,0.16)] focus-visible:-translate-y-0.5 focus-visible:border-[#A78BFA]/60 focus-visible:ring-2 focus-visible:ring-[#A78BFA]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-white/8 bg-white/4 text-muted transition-colors duration-300 group-hover:border-[#A78BFA]/40 group-hover:text-[#C4B5FD]"
          >
            <CategoryIcon category={poll.cat} size={15} />
          </span>
          <span className="truncate font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
            {poll.category.short}
          </span>
        </span>
        <span
          className="shrink-0 rounded-full border px-2.5 py-[3px] text-[10.5px] font-medium whitespace-nowrap"
          style={{
            color:
              poll.unvoted || poll.smallSample
                ? "#8F8C86"
                : poll.margin < 10
                  ? "#F0A83C"
                  : "#C4B5FD",
            borderColor:
              poll.unvoted || poll.smallSample
                ? "rgba(143,140,134,0.3)"
                : poll.margin < 10
                  ? "rgba(240,168,60,0.36)"
                  : "rgba(167,139,250,0.36)",
            background:
              poll.unvoted || poll.smallSample
                ? "transparent"
                : poll.margin < 10
                  ? "rgba(240,168,60,0.1)"
                  : "rgba(167,139,250,0.1)",
          }}
        >
          {poll.verdict}
        </span>
      </div>

      <h3 className="m-0 text-[16.5px] leading-[1.28] font-semibold tracking-[-0.015em] text-pretty text-cream-bright">
        {poll.question}
      </h3>

      <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] font-light text-muted">
        {poll.summary}
      </p>

      <div className="mt-auto flex flex-col gap-2.5 pt-1">
        <PollSplitBar poll={poll} height={28} />

        <div className="flex flex-col gap-1.5 border-t border-white/6 pt-3">
          {poll.unvoted ? (
            <span className="text-[13px] font-semibold text-cream-bright">
              Be the first to vote
            </span>
          ) : (
            <span className="text-[13px] text-soft">
              <strong className="font-semibold text-cream-bright">
                {formatNumber(poll.total)}
              </strong>{" "}
              {poll.total === 1 ? "vote" : "votes"}
            </span>
          )}
          <span className="text-[11.5px] leading-snug text-dim">
            {poll.unvoted
              ? poll.closes
              : `${poll.marginLabel} · ${poll.closes}`}
          </span>
        </div>

        <span
          aria-hidden
          className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] uppercase text-dim transition-colors duration-300 group-hover:text-[#C4B5FD] group-focus-visible:text-[#C4B5FD]"
        >
          Cast your vote
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
