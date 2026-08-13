"use client";

import { useSession } from "@/components/auth/SessionProvider";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { MediaStrip } from "@/components/ui/MediaStrip";
import { formatNumber } from "@/lib/derive-poll";
import type { DecoratedPoll, PollOptionId, PollReason } from "@/lib/types";

/**
 * Reasons, in two columns — one per side.
 *
 * Deliberately not a discussion: no replies, no nesting, no arguing with the
 * other column. Each reason sits next to the vote it explains, and the two
 * columns are equal width so neither side looks like the default answer.
 */
export function PollReasons({
  poll,
  reasons,
}: {
  poll: DecoratedPoll;
  reasons: PollReason[];
}) {
  const { pollVotes, displayName } = usePrototype();
  const { account } = useSession();
  const mine = pollVotes[poll.id];
  const myId = account?.id ?? null;

  /**
   * One column, with the reader's own reason first and shown exactly once.
   *
   * IT USED TO APPEAR TWICE. This prepended a copy held in `localStorage` on
   * top of whatever the server returned, which was right when reasons lived
   * only in this browser and wrong the moment they were persisted: the same
   * sentence came back from Postgres under the author's real name, so a voter
   * saw "You (you) · Just now" above an identical "Their Name · Just now".
   *
   * The server is the source of truth. When it already has the reader's
   * reason — matched on author, which is why `authorId` exists — that row is
   * the one rendered, labelled and lifted to the top. The local copy survives
   * for exactly one case: the moment between casting a vote and the page
   * refetching, when the row exists in the database but not yet in this
   * render. Without it the reason a person just wrote appears to vanish.
   */
  const columnFor = (side: PollOptionId): PollReason[] => {
    const list = reasons.filter((r) => r.side === side);
    const ownIndex = myId ? list.findIndex((r) => r.authorId === myId) : -1;

    if (ownIndex !== -1) {
      const own = list[ownIndex]!;
      return [
        { ...own, name: `${own.name} (you)` },
        ...list.slice(0, ownIndex),
        ...list.slice(ownIndex + 1),
      ];
    }

    if (mine?.side === side && mine.reason.trim()) {
      const name = displayName || "You";
      return [
        {
          id: `${poll.id}-mine`,
          pollId: poll.id,
          side,
          authorId: myId,
          name: `${name} (you)`,
          initials: name.slice(0, 2).toUpperCase(),
          text: mine.reason.trim(),
          time: "Just now",
          helpful: 0,
        },
        ...list,
      ];
    }

    return list;
  };

  return (
    <section
      id="discussion"
      aria-label="Reasons given"
      // Clears the fixed nav, which would otherwise sit over the heading.
      className="flex scroll-mt-[calc(var(--ohq-nav-h)+16px)] flex-col gap-5"
    >
      <div>
        <h2 className="m-0 mb-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.05] font-bold tracking-[-0.02em] text-cream-bright">
          Why people <em>chose what they chose</em>
        </h2>
        <p className="m-0 max-w-[620px] text-[13.5px] leading-[1.55] text-dim">
          Written reasons attached to votes, side by side. Polls carry no threads
          — nobody replies to anybody here, which keeps the column readable as a
          set of arguments rather than a fight.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[clamp(14px,1.6vw,20px)] lg:grid-cols-2">
        {poll.options.map((option) => {
          const column = columnFor(option.id);
          return (
            <div key={option.id} className="flex min-w-0 flex-col gap-3">
              <header
                className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-4 py-3"
                style={{
                  borderColor: `${option.color}44`,
                  background: `${option.color}0F`,
                }}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: option.color }}
                  />
                  <span className="truncate text-[14.5px] font-semibold text-cream-bright">
                    {option.name}
                  </span>
                </span>
                <span className="font-mono text-[11px] whitespace-nowrap text-dim">
                  {option.pct}% · {formatNumber(option.votes)}
                </span>
              </header>

              {column.map((reason) => (
                <article
                  key={reason.id}
                  className="ohq-panel flex flex-col gap-3 p-4 sm:p-5"
                >
                  <header className="flex flex-wrap items-center gap-2.5">
                    <span
                      aria-hidden
                      className="grid h-[30px] w-[30px] place-items-center rounded-full bg-avatar text-[11px] font-semibold text-soft"
                    >
                      {reason.initials}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-cream">
                          {reason.name}
                        </span>
                        {reason.anonymous ? (
                          <span className="shrink-0 rounded-full border border-veil/18 px-1.5 py-[1px] font-mono text-[8.5px] tracking-[0.12em] uppercase text-dim">
                            Anon
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-dim">
                        Voted {option.name} · {reason.time}
                      </span>
                    </span>
                  </header>
                  <p className="m-0 text-[14px] leading-[1.65] text-pretty text-soft">
                    {reason.text}
                  </p>
                  {reason.media && reason.media.length > 0 ? (
                    <MediaStrip media={reason.media} />
                  ) : null}
                  {reason.helpful > 0 ? (
                    <footer className="border-t border-line pt-3 font-mono text-[10.5px] text-dim">
                      {formatNumber(reason.helpful)} found this helpful
                    </footer>
                  ) : null}
                </article>
              ))}

              {column.length === 0 ? (
                <p className="m-0 rounded-[14px] border border-dashed border-veil/10 px-4 py-8 text-center text-[13px] text-dim">
                  Nobody has explained this pick yet.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
