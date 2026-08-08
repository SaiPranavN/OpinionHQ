import "server-only";

/**
 * Reading topics out of Postgres.
 *
 * Server-only, and every query runs with the visitor's own session — so an
 * unpublished draft is absent for the public and present for an editor without
 * this file containing a single `if`. The row policies decide; these functions
 * only ask.
 *
 * The catalog is fetched whole and filtered in memory by `filterAndSort`, which
 * is the same pure function the prototype used. That is right at this scale and
 * wrong at ten thousand topics: when the catalog gets slow, the filters move
 * into the query and `filterAndSort` keeps its tests as the definition of what
 * the query has to reproduce.
 */

import { decorate } from "@/lib/derive";
import { supabaseServer } from "@/lib/supabase/server";
import {
  rowToTopic,
  rowsToFacets,
  relativeTime,
  type AspectRow,
  type TopicCardRow,
} from "@/lib/topics/rows";
import type {
  DecoratedTopic,
  Opinion,
  OpinionReply,
  Sentiment,
  TimelineEvent,
  TopicContext,
} from "@/lib/types";

const CARD_COLUMNS =
  "id, slug, name, category_id, place_id, status, summary, tags, published_at, updated_at, " +
  "positive_count, neutral_count, negative_count, participants, written_count, " +
  "trend_score, last_activity_at, change_metric, change_value, change_direction";

export async function listTopics(): Promise<DecoratedTopic[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("topic_cards")
    .select(CARD_COLUMNS)
    .not("published_at", "is", null)
    .order("trend_score", { ascending: false })
    .limit(500);

  if (error || !data) return [];
  return (data as unknown as TopicCardRow[]).map((row) => decorate(rowToTopic(row)));
}

interface ReplyRow {
  id: string;
  opinion_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  likes: number;
  dislikes: number;
  created_at: string;
  profiles: unknown;
}

export interface TopicPage {
  topic: DecoratedTopic;
  opinions: Opinion[];
  /** Threaded replies, keyed by the opinion they hang under. */
  replies: Record<string, OpinionReply[]>;
  /** The viewer's own like/dislike on each reply. Empty when signed out. */
  myReplyVotes: Record<string, "like" | "dislike">;
  timeline: TimelineEvent[];
  context: TopicContext;
  /** The viewer's own vote, when they have one. */
  myVote: { vote: Sentiment; body: string } | null;
  /** Their answers to the aspects, keyed by aspect id. */
  myFacetAnswers: Record<string, string>;
}

