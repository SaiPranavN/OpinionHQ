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

import { decoratePoll } from "@/lib/derive-poll";
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
import type { DecoratedPoll, PollOptionId, PollReason } from "@/lib/types";

const CARD_COLUMNS =
  "id, slug, question, category_id, place_id, status, summary, tags, closes_at, " +
  "published_at, updated_at, total_votes, reason_count, trend_score, last_activity_at";

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
export async function listPolls(): Promise<DecoratedPoll[]> {
  const supabase = await supabaseServer();

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

interface Author {
  display_name: string;
  initials: string | null;
}

export interface PollPage {
  poll: DecoratedPoll;
  reasons: PollReason[];
  /** The viewer's own pick, when they have one. */
  myVote: PollOptionId | null;
  /** Reasons the viewer has marked helpful, by reason id. */
  myHelpful: Set<string>;
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
    supabase.rpc("poll_demographic_opt_in", { target: pollId }).then((r) => r.data),
    supabase.rpc("poll_reason_counts", { target: pollId }).then((r) => r.data),
    // From the votes themselves. `poll_history` was meant to be filled by a
    // scheduled job that never existed, so the chart had nothing to draw.
    supabase.rpc("poll_daily_series", { target: pollId }).then((r) => r.data),
    supabase
      .from("poll_reasons")
      // `!user_id` NAMES THE RELATIONSHIP, and it has to.
      //
      // PostgREST can reach `profiles` from `poll_reasons` two ways — directly
      // through `user_id`, and around through `poll_id → polls.created_by` —
      // so an unqualified embed is ambiguous and the whole query fails with
      // "more than one relationship was found". The failure was silent: the
      // error was discarded and the page rendered an empty reasons list, so
      // every written reason looked lost the moment somebody refreshed. They
      // were in the table the whole time.
      //
      // `initials` is a generated column, so the monogram is read rather than
      // recomputed — a second implementation here would drift the moment
      // somebody edits their display name.
      .select(
        "id, user_id, option_id, body, helpful_count, created_at, profiles!user_id(display_name, initials)",
      )
      .eq("poll_id", pollId)
      .is("hidden_at", null)
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

  const [audienceRows, optIn, reasonCountRows, historyRows, reasonRows, myVoteRow] = results;

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
          option_id: string;
          body: string;
          helpful_count: number;
          created_at: string;
          profiles: Author | Author[] | null;
        }[]
      | null) ?? []
  ).flatMap((r) => {
    const slot = slotById.get(r.option_id);
    // A reason whose option was deleted has nothing to sit under. Dropped
    // rather than shown against the wrong side.
    if (!slot) return [];
    const author = one<Author>(r.profiles);
    const name = author?.display_name ?? "A participant";
    return [
      {
        id: r.id,
        pollId: poll.id,
        side: slot as PollOptionId,
        authorId: r.user_id,
        name,
        initials: author?.initials ?? "··",
        text: r.body,
        time: relativeOf(r.created_at),
        helpful: r.helpful_count,
      },
    ];
  });

  const myVote = myVoteRow
    ? ((slotById.get((myVoteRow as { option_id: string }).option_id) ?? null) as
        | PollOptionId
        | null)
    : null;

  // Which reasons the viewer marked helpful. Own-row-only by policy, so this
  // returns their marks and nobody else's — signed out, it returns nothing.
  const { data: helpfulRows } = uid
    ? await supabase
        .from("poll_reason_helpful")
        .select("reason_id")
        .eq("user_id", uid)
        .in("reason_id", reasons.length > 0 ? reasons.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"])
    : { data: null };

  return {
    poll: decoratePoll(poll),
    reasons,
    myVote,
    myHelpful: new Set(
      ((helpfulRows as { reason_id: string }[] | null) ?? []).map((r) => r.reason_id),
    ),
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
