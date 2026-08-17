"use client";

import { PollExportButton } from "@/components/polls/PollExportButton";
import { PollSplitBar } from "@/components/polls/PollSplitBar";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { FollowButton } from "@/components/ui/FollowButton";
import { GoToDiscussion } from "@/components/ui/GoToDiscussion";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber } from "@/lib/derive-poll";
import type { DecoratedPoll, PollReason } from "@/lib/types";

export function PollHeader({
  poll,
  reasons = [],
}: {
  poll: DecoratedPoll;
  reasons?: PollReason[];
}) {
  const { pollVotes, toast } = usePrototype();
  const mine = pollVotes[poll.id];
  const myside = mine ? poll.options.find((o) => o.id === mine.side) : undefined;

  const share = async () => {
    const line = `${poll.question} — ${poll.options.map((o) => `${o.name} ${o.pct}%`).join(", ")}, of ${formatNumber(poll.total)} votes.`;
    try {
      await navigator.clipboard.writeText(`${line} ${window.location.href}`);
      toast(`${line} Link copied.`);
    } catch {
      toast(line);
    }
  };

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Polls", href: "/polls" },
            { label: poll.category.short },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase text-dim">
          <CategoryIcon category={poll.cat} size={14} />
          {poll.category.label}
        </span>
        {/* On a detail page there is room for the full chain, so a reader who
            does not know where this is gets told. */}
        {poll.place === "worldwide" ? null : (
          <span
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-dim"
            title={poll.placeContext.replace(", Worldwide", "")}
          >
            {poll.placeLabel}
          </span>
        )}
        <StatusBadge status={poll.status} />
        <span className="font-mono text-[11px] text-dim">{poll.closes}</span>
      </div>

      <h1 className="m-0 max-w-[22ch] font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.03] font-bold tracking-[-0.025em] text-balance text-cream-bright">
        {poll.question}
      </h1>

      <div className="flex max-w-[720px] flex-col gap-2">
        <p className="m-0 text-[15.5px] leading-[1.55] font-light text-pretty text-soft">
          {poll.summary}
        </p>
        <p className="m-0 text-[13.5px] leading-[1.65] font-light text-pretty text-muted">
          {poll.about}
        </p>
      </div>

      {/* The result, given the space it deserves. */}
      <div className="ohq-panel-raised mt-2 flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          {poll.unvoted ? (
            <span className="flex flex-col gap-1">
              <span className="text-[clamp(1.6rem,3vw,2.2rem)] leading-[1] font-semibold tracking-[-0.03em] text-[#D6D3CD]">
                No votes yet
              </span>
              <span className="text-[13px] text-muted">
                Yours would be the first. {poll.closes}
              </span>
            </span>
          ) : (
            <>
              <span className="flex flex-col gap-1">
                <span
                  className="text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1] font-semibold tracking-[-0.03em]"
                  style={{ color: poll.leader.textColor }}
                >
                  {poll.leader.pct}% {poll.leader.name}
                </span>
                <span className="text-[13px] text-muted">
                  {poll.verdict} · {poll.marginLabel}
                </span>
              </span>
              <span className="flex flex-col gap-0.5">
                <strong className="text-[clamp(1.6rem,3vw,2.2rem)] leading-[1] font-semibold tracking-[-0.03em] text-positive">
                  {formatNumber(poll.total)}
                </strong>
                <span className="text-[12.5px] text-muted">
                  {poll.total === 1 ? "vote" : "votes"} cast
                </span>
              </span>
            </>
          )}
        </div>

        <PollSplitBar poll={poll} height={38} />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4">
          {poll.options.map((option) => (
            <span key={option.id} className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: option.color }}
              />
              <span className="text-[13px] text-soft">
                {option.name}{" "}
                <strong className="font-semibold text-cream-bright">
                  {formatNumber(option.votes)}
                </strong>
              </span>
            </span>
          ))}
          {myside ? (
            <span
              className="ml-auto rounded-full border px-3 py-1 text-[12px] font-medium"
              style={{ color: myside.color, borderColor: `${myside.color}66` }}
            >
              You voted {myside.name}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {poll.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-veil/8 px-2.5 py-[3px] text-[11px] text-dim"
            >
              {tag}
            </li>
          ))}
        </ul>
        {/* Two even columns on a phone, an inline row from `sm` — the same
            treatment as the topic header, for the same reason. */}
        <span className="mt-1 grid w-full grid-cols-2 gap-2.5 [&>*]:w-full [&>*]:justify-center sm:mt-0 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap sm:[&>*]:w-auto">
          {/* A split bar says who won and nothing about why. The reasons are
              the interesting half, and they sit below three panels of
              cross-tabs — far enough down to be missed. */}
          <GoToDiscussion />
          {/* Polls had no follow at all until `poll_follows` landed. */}
          <FollowButton kind="poll" id={poll.uuid ?? ""} />
          <PollExportButton poll={poll} reasons={reasons} />
          <button
            type="button"
            onClick={share}
            className="cursor-pointer rounded-full border border-veil/16 px-[18px] py-[9px] text-[13px] font-medium text-soft transition-[color,border-color] duration-300 outline-none hover:border-veil/40 hover:text-cream-bright focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Share result
          </button>
        </span>
      </div>
    </header>
  );
}