export async function getTopicPage(slug: string): Promise<TopicPage | null> {
  const supabase = await supabaseServer();

  const { data: topicRow, error } = await supabase
    .from("topics")
    .select(
      "id, slug, name, category_id, place_id, status, summary, about, tags, published_at, updated_at, " +
        "topic_stats(positive_count, neutral_count, negative_count, participants, written_count, " +
        "trend_score, last_activity_at, change_metric, change_value, change_direction), " +
        "topic_aspects(id, key, label, prompt, position, topic_aspect_options(id, key, label, tone, position)), " +
        "topic_context(explain, updated_note, updated_at)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !topicRow) return null;

  const row = topicRow as unknown as Record<string, unknown>;
  const stats = one<Record<string, number | string | null>>(row.topic_stats);
  const aspects = rowsToFacets((row.topic_aspects as AspectRow[] | null) ?? []);
  const context = one<{ explain: string; updated_note: string; updated_at: string }>(
    row.topic_context,
  );

  const card: TopicCardRow = {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    category_id: row.category_id as string,
    place_id: row.place_id as string,
    status: row.status as string,
    summary: (row.summary as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    published_at: (row.published_at as string) ?? null,
    updated_at: row.updated_at as string,
    positive_count: Number(stats?.positive_count ?? 0),
    neutral_count: Number(stats?.neutral_count ?? 0),
    negative_count: Number(stats?.negative_count ?? 0),
    participants: Number(stats?.participants ?? 0),
    written_count: Number(stats?.written_count ?? 0),
    trend_score: Number(stats?.trend_score ?? 0),
    last_activity_at: (stats?.last_activity_at as string) ?? null,
    change_metric: (stats?.change_metric as string) ?? null,
    change_value: (stats?.change_value as number) ?? null,
    change_direction: (stats?.change_direction as string) ?? null,
  };

  const topicId = card.id;

  // Resolved once, up front. Threading it through `.then()` on each query made
  // two of them conditionally return a bare `{ data: null }`, which is not a
  // Postgrest response and does not type as one.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id ?? null;

  const [{ data: written }, { data: events }, { data: mine }, { data: facetAnswers }] =
    await Promise.all([
      // Written opinions only. A bare vote is a row here too, and listing them
      // would fill the discussion with empty cards.
      supabase
        .from("opinions")
        .select(
          "id, author_id, vote, body, format, author_line, verified_label, helpful_count, " +
            "reply_count, created_at, profiles!author_id(display_name, initials)",
        )
        .eq("topic_id", topicId)
        .neq("body", "")
        .is("hidden_at", null)
        .order("helpful_count", { ascending: false })
        .limit(100),
      supabase
        .from("timeline_events")
        .select("id, occurred_on, title, description, source_name, source_url, status")
        .eq("topic_id", topicId)
        .order("occurred_on", { ascending: false }),
      // `eq("author_id", "")` on a uuid column would error rather than return
      // nothing, so a signed-out visitor gets a resolved empty instead.
      uid
        ? supabase
            .from("opinions")
            .select("vote, body")
            .eq("topic_id", topicId)
            .eq("author_id", uid)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      uid
        ? supabase
            .from("facet_responses")
            .select("aspect_id, option_id")
            .eq("topic_id", topicId)
            .eq("user_id", uid)
        : Promise.resolve({ data: null }),
    ]);

  const answers: Record<string, string> = {};
  for (const answer of (facetAnswers as { aspect_id: string; option_id: string }[] | null) ?? []) {
    answers[answer.aspect_id] = answer.option_id;
  }

  const opinions = ((written as OpinionRow[] | null) ?? []).map((o) => toOpinion(o, card.slug));

  // Replies, for every opinion on the page in one query rather than one per
  // card. A topic with forty written opinions would otherwise open forty
  // requests, and the discussion tab renders all of them at once.
  //
  // Fetched after the opinions because it needs their ids. The viewer's own
  // votes come with it: `opinion_reply_votes` is own-row-only by policy, so a
  // plain select returns theirs and nobody else's, and signed out it returns
  // nothing without this file testing for a session.
  const opinionIds = opinions.map((o) => o.id);
  const [{ data: replyRows }, { data: voteRows }] = await Promise.all([
    opinionIds.length > 0
      ? supabase
          .from("opinion_replies")
          .select(
            "id, opinion_id, parent_id, author_id, body, likes, dislikes, created_at, " +
              "profiles!author_id(display_name, initials)",
          )
          .in("opinion_id", opinionIds)
          .is("hidden_at", null)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null }),
    uid && opinionIds.length > 0
      ? supabase.from("opinion_reply_votes").select("reply_id, vote")
      : Promise.resolve({ data: null }),
  ]);

  const replies: Record<string, OpinionReply[]> = {};
  for (const r of (replyRows as ReplyRow[] | null) ?? []) {
    const author = one<{ display_name: string; initials: string }>(r.profiles);
    (replies[r.opinion_id] ??= []).push({
      id: r.id,
      parentId: r.parent_id,
      authorId: r.author_id,
      authorName: author?.display_name ?? "A participant",
      authorInitials: author?.initials ?? "··",
      body: r.body,
      createdAt: r.created_at,
      time: relativeTime(r.created_at),
      likes: r.likes,
      dislikes: r.dislikes,
    });
  }

  const myReplyVotes: Record<string, "like" | "dislike"> = {};
  for (const v of (voteRows as { reply_id: string; vote: string }[] | null) ?? []) {
    myReplyVotes[v.reply_id] = v.vote === "dislike" ? "dislike" : "like";
  }

  return {
    topic: decorate(rowToTopic(card, { about: (row.about as string) ?? "", aspects })),
    opinions,
    replies,
    myReplyVotes,
    timeline: ((events as TimelineRow[] | null) ?? []).map((e) => ({
      id: e.id,
      topicId: card.slug,
      date: e.occurred_on,
      title: e.title,
      desc: e.description,
      src: e.source_name,
      srcUrl: e.source_url ?? undefined,
      status: e.status as TimelineEvent["status"],
    })),
    context: {
      updated: context?.updated_note || relativeTime(card.last_activity_at),
      explain: context?.explain ?? "",
      // Markers sit on the 30-day trend, and there is no trend until the
      // snapshot job runs. An empty list draws nothing, which is the honest
      // rendering of "not measured yet".
      markers: [],
    },
    myVote: (mine as { vote: string; body: string } | null)
      ? {
          vote: (mine as { vote: string }).vote as Sentiment,
          body: (mine as { body: string }).body,
        }
      : null,
    myFacetAnswers: answers,
  };
}

/* ------------------------------------------------------------------ helpers */

interface OpinionRow {
  id: string;
  author_id: string;
  vote: string;
  body: string;
  format: string;
  author_line: string | null;
  verified_label: string | null;
  helpful_count: number;
  reply_count: number;
  created_at: string;
  profiles: { display_name: string; initials: string } | { display_name: string; initials: string }[] | null;
}

interface TimelineRow {
  id: string;
  occurred_on: string;
  title: string;
  description: string;
  source_name: string;
  source_url: string | null;
  status: string;
}

function toOpinion(row: OpinionRow, topicSlug: string): Opinion {
  const author = one<{ display_name: string; initials: string }>(row.profiles);
  return {
    id: row.id,
    authorId: row.author_id,
    topicId: topicSlug,
    name: author?.display_name ?? "A participant",
    initials: author?.initials ?? "?",
    vote: row.vote as Sentiment,
    text: row.body,
    time: relativeTime(row.created_at),
    helpful: row.helpful_count,
    replies: row.reply_count,
    format: row.format === "pro" ? "pro" : "standard",
    authorLine: row.author_line ?? undefined,
    verifiedLabel: row.verified_label ?? undefined,
  };
}

/** PostgREST returns a one-to-one embed as an object or a 1-length array. */
function one<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}
