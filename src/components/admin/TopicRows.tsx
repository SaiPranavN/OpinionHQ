"use client";

/**
 * The topic table, and the lifecycle buttons on it.
 *
 * EVERY ACTION CHECKS WHAT CAME BACK, not whether an error was thrown. A write
 * that row-level security refuses does not raise — it matches no rows and
 * returns quietly, so a handler that only inspects `error` reports success on a
 * refusal. `lib/admin/topics.ts` turns "no rows" into a message, and this
 * renders it.
 *
 * `isAdmin` decides whether Delete is drawn at all. It is not the enforcement —
 * the policy is — but a button that always fails is a worse thing to ship than
 * one that is not there.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { archiveTopic, deleteTopic, publishTopic, restoreTopic } from "@/lib/admin/topics";
import { placeLabel, type PlaceId } from "@/lib/places";
import type { CategoryId, StatusId } from "@/lib/types";

export interface AdminTopicRow {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  placeId: string;
  status: string;
  summary: string;
  publishedAt: string | null;
  archivedAt: string | null;
  participants: number;
  written: number;
  aspectCount: number;
}

export function TopicRows({ topics, isAdmin }: { topics: AdminTopicRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

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
    // The list is a Server Component; refreshing re-reads it rather than
    // patching a copy here that could drift from what the database now says.
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="m-0 rounded-[12px] border border-negative/30 bg-negative/8 px-4 py-3 text-[13px] text-negative-light">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {topics.map((topic) => {
          const live = Boolean(topic.publishedAt) && !topic.archivedAt;
          const state = topic.archivedAt ? "Archived" : topic.publishedAt ? "Live" : "Draft";
          const working = busy === topic.id;

          return (
            <article
              key={topic.id}
              className="ohq-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-5"
            >
              <span className="mt-0.5 shrink-0">
                <CategoryIcon category={topic.categoryId as CategoryId} />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="m-0 text-[15px] leading-[1.25] font-semibold text-cream-bright">
                    {topic.name}
                  </h3>
                  <StatusBadge status={topic.status as StatusId} />
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
                </div>

                <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] text-muted">
                  {topic.summary || <span className="text-dim">No summary.</span>}
                </p>

                <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[0.06em] text-dim">
                  <span>/{topic.slug}</span>
                  <span>{placeLabel(topic.placeId as PlaceId)}</span>
                  <span>
                    {topic.aspectCount} aspect{topic.aspectCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {topic.participants} vote{topic.participants === 1 ? "" : "s"}
                  </span>
                  {topic.written > 0 ? <span>{topic.written} written</span> : null}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {/* First, and a link rather than a button: editing is what an
                    editor comes here to do, and publishing a sourced update
                    lives behind it. */}
                <Link
                  href={`/admin/topics/${topic.slug}`}
                  className="rounded-full border border-veil/16 px-4 py-1.5 text-[12px] font-medium text-cream transition-colors hover:border-veil/40"
                >
                  Edit
                </Link>
                {live ? (
                  <Button onClick={() => run(topic.id, () => archiveTopic(topic.id))} busy={working}>
                    Archive
                  </Button>
                ) : topic.archivedAt ? (
                  <Button onClick={() => run(topic.id, () => restoreTopic(topic.id))} busy={working}>
                    Restore
                  </Button>
                ) : (
                  <Button
                    primary
                    onClick={() => run(topic.id, () => publishTopic(topic.id))}
                    busy={working}
                  >
                    Publish
                  </Button>
                )}

                {isAdmin ? (
                  confirming === topic.id ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => run(topic.id, () => deleteTopic(topic.id))}
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
                        setConfirming(topic.id);
                      }}
                      // Two clicks, and the second one says what it destroys.
                      // Deleting a topic takes every opinion on it and moves the
                      // published percentages to match; archiving is the
                      // reversible thing next to it, which is why they sit
                      // together.
                      title={
                        topic.participants > 0
                          ? `Destroys ${topic.participants} recorded vote${topic.participants === 1 ? "" : "s"}. Archive keeps them.`
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
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
