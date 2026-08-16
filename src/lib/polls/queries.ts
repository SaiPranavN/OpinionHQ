import "server-only";

/**
 * Reading polls out of Postgres.
 *
 * Every query runs with the visitor's own session, so an unpublished draft is
 * absent for the public and present for an editor without this file containing
 * a single `if`. The row policies decide; these functions only ask.
 *
 * The catalog is fetched whole and filtered in memory by `filterAndSortPolls`,
 * the same pure function the prototype used and the same tests. Right at this
 * scale, wrong at ten thousand polls — when it gets slow the filters move into
 * the query and those tests become the definition of what the query has to
 * reproduce.
 */

import { pollCells, type AudienceCell, type PollCellRow } from "@/lib/audience/cells";
import { decoratePoll } from "@/lib/derive-poll";
import type { ReadClient } from "@/lib/supabase/public";
import { supabaseServer } from "@/lib/supabase/server";
import {
  rowToPoll,
  rowsToAudience,
  rowsToHistory,
  rowsToOptions,
  type AudienceRow,
  type PollCardRow,
  type DailyRow,
  type PollOptionRow,
} from "@/lib/polls/rows";
import { toMedia, type MediaRow } from "@/lib/media";
import type {
  ContributionMedia,
  DecoratedPoll,
  OpinionReply,
  PollOptionId,
  PollReason,
} from "@/lib/types";

interface ReasonReplyRow {
  id: string;
  reason_id: string;
  parent_id: string | null;
  /** Null when the reply is anonymous and the reader is not its author. */
  author_id: string | null;
  anonymous: boolean;
  display_name: string | null;
  initials: string | null;
  body: string;
  likes: number;
  dislikes: number;
  created_at: string;
}

const CARD_COLUMNS =
  "id, slug, question, category_id, place_id, status, summary, tags, closes_at, " +
  "published_at, updated_at, total_votes, reason_count, trend_score, last_activity_at, " +
  "suggested_by_name";

/**
 * The catalog.
 *
 * Options come along in one embedded select rather than N+1 round trips —
 * the split bar on every card needs them, so fetching them lazily would mean
 * fetching them all anyway, one request at a time.
 *
 * Cross-tabs deliberately do NOT come along: they are three group-bys per poll
 * and nothing on a card shows them.
 */
export async function listPolls(client?: ReadClient): Promise<DecoratedPoll[]> {
  // Defaults to the session-aware client; callers that must stay
  // cacheable pass the session-less one. See lib/supabase/public.ts.
  const supabase = client ?? ((await supabaseServer()) as unknown as ReadClient);

  const [cards, options] = await Promise.all([
    supabase
      .from("poll_cards")
      .select(CARD_COLUMNS)
      .not("published_at", "is", null)
      .order("trend_score", { ascending: false })
      .limit(500),
    supabase.from("poll_options").select("id, poll_id, slot, name, blurb, vote_count"),
  ]);

  if (cards.error || !cards.data) return [];

  const byPoll = new Map<string, PollOptionRow[]>();
  for (const row of (options.data as (PollOptionRow & { poll_id: string })[] | null) ?? []) {
    const list = byPoll.get(row.poll_id) ?? [];
    list.push(row);
    byPoll.set(row.poll_id, list);
  }

  return (cards.data as unknown as PollCardRow[])
    .map((card) => rowToPoll(card, { options: rowsToOptions(byPoll.get(card.id) ?? []) }))
    // A poll with fewer than two options cannot be decorated — `leader` and
    // `runnerUp` would be the same row and the split bar would have nothing to
    // draw. Publishing enforces this, so one here means something is wrong;
    // dropping it costs that poll rather than the whole catalog.
    .filter((poll) => poll.options.length >= 2)
    .map(decoratePoll);
}

export interface PollPage {
  poll: DecoratedPoll;
  /** The joint demographic cross-tab. See TopicPage.audienceCells. */
  audienceCells: AudienceCell[];
  reasons: PollReason[];
  /** The viewer's own pick, when they have one. */
  myVote: PollOptionId | null;
  /** Threaded replies, keyed by the reason they hang under. */
  replies: Record<string, OpinionReply[]>;
  /** The viewer's own like/dislike on each reason. Empty when signed out. */
  myReasonVotes: Record<string, "like" | "dislike">;
  /** And on each reply under them. */
  myReplyVotes: Record<string, "like" | "dislike">;
}

