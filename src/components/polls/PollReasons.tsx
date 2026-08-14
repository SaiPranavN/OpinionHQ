"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useSession } from "@/components/auth/SessionProvider";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { ReplyThread } from "@/components/topic/ReplyThread";
import { MediaStrip } from "@/components/ui/MediaStrip";
import { buildThread } from "@/lib/comments/tree";
import { formatNumber } from "@/lib/derive-poll";
import { REASON_WRITES, replyToReason, voteOnReason } from "@/lib/polls/reasons";
import type {
  DecoratedPoll,
  OpinionReply,
  PollOption,
  PollOptionId,
  PollReason,
} from "@/lib/types";

const MAX_REPLY = 400;

/**
 * Reasons, in two columns — one per side.
 *
 * THEY CARRY A CONVERSATION NOW. This used to say, at some length, that polls
 * deliberately had no threads: each reason sat next to the vote it explained
 * and nobody could answer anybody. That is gone. A written case for one side of
 * a poll is the same sort of writing as a written case about a topic, and there
 * was no good reason for one to be repliable and the other a dead end.
 *
 * The thread is the *same component* the opinion side renders, handed a
 * different pair of writes — not a copy of it. Two threaded discussions in one
 * product that behave differently is two things for a reader to learn.
 *
 * The two columns stay equal width so neither side looks like the default
 * answer, which was always the point of the layout.
 */
