"use client";

/**
 * The poll table, and the lifecycle buttons on it.
 *
 * EVERY ACTION CHECKS WHAT CAME BACK, not whether an error was thrown. A write
 * row-level security refuses does not raise — it matches no rows and returns
 * quietly, so a handler inspecting only `error` reports success on a refusal.
 * `lib/admin/polls.ts` turns "no rows" into a message and this renders it.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { archivePoll, deletePoll, publishPoll, restorePoll } from "@/lib/admin/polls";
import { placeLabel, type PlaceId } from "@/lib/places";
import type { CategoryId, StatusId } from "@/lib/types";

export interface AdminPollRow {
  id: string;
  slug: string;
  question: string;
  categoryId: string;
  placeId: string;
  status: string;
  summary: string;
  publishedAt: string | null;
  archivedAt: string | null;
  closesAt: string | null;
  votes: number;
  reasons: number;
  optionCount: number;
}

export function PollRows({ polls, isAdmin }: { polls: AdminPollRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  /**
   * The clock, read once when this list mounts.
   *
   * `Date.now()` in the row map is impure by React 19's rules — a value that
   * changes on its own between renders of the same props — and a `useMemo`
   * factory is still render-phase, so moving it there does not help. A lazy
   * `useState` initialiser is the one place a component may read the outside
   * world, and it gives the better answer anyway: one reading that every row
   * is measured against, rather than each row asking the clock separately and
   * two rows in the same table disagreeing about what time it is.
   */
  const [now] = useState(() => Date.now());

  const run = async (id: string, action: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(id);
    setError(null);
    const result = await action();
    setBusy(null);
    setConfirming(null);
    if (!result.ok) {
      setError(result.message ?? "That did not work.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p
          role="alert"
          className="m-0 rounded-[12px] border border-negative/30 bg-negative/8 px-4 py-3 text-[13px] text-negative-light"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {polls.map((poll) => {
          const live = Boolean(poll.publishedAt) && !poll.archivedAt;
          const state = poll.archivedAt ? "Archived" : poll.publishedAt ? "Live" : "Draft";
          const working = busy === poll.id;
          const closed = poll.closesAt ? new Date(poll.closesAt).getTime() < now : false;

          return (
            <article
              key={poll.id}
              className="ohq-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-5"
            >
              <span className="mt-0.5 shrink-0">
                <CategoryIcon category={poll.categoryId as CategoryId} />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="m-0 text-[15px] leading-[1.25] font-semibold text-cream-bright">
                    {poll.question}
                  </h3>
                  <StatusBadge status={poll.status as StatusId} />
                  <span
                    className={`rounded-full border px-2 py-[2px] font-mono text-[9.5px] tracking-[0.12em] uppercase ${
                      state === "Live"
                        ? "border-positive/40 bg-positive/12 text-positive-light"
                        : state === "Draft"
                          ? "border-veil/20 text-soft"
                          : "border-veil/14 text-dim"
                    }`}
                  >
                    {state}
                  </span>
                  {/* Distinct from Archived: a closed poll is still on the site
                      and still readable, it just no longer accepts votes. */}
                  {closed && live ? (
                    <span className="rounded-full border border-veil/20 px-2 py-[2px] font-mono text-[9.5px] tracking-[0.12em] text-dim uppercase">
                      Closed
                    </span>
                  ) : null}
                </div>

                <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] text-muted">
                  {poll.summary || <span className="text-dim">No summary.</span>}
                </p>

                <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[0.06em] text-dim">
                  <span>/{poll.slug}</span>
                  <span>{placeLabel(poll.placeId as PlaceId)}</span>
                  <span>
                    {poll.optionCount} option{poll.optionCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {poll.votes} vote{poll.votes === 1 ? "" : "s"}
                  </span>
                  {poll.reasons > 0 ? <span>{poll.reasons} reasons</span> : null}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href={`/admin/polls/${poll.slug}`}
                  className="rounded-full border border-veil/16 px-4 py-1.5 text-[12px] font-medium text-cream transition-colors hover:border-veil/40"
                >
                  Edit
                </Link>
                {live ? (
                  <Button onClick={() => run(poll.id, () => archivePoll(poll.id))} busy={working}>
                    Archive
                  </Button>
                ) : poll.archivedAt ? (
                  <Button onClick={() => run(poll.id, () => restorePoll(poll.id))} busy={working}>
                    Restore
                  </Button>
                ) : (
                  <Button
                    primary
                    onClick={() => run(poll.id, () => publishPoll(poll.id))}
                    busy={working}
                    // Publishing checks the option count in the database, so a
                    // one-option poll is refused rather than published broken.
                    title={
                      poll.optionCount < 2
                        ? "Needs a second option before it can go live."
                        : undefined
                    }
                  >
                    Publish
                  </Button>
                )}

                {isAdmin ? (
                  confirming === poll.id ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => run(poll.id, () => deletePoll(poll.id))}
                        disabled={working}
                        className="cursor-pointer rounded-full border border-negative/50 bg-negative/12 px-3 py-1.5 text-[12px] font-semibold text-negative-light transition-colors hover:bg-negative/20 disabled:cursor-not-allowed"
                      >
                        {working ? "Deleting…" : "Delete for good"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="cursor-pointer px-1.5 text-[12px] text-muted hover:text-cream"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setConfirming(poll.id);
                      }}
                      title={
                        poll.votes > 0
                          ? `Destroys ${poll.votes} recorded vote${poll.votes === 1 ? "" : "s"}. Archive keeps them.`
                          : "Archive is reversible; this is not."
                      }
                      className="cursor-pointer rounded-full border border-veil/14 px-3 py-1.5 text-[12px] font-medium text-dim transition-colors hover:border-negative/40 hover:text-negative-light"
                    >
                      Delete
                    </button>
                  )
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Button({
  children,
  onClick,
  busy,
  primary,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  primary?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      className={
        primary
          ? "cursor-pointer rounded-full bg-positive px-4 py-1.5 text-[12px] font-semibold text-positive-ink transition-colors hover:bg-[#25CC61] disabled:cursor-not-allowed disabled:bg-veil/10 disabled:text-dim"
          : "cursor-pointer rounded-full border border-veil/16 px-4 py-1.5 text-[12px] font-medium text-cream transition-colors hover:border-veil/40 disabled:cursor-not-allowed disabled:text-dim"
      }
    >
      {busy ? "Working…" : children}
    </button>
  );
}