export async function getPollPage(slug: string): Promise<PollPage | null> {
  const supabase = await supabaseServer();

  const { data: pollRow, error } = await supabase
    .from("polls")
    .select(
      "id, slug, question, category_id, place_id, status, summary, about, tags, closes_at, " +
        "published_at, updated_at, " +
        "poll_stats(total_votes, reason_count, trend_score, last_activity_at), " +
        "poll_options(id, slot, name, blurb, vote_count)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !pollRow) return null;

  const row = pollRow as unknown as Record<string, unknown>;
  const stats = one<Record<string, number | string | null>>(row.poll_stats);
  const optionRows = (row.poll_options as PollOptionRow[] | null) ?? [];
  const options = rowsToOptions(optionRows);
  if (options.length < 2) return null;

  const pollId = row.id as string;
  const slotById = new Map(optionRows.map((o) => [o.id, o.slot]));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id ?? null;

  const results = await Promise.all([
    supabase.rpc("poll_audience", { target: pollId }).then((r) => r.data),
    // The same measurement, undecomposed: one row per distinct demographic
    // combination rather than three independent summaries. It is what lets the
    // cross-tabs filter each other — see lib/audience/cells.ts.
    supabase.rpc("poll_audience_cells", { target: pollId }).then((r) => r.data),
    supabase.rpc("poll_demographic_opt_in", { target: pollId }).then((r) => r.data),
    supabase.rpc("poll_reason_counts", { target: pollId }).then((r) => r.data),
    // From the votes themselves. `poll_history` was meant to be filled by a
    // scheduled job that never existed, so the chart had nothing to draw.
    supabase.rpc("poll_daily_series", { target: pollId }).then((r) => r.data),
    // THROUGH `poll_reason_feed`, NOT `poll_reasons`. The view is the only read
    // path clients have and it is what removes the author from an anonymous
    // reason — name, initials and account id — before any of it arrives here.
    //
    // It also ends a long-standing trap. Embedding `profiles` from
    // `poll_reasons` was ambiguous, because PostgREST can reach it two ways:
    // directly through `user_id`, and around through `poll_id → polls.created_by`.
    // The unqualified form failed with "more than one relationship was found",
    // the error was discarded, and the page rendered an empty reasons list —
    // so every written reason looked lost while sitting in the table. The view
    // resolves the join once, server-side, and there is no embed left to get
    // wrong.
    supabase
      .from("poll_reason_feed")
      .select(
        "id, user_id, anonymous, display_name, initials, option_id, body, " +
          "helpful_count, dislike_count, reply_count, created_at",
      )
      .eq("poll_id", pollId)
      .order("helpful_count", { ascending: false })
      .limit(100)
      .then((r) => r.data),
    uid
      ? supabase
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", pollId)
          .eq("user_id", uid)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const [audienceRows, cellRows, optIn, reasonCountRows, historyRows, reasonRows, myVoteRow] =
    results;

  const reasonCounts: Partial<Record<PollOptionId, number>> = {};
  for (const r of (reasonCountRows as { slot: string; reasons: number }[] | null) ?? []) {
    reasonCounts[r.slot as PollOptionId] = Number(r.reasons);
  }

  const poll = rowToPoll(
    {
      id: pollId,
      slug: row.slug as string,
      question: row.question as string,
      category_id: row.category_id as string,
      place_id: row.place_id as string,
      status: row.status as string,
      summary: (row.summary as string) ?? "",
      tags: (row.tags as string[]) ?? [],
      closes_at: (row.closes_at as string) ?? null,
      published_at: (row.published_at as string) ?? null,
      updated_at: row.updated_at as string,
      total_votes: Number(stats?.total_votes ?? 0),
      reason_count: Number(stats?.reason_count ?? 0),
      trend_score: Number(stats?.trend_score ?? 0),
      last_activity_at: (stats?.last_activity_at as string) ?? null,
    },
    {
      about: (row.about as string) ?? "",
      options,
      audience: rowsToAudience(
        (audienceRows as AudienceRow[] | null) ?? [],
        options.length,
      ),
      reasonCounts,
      demographicOptIn: Number(optIn ?? 0),
      history: rowsToHistory((historyRows as DailyRow[] | null) ?? [], options.length),
    },
  );

  const reasons: PollReason[] = (
    (reasonRows as
      | {
          id: string;
          user_id: string | null;
          anonymous: boolean;
          display_name: string | null;
          initials: string | null;
          option_id: string;
          body: string;
          helpful_count: number;
          dislike_count: number;
          reply_count: number;
          created_at: string;
        }[]
      | null) ?? []
  ).flatMap((r) => {
    const slot = slotById.get(r.option_id);
    // A reason whose option was deleted has nothing to sit under. Dropped
    // rather than shown against the wrong side.
    if (!slot) return [];
    const hidden = Boolean(r.anonymous);
    return [
      {
        id: r.id,
        pollId: poll.id,
        side: slot as PollOptionId,
        // Null for everyone but the author when anonymous, which is exactly
        // what `PollReasons` needs to mark a reason as theirs without telling
        // anybody else whose it is.
        authorId: r.user_id,
        name: hidden ? "Anonymous" : (r.display_name ?? "A participant"),
        initials: hidden ? "··" : (r.initials ?? "··"),
        text: r.body,
        time: relativeOf(r.created_at),
        helpful: r.helpful_count,
        dislikes: r.dislike_count,
        replies: r.reply_count,
        anonymous: hidden,
      },
    ];
  });

  const myVote = myVoteRow
    ? ((slotById.get((myVoteRow as { option_id: string }).option_id) ?? null) as
        | PollOptionId
        | null)
    : null;

  const reasonIds = reasons.map((r) => r.id);

  /**
   * The replies, the reader's own votes, and the pictures.
   *
   * All four in one round, and all four scoped to the poll rather than fetched
   * per reason — a poll with thirty reasons would otherwise open thirty
   * requests for threads that are mostly empty.
   *
   * THROUGH `poll_reason_reply_feed`, NOT the table. The view is what removes
   * the author from an anonymous reply before it reaches this process, exactly
   * as `opinion_reply_feed` does on the topic side.
   */
  const [
    { data: replyRows },
    { data: reasonVoteRows },
    { data: replyVoteRows },
    { data: mediaRows },
  ] = await Promise.all([
    reasonIds.length > 0
      ? supabase
          .from("poll_reason_reply_feed")
          .select(
            "id, reason_id, parent_id, author_id, anonymous, display_name, initials, " +
              "body, likes, dislikes, created_at",
          )
          .in("reason_id", reasonIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null }),
    uid
      ? supabase.rpc("my_poll_reason_votes", { target: pollId })
      : Promise.resolve({ data: null }),
    uid
      ? supabase.rpc("my_poll_reply_votes", { target: pollId })
      : Promise.resolve({ data: null }),
    reasonIds.length > 0
      ? supabase
          .from("contribution_media")
          .select("id, poll_reason_id, storage_path, kind, alt, width, height")
          .in("poll_reason_id", reasonIds)
          .order("position", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  const replies: Record<string, OpinionReply[]> = {};
  for (const r of (replyRows as ReasonReplyRow[] | null) ?? []) {
    const hidden = Boolean(r.anonymous);
    (replies[r.reason_id] ??= []).push({
      id: r.id,
      parentId: r.parent_id,
      authorId: r.author_id ?? "",
      authorName: hidden ? "Anonymous" : (r.display_name ?? "A participant"),
      authorInitials: hidden ? "··" : (r.initials ?? "··"),
      body: r.body,
      createdAt: r.created_at,
      time: relativeOf(r.created_at),
      likes: r.likes,
      dislikes: r.dislikes,
    });
  }

  const myReasonVotes: Record<string, "like" | "dislike"> = {};
  for (const v of (reasonVoteRows as { reason_id: string; vote: string }[] | null) ?? []) {
    myReasonVotes[v.reason_id] = v.vote === "dislike" ? "dislike" : "like";
  }

  const myReplyVotes: Record<string, "like" | "dislike"> = {};
  for (const v of (replyVoteRows as { reply_id: string; vote: string }[] | null) ?? []) {
    myReplyVotes[v.reply_id] = v.vote === "dislike" ? "dislike" : "like";
  }

  const byReason: Record<string, ContributionMedia[]> = {};
  for (const row of (mediaRows as MediaRow[] | null) ?? []) {
    if (!row.poll_reason_id) continue;
    (byReason[row.poll_reason_id] ??= []).push(toMedia(row));
  }
  for (const reason of reasons) {
    const pictures = byReason[reason.id];
    if (pictures) reason.media = pictures;
  }

  return {
    poll: decoratePoll(poll),
    audienceCells: pollCells((cellRows as PollCellRow[] | null) ?? [], options.length),
    reasons,
    replies,
    myVote,
    myReasonVotes,
    myReplyVotes,
  };
}

/**
 * PostgREST returns an embedded one-to-one as an object, and the same shape as
 * an array when it cannot prove the relationship is unique. Both are valid; the
 * caller wants the row either way.
 */
function one<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

function relativeOf(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
}

/** Totals the polls catalog puts its name to. Counted, never constants. */
export async function pollTotals(): Promise<{ polls: number; votes: number }> {
  const supabase = await supabaseServer();

  const [{ count: polls }, { data: stats }] = await Promise.all([
    supabase
      .from("polls")
      .select("*", { count: "exact", head: true })
      .not("published_at", "is", null)
      .is("archived_at", null),
    supabase.from("poll_stats").select("total_votes"),
  ]);

  return {
    polls: polls ?? 0,
    votes: ((stats as { total_votes: number }[] | null) ?? []).reduce(
      (sum, row) => sum + (row.total_votes ?? 0),
      0,
    ),
  };
}