export function PollReasons({
  poll,
  reasons,
  replies,
  myReasonVotes,
  myReplyVotes,
}: {
  poll: DecoratedPoll;
  reasons: PollReason[];
  replies: Record<string, OpinionReply[]>;
  myReasonVotes: Record<string, "like" | "dislike">;
  myReplyVotes: Record<string, "like" | "dislike">;
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
          Written reasons attached to votes, side by side — and the conversation
          under each one. Every reason can be liked, disliked and replied to,
          the same as an opinion on a topic.
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
                <ReasonCard
                  key={reason.id}
                  reason={reason}
                  option={option}
                  replies={replies[reason.id] ?? []}
                  myVote={myReasonVotes[reason.id] ?? null}
                  myReplyVotes={myReplyVotes}
                />
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

/**
 * One reason, with the four actions an opinion has.
 *
 * Like and dislike are optimistic and then reconciled: the number moves at
 * once because a vote should feel instant, and a refusal puts it back rather
 * than leaving a lie on screen. That distinction cost an afternoon on the
 * follow counter and is not being relearned here.
 */
function ReasonCard({
  reason,
  option,
  replies,
  myVote,
  myReplyVotes,
}: {
  reason: PollReason;
  option: PollOption & { color: string; pct: number; votes: number };
  replies: OpinionReply[];
  myVote: "like" | "dislike" | null;
  myReplyVotes: Record<string, "like" | "dislike">;
}) {
  const router = useRouter();
  const { signedIn, openAuth, toast } = usePrototype();

  const [vote, setVote] = useState<"like" | "dislike" | null>(myVote);
  const [tally, setTally] = useState({
    like: reason.helpful,
    dislike: reason.dislikes ?? 0,
  });
  const [voting, setVoting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nodes = useMemo(() => buildThread(replies), [replies]);

  /**
   * The locally-held copy of a reason the reader just wrote has no database row
   * yet, so nothing can be attached to it. Its actions are hidden rather than
   * shown and made to fail — see `columnFor` for why that copy exists at all.
   */
  const pending = reason.id.endsWith("-mine");

  const cast = async (kind: "like" | "dislike") => {
    if (!signedIn) {
      openAuth("signin");
      return;
    }
    if (voting) return;

    const beforeVote = vote;
    const beforeTally = tally;
    const next = beforeVote === kind ? null : kind;

    setVoting(true);
    setVote(next);
    setTally({
      like: reason.helpful + (next === "like" ? 1 : 0),
      dislike: (reason.dislikes ?? 0) + (next === "dislike" ? 1 : 0),
    });

    const result = await voteOnReason(reason.id, kind);
    setVoting(false);

    if (!result.ok) {
      setVote(beforeVote);
      setTally(beforeTally);
      toast(result.message);
      return;
    }
    setVote(result.vote);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      openAuth("signin");
      return;
    }
    setSending(true);
    setError(null);
    // No parent — the box under the card starts a new top-level thread.
    const result = await replyToReason(reason.id, draft);
    setSending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDraft("");
    setComposing(false);
    setShowReplies(true);
    // Re-read rather than splice a copy in here, which would drift from what
    // the database holds the moment two people reply at once.
    router.refresh();
  };

  const share = () => {
    const url =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}${window.location.pathname}#${reason.id}`;
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => toast("Link copied."),
        () => toast("Copy the page link and add the reason id."),
      );
      return;
    }
    toast("Link copied.");
  };

  return (
    <article id={reason.id} className="ohq-panel flex scroll-mt-24 flex-col gap-3 p-4 sm:p-5">
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

      <p className="m-0 text-[14px] leading-[1.65] text-pretty text-soft">{reason.text}</p>

      {reason.media && reason.media.length > 0 ? <MediaStrip media={reason.media} /> : null}

      {pending ? null : (
        <footer className="flex flex-wrap items-center gap-x-[18px] gap-y-2 border-t border-line pt-3">
          <ReasonVote
            kind="like"
            active={vote === "like"}
            count={tally.like}
            busy={voting}
            onPress={() => cast("like")}
          />
          <ReasonVote
            kind="dislike"
            active={vote === "dislike"}
            count={tally.dislike}
            busy={voting}
            onPress={() => cast("dislike")}
          />
          <button
            type="button"
            onClick={() => setShowReplies((v) => !v)}
            aria-expanded={showReplies}
            className="cursor-pointer text-[12.5px] text-muted transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            {showReplies ? "Hide comments" : "Comments"} · {replies.length}
          </button>
          <button
            type="button"
            onClick={share}
            className="cursor-pointer text-[12.5px] text-muted transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Share
          </button>
        </footer>
      )}

      {showReplies && !pending ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3.5">
          <ReplyThread
            subjectId={reason.id}
            subjectAuthorId={reason.authorId ?? ""}
            nodes={nodes}
            myVotes={myReplyVotes}
            writes={REASON_WRITES}
            onChanged={() => router.refresh()}
          />

          {composing ? (
            <form onSubmit={send} className="flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_REPLY))}
                rows={3}
                autoFocus
                placeholder="Answer this reason."
                className="resize-y rounded-[10px] border border-veil/10 bg-surface-sunken p-3 text-[13.5px] leading-[1.6] text-cream outline-none transition-colors duration-300 focus:border-poll/50"
              />
              {error ? (
                <p className="m-0 text-[12px] text-negative-soft" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="submit"
                  disabled={sending || draft.trim().length === 0}
                  className="cursor-pointer rounded-full bg-positive px-4 py-2 text-[12.5px] font-semibold text-positive-ink transition-opacity duration-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? "Posting…" : "Post reply"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposing(false);
                    setDraft("");
                    setError(null);
                  }}
                  className="cursor-pointer text-[12.5px] text-dim transition-colors hover:text-soft"
                >
                  Cancel
                </button>
                <span className="ml-auto font-mono text-[10.5px] text-dim">
                  {draft.length}/{MAX_REPLY}
                </span>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => (signedIn ? setComposing(true) : openAuth("signin"))}
              className="cursor-pointer self-start text-[12.5px] font-medium text-positive-light transition-colors hover:text-positive"
            >
              Add a reply
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

/**
 * One vote button.
 *
 * The count is always rendered, including at zero — hiding a nought is how a
 * working feature comes to look unwired, which the follow button already had to
 * learn once.
 */
function ReasonVote({
  kind,
  active,
  count,
  busy,
  onPress,
}: {
  kind: "like" | "dislike";
  active: boolean;
  count: number;
  busy: boolean;
  onPress: () => void;
}) {
  const like = kind === "like";
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={busy}
      aria-pressed={active}
      aria-label={`${like ? "Like" : "Dislike"} — ${count}`}
      className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 disabled:cursor-default"
      style={{ color: active ? (like ? "#4ED27C" : "#E2686B") : "var(--color-muted)" }}
    >
      <span aria-hidden className="text-[11px]">
        {like ? "▲" : "▼"}
      </span>
      {like ? "Like" : "Dislike"}
      <span className="font-mono text-[11.5px] tabular-nums">{formatNumber(count)}</span>
    </button>
  );
}
