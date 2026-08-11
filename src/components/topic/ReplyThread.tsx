"use client";

/**
 * Threaded discussion under one opinion.
 *
 * THE THREAD LINE IS STRUCTURAL, not decoration, and it is a line rather than a
 * bar. It drops out of a reply's monogram, runs down the gutter, and curves into
 * each child's own monogram — so a reply four levels down still visibly hangs
 * off one specific comment. A bar alongside a column of text only says "these
 * are indented", which the indent already said.
 *
 * The children are a SIBLING of the row above, not a child of its content
 * column. That is what lets the vertical segment stop exactly where the first
 * elbow begins: the row is as tall as its own reply, and everything below is
 * drawn by the children (`.ohq-thread` in globals.css). The line therefore ends
 * at the last reply rather than running past the end of the conversation.
 *
 * The same rail Ask Verified uses, from the same stylesheet and the same tree
 * builder — a reader moving between the two should not have to learn the
 * gesture twice.
 */

import { useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import {
  MAX_COMMENT_DEPTH,
  replySummary,
  type ThreadNode,
  type Vote,
} from "@/lib/comments/tree";
import { postReply, voteOnReply } from "@/lib/topics/replies";
import type { OpinionReply } from "@/lib/types";

const MAX_REPLY = 2000;


export function ReplyThread({
  opinionId,
  opinionAuthorId,
  nodes,
  myVotes,
  onChanged,
}: {
  opinionId: string;
  /** Marked so a reader can see the opinion's author answering their own thread. */
  opinionAuthorId: string;
  nodes: ThreadNode<OpinionReply>[];
  myVotes: Record<string, Vote>;
  onChanged: () => void;
}) {
  if (nodes.length === 0) {
    return <p className="m-0 text-[12.5px] text-dim">No replies yet.</p>;
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-4 p-0">
      {nodes.map((node) => (
        <li key={node.entry.id}>
          <ReplyNode
            node={node}
            opinionId={opinionId}
            opinionAuthorId={opinionAuthorId}
            myVotes={myVotes}
            onChanged={onChanged}
          />
        </li>
      ))}
    </ol>
  );
}

function ReplyNode({
  node,
  opinionId,
  opinionAuthorId,
  myVotes,
  onChanged,
}: {
  node: ThreadNode<OpinionReply>;
  opinionId: string;
  opinionAuthorId: string;
  myVotes: Record<string, Vote>;
  onChanged: () => void;
}) {
  const { signedIn, openAuth, profile } = usePrototype();
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entry = node.entry;
  const myVote = myVotes[entry.id];
  const isOpinionAuthor = entry.authorId === opinionAuthorId;
  // Voting on your own words is not a signal about anything.
  const mine = Boolean(profile) && entry.authorName === profile?.name;
  const hasReplies = node.replies.length > 0;
  const showReplies = hasReplies && !collapsed;

  const post = async () => {
    if (!signedIn) {
      openAuth("signin");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await postReply(opinionId, draft, entry.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDraft("");
    setReplying(false);
    onChanged();
  };

  const vote = async (kind: Vote) => {
    if (!signedIn) {
      openAuth("signin");
      return;
    }
    const result = await voteOnReply(entry.id, kind);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChanged();
  };

  return (
    <div className="flex flex-col">
      <div className="flex gap-2.5">
        <span className="flex w-7 shrink-0 flex-col items-center gap-1.5">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-veil/12 bg-veil/4 font-mono text-[10px] text-muted"
            style={
              isOpinionAuthor
                ? { borderColor: "rgba(29,185,84,0.4)", color: "var(--color-positive-light)" }
                : undefined
            }
          >
            {entry.authorInitials}
          </span>
          {/* `flex-col` matters: in a row-direction flex the `flex-1` below
              grows the line sideways into a 28px block instead of stretching it
              downwards, which is a bar and not a thread. */}
          {showReplies ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={`Collapse ${replySummary(node.total)}`}
              title={`Collapse ${replySummary(node.total)}`}
              className="group flex w-full flex-1 cursor-pointer flex-col items-center outline-none"
            >
              <span className="w-px flex-1 bg-veil/17 transition-colors duration-200 group-hover:bg-positive/55 group-focus-visible:bg-positive/60" />
            </button>
          ) : null}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-[12.5px] font-medium text-cream">{entry.authorName}</span>
            {isOpinionAuthor ? (
              <span className="rounded-full border border-positive/35 bg-positive/10 px-1.5 py-px font-mono text-[9px] tracking-[0.1em] text-positive-light uppercase">
                Wrote this
              </span>
            ) : null}
            <span className="text-[11px] text-dim">{entry.time}</span>
          </span>

          {/* Collapsing folds away the replies and nothing else. Threaded
              discussions elsewhere hide the comment's own text too, which makes
              sense when the reason you are collapsing is that the comment is
              noise. What is worth folding here is a long sub-thread, and the
              control says exactly that. */}
          <p className="m-0 text-[13px] leading-[1.6] text-pretty whitespace-pre-line text-soft">
            {entry.body}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <VoteBar
              likes={entry.likes}
              dislikes={entry.dislikes}
              vote={myVote}
              disabled={mine}
              title={mine ? "You cannot vote on your own reply" : undefined}
              onVote={vote}
            />
            <button
              type="button"
              onClick={() => (signedIn ? setReplying((v) => !v) : openAuth("signin"))}
              aria-expanded={replying}
              className={inlineButton}
            >
              {signedIn ? "Reply" : "Sign in to reply"}
            </button>
            {hasReplies ? (
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                aria-expanded={!collapsed}
                className={inlineButton}
              >
                {collapsed ? "Show" : "Collapse"} {replySummary(node.total)}
              </button>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="m-0 text-[12px] text-negative-light">
              {error}
            </p>
          ) : null}

          {replying ? (
            <div className="mt-1 flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_REPLY))}
                rows={2}
                autoFocus
                placeholder={`Reply to ${entry.authorName}`}
                aria-label={`Reply to ${entry.authorName}`}
                className="resize-y rounded-[10px] border border-veil/12 bg-surface-sunken px-3 py-2 text-[13px] leading-[1.6] text-cream outline-none transition-colors focus:border-positive/45"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={post}
                  disabled={draft.trim().length === 0 || busy}
                  className="cursor-pointer rounded-full border border-positive/40 px-3.5 py-1.5 text-[12px] font-medium text-positive-light transition-colors hover:bg-positive/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Posting…" : "Post reply"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplying(false);
                    setDraft("");
                    setError(null);
                  }}
                  className={inlineButton}
                >
                  Cancel
                </button>
                <span className="font-mono text-[10.5px] text-dim">
                  {draft.length}/{MAX_REPLY} · public
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* The children. A sibling of the row above, so that row is as tall as
          this reply alone and its gutter line stops where the first elbow
          starts.

          `ohq-thread` carries the 38px indent as padding, so the negative margin
          is the depth cap doing its work: past MAX_COMMENT_DEPTH children share
          their parent's depth, and pulling the list back by exactly one gutter
          cancels the indent while leaving the connectors drawn against it. The
          elbows still land on the line — only the stepping right stops, so a
          long exchange does not walk off the edge of a phone. */}
      {showReplies ? (
        <ol
          className={`ohq-thread m-0 list-none ${
            (node.replies[0]?.depth ?? 0) > node.depth || node.depth >= MAX_COMMENT_DEPTH
              ? ""
              : "-ml-[38px]"
          }`}
        >
          {node.replies.map((reply) => (
            <li key={reply.entry.id}>
              <ReplyNode
                node={reply}
                opinionId={opinionId}
                opinionAuthorId={opinionAuthorId}
                myVotes={myVotes}
                onChanged={onChanged}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

const inlineButton =
  "inline-flex cursor-pointer items-center gap-1 text-[11.5px] text-dim transition-colors hover:text-soft outline-none focus-visible:text-cream";

function VoteBar({
  likes,
  dislikes,
  vote,
  disabled,
  title,
  onVote,
}: {
  likes: number;
  dislikes: number;
  vote: Vote | undefined;
  disabled?: boolean;
  title?: string;
  onVote: (kind: Vote) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      {(["like", "dislike"] as const).map((kind) => {
        const active = vote === kind;
        const count = kind === "like" ? likes : dislikes;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onVote(kind)}
            disabled={disabled}
            aria-pressed={active}
            aria-label={`${kind === "like" ? "Like" : "Dislike"} this reply`}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              active
                ? kind === "like"
                  ? "border-positive/45 bg-positive/12 text-positive-light"
                  : "border-negative/45 bg-negative/12 text-negative-light"
                : "border-veil/12 text-dim hover:border-veil/28 hover:text-soft"
            }`}
          >
            <span aria-hidden>{kind === "like" ? "▲" : "▼"}</span>
            {count > 0 ? count : null}
          </button>
        );
      })}
    </span>
  );
}
