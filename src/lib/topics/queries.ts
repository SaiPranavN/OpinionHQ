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

import { topicCells, type AudienceCell, type TopicCellRow } from "@/lib/audience/cells";
import { decorate } from "@/lib/derive";
import { toMedia, type MediaRow } from "@/lib/media";
import type { ReadClient } from "@/lib/supabase/public";
import { supabaseServer } from "@/lib/supabase/server";
import {
  rowToTopic,
  rowsToAudience,
  rowsToFacets,
  relativeTime,
  type AspectRow,
  type AudienceRow,
  type TopicCardRow,
} from "@/lib/topics/rows";
import type {
  ContributionMedia,
  DecoratedTopic,
  InteractiveKind,
  Opinion,
  OpinionReply,
  ProSection,
  Sentiment,
  TimelineEvent,
  TopicContext,
} from "@/lib/types";

const CARD_COLUMNS =
  "id, slug, name, category_id, place_id, status, summary, tags, published_at, updated_at, " +
  "positive_count, neutral_count, negative_count, participants, written_count, " +
  "trend_score, last_activity_at, change_metric, change_value, change_direction, " +
  "suggested_by_name";

export async function listTopics(client?: ReadClient): Promise<DecoratedTopic[]> {
  // Defaults to the session-aware client; callers that must stay
  // cacheable pass the session-less one. See lib/supabase/public.ts.
  const supabase = client ?? ((await supabaseServer()) as unknown as ReadClient);
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

export interface TopicPage {
  topic: DecoratedTopic;
  /**
   * The joint demographic cross-tab, for the audience panel to filter on.
   *
   * Separate from `topic.geo` / `topic.ageGroups` / … , which are the same
   * measurement already collapsed to four independent summaries. Those still
   * feed the PDF export and anything that needs one static answer; this is what
   * a reader can push on.
   */
  audienceCells: AudienceCell[];
  opinions: Opinion[];
  /** Threaded replies, keyed by the opinion they hang under. */
  replies: Record<string, OpinionReply[]>;
  /** The viewer's own like/dislike on each reply. Empty when signed out. */
  myReplyVotes: Record<string, "like" | "dislike">;
  /**
   * The viewer's own like/dislike on each contribution. Empty when signed out.
   *
   * Fetched here rather than per card, for the same reason the replies are: a
   * discussion tab renders every opinion at once, and forty cards asking for
   * their own vote is forty requests.
   */
  myOpinionVotes: Record<string, "like" | "dislike">;
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

  const [
    { data: written },
    { data: events },
    { data: mine },
    { data: facetAnswers },
    { data: audienceRows },
    { data: cellRows },
    { data: optIn },
    { data: tallyRows },
    { data: seriesRows },
  ] = await Promise.all([
      // Written opinions only. A bare vote is a row here too, and listing them
      // would fill the discussion with empty cards.
      //
      // THROUGH `opinion_feed`, NOT `opinions`. The view is the only read path
      // clients have, and it is what strips the author from an anonymous row —
      // name, initials, occupation and account id — before any of it reaches
      // this process. The author still gets their own id back, so the card can
      // be marked as theirs. See the anonymous-contributions migration.
      supabase
        .from("opinion_feed")
        .select(
          "id, author_id, anonymous, display_name, initials, vote, body, format, " +
            "author_line, verified_label, helpful_count, dislike_count, reply_count, " +
            "edit_count, created_at, edited_at",
        )
        .eq("topic_id", topicId)
        .neq("body", "")
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
            .from("opinion_feed")
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
      // The measured cross-tabs, the opt-in share, and what people actually
      // answered. All three replaced generators — see the note on
      // `facetResults` in lib/derive.ts.
      supabase.rpc("topic_audience", { target: topicId }),
      // The same measurement, undecomposed: one row per distinct demographic
      // combination rather than four independent summaries. It is what lets the
      // cross-tabs filter each other — see lib/audience/cells.ts — and it is a
      // separate call rather than a replacement because the summaries above
      // still feed the export and the KPI strip.
      supabase.rpc("topic_audience_cells", { target: topicId }),
      supabase.rpc("topic_demographic_opt_in", { target: topicId }),
      supabase.rpc("aspect_tallies", { target: topicId }),
      // Per-day participation and sentiment, counted from opinions.created_at.
      // No scheduled job behind it — the timestamps are already there.
      supabase.rpc("topic_daily_series", { target: topicId }),
    ]);

  const answers: Record<string, string> = {};
  for (const answer of (facetAnswers as { aspect_id: string; option_id: string }[] | null) ?? []) {
    answers[answer.aspect_id] = answer.option_id;
  }

  const facetTallies: Record<string, Record<string, number>> = {};
  for (const row of (tallyRows as { aspect_id: string; option_id: string; responses: number }[] | null) ?? []) {
    (facetTallies[row.aspect_id] ??= {})[row.option_id] = Number(row.responses);
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
  const [{ data: replyRows }, { data: voteRows }, { data: opinionVoteRows }] =
    await Promise.all([
    opinionIds.length > 0
      ? supabase
          .from("opinion_reply_feed")
          .select(
            "id, opinion_id, parent_id, author_id, anonymous, display_name, initials, " +
              "body, likes, dislikes, created_at",
          )
          .in("opinion_id", opinionIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null }),
    uid && opinionIds.length > 0
      ? supabase.from("opinion_reply_votes").select("reply_id, vote")
      : Promise.resolve({ data: null }),
    uid
      ? supabase.rpc("my_opinion_votes", { topic: topicId })
      : Promise.resolve({ data: null }),
  ]);

  await attachRichParts(supabase, opinions);

  const replies: Record<string, OpinionReply[]> = {};
  for (const r of (replyRows as ReplyRow[] | null) ?? []) {
    const hidden = Boolean(r.anonymous);
    (replies[r.opinion_id] ??= []).push({
      id: r.id,
      parentId: r.parent_id,
      authorId: r.author_id ?? "",
      authorName: hidden ? ANONYMOUS_NAME : (r.display_name ?? "A participant"),
      authorInitials: hidden ? "··" : (r.initials ?? "··"),
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

  const myOpinionVotes: Record<string, "like" | "dislike"> = {};
  for (const v of (opinionVoteRows as { opinion_id: string; vote: string }[] | null) ?? []) {
    myOpinionVotes[v.opinion_id] = v.vote === "dislike" ? "dislike" : "like";
  }

  return {
    topic: decorate(
      rowToTopic(card, {
        about: (row.about as string) ?? "",
        aspects,
        audience: rowsToAudience((audienceRows as AudienceRow[] | null) ?? []),
        demographicOptIn: Number(optIn ?? 0),
        facetTallies,
        series: (
          (seriesRows as
            | { cast_on: string; votes: number; positive: number; neutral: number; negative: number }[]
            | null) ?? []
        ).map((row) => ({
          date: row.cast_on,
          votes: Number(row.votes),
          positive: Number(row.positive),
          neutral: Number(row.neutral),
          negative: Number(row.negative),
        })),
      }),
    ),
    audienceCells: topicCells((cellRows as TopicCellRow[] | null) ?? []),
    opinions,
    replies,
    myReplyVotes,
    myOpinionVotes,
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
  /** Null when the row is anonymous and the reader is not its author. */
  author_id: string | null;
  anonymous: boolean;
  display_name: string | null;
  initials: string | null;
  vote: string;
  body: string;
  format: string;
  author_line: string | null;
  verified_label: string | null;
  helpful_count: number;
  dislike_count: number;
  reply_count: number;
  edit_count: number;
  created_at: string;
  edited_at: string | null;
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

/**
 * The name shown on an anonymous card.
 *
 * A single fixed string, never "Anonymous 1" or a per-topic pseudonym. Stable
 * pseudonyms are the classic mistake: two posts under "Anonymous Otter" on
 * different topics are linkable, and a handful of linked posts is usually
 * enough to work out who somebody is.
 */
const ANONYMOUS_NAME = "Anonymous";

function toOpinion(row: OpinionRow, topicSlug: string): Opinion {
  const anonymous = Boolean(row.anonymous);
  return {
    id: row.id,
    authorId: row.author_id ?? undefined,
    topicId: topicSlug,
    name: anonymous ? ANONYMOUS_NAME : (row.display_name ?? "A participant"),
    initials: anonymous ? "··" : (row.initials ?? "?"),
    vote: row.vote as Sentiment,
    text: row.body,
    time: relativeTime(row.created_at),
    createdAt: row.created_at,
    editedAt: row.edited_at,
    helpful: row.helpful_count,
    replies: row.reply_count,
    format: row.format === "pro" ? "pro" : "standard",
    // Already null from the view when anonymous. Re-checked here only so a
    // future column added to the view without the mask cannot leak through
    // this mapper unnoticed.
    authorLine: anonymous ? undefined : (row.author_line ?? undefined),
    verifiedLabel: anonymous ? undefined : (row.verified_label ?? undefined),
    anonymous,
    dislikes: row.dislike_count,
    edits: row.edit_count,
  };
}

/** PostgREST returns a one-to-one embed as an object or a 1-length array. */
function one<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

/* --------------------------------------------------- rich contributions */

interface SectionRow {
  id: string;
  opinion_id: string;
  type: string;
  position: number;
  body: string | null;
  points: string[] | null;
  interactive_blocks:
    | { id: string; kind: string; prompt: string; interactive_options: OptionRow[] }
    | { id: string; kind: string; prompt: string; interactive_options: OptionRow[] }[]
    | null;
}

interface OptionRow {
  id: string;
  label: string;
  position: number;
}

/**
 * Loads sections, blocks and pictures onto the contributions that have them.
 *
 * ONLY FOR `format === "pro"` ROWS. A topic where nobody has published a rich
 * contribution does no extra work at all, which is most of them — and the two
 * queries are `in (…)` over the ids rather than one per card, because a
 * discussion tab renders every opinion at once and forty cards must not become
 * forty requests.
 *
 * Mutates the array it is given. Slightly impure, and the alternative is
 * rebuilding every opinion object to attach two optional fields.
 */
async function attachRichParts(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  opinions: Opinion[],
): Promise<void> {
  const rich = opinions.filter((o) => o.format === "pro");
  if (rich.length === 0) return;
  const ids = rich.map((o) => o.id);

  const [{ data: sectionRows }, { data: mediaRows }] = await Promise.all([
    supabase
      .from("opinion_sections")
      .select(
        "id, opinion_id, type, position, body, points, " +
          "interactive_blocks(id, kind, prompt, interactive_options(id, label, position))",
      )
      .in("opinion_id", ids)
      .order("position", { ascending: true }),
    supabase
      .from("contribution_media")
      .select("id, opinion_id, storage_path, kind, alt, width, height")
      .in("opinion_id", ids)
      .order("position", { ascending: true }),
  ]);

  // The response counts on each block, one call per block. There is no bulk
  // form of `block_tallies`, and there is rarely more than one block on a page —
  // if that stops being true this becomes a single grouped function.
  const blockIds: string[] = [];
  for (const row of (sectionRows as unknown as SectionRow[] | null) ?? []) {
    const block = one<{ id: string }>(row.interactive_blocks);
    if (block) blockIds.push(block.id);
  }

  const tallies: Record<string, Record<string, number>> = {};
  await Promise.all(
    blockIds.map(async (blockId) => {
      const { data } = await supabase.rpc("block_tallies", { target: blockId });
      const counts: Record<string, number> = {};
      for (const row of (data as { option_id: string; responses: number }[] | null) ?? []) {
        counts[row.option_id] = Number(row.responses);
      }
      tallies[blockId] = counts;
    }),
  );

  const sections: Record<string, ProSection[]> = {};
  for (const row of (sectionRows as unknown as SectionRow[] | null) ?? []) {
    const list = (sections[row.opinion_id] ??= []);
    if (row.type === "key_points") {
      list.push({ id: row.id, type: "key_points", position: row.position, points: row.points ?? [] });
      continue;
    }
    if (row.type === "interactive") {
      const block = one<{
        id: string;
        kind: string;
        prompt: string;
        interactive_options: OptionRow[];
      }>(row.interactive_blocks);
      // A section typed `interactive` with no block row is a half-written
      // contribution. Dropping it beats rendering an empty prompt box.
      if (!block) continue;
      const counts = tallies[block.id] ?? {};
      list.push({
        id: row.id,
        type: "interactive",
        position: row.position,
        block: {
          id: block.id,
          kind: block.kind as InteractiveKind,
          prompt: block.prompt,
          options: [...(block.interactive_options ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((option) => ({
              id: option.id,
              label: option.label,
              count: counts[option.id] ?? 0,
            })),
        },
      });
      continue;
    }
    list.push({
      id: row.id,
      type: row.type as "headline" | "quick_take" | "breakdown" | "final_verdict",
      position: row.position,
      text: row.body ?? "",
    });
  }

  const media: Record<string, ContributionMedia[]> = {};
  for (const row of (mediaRows as MediaRow[] | null) ?? []) {
    if (!row.opinion_id) continue;
    (media[row.opinion_id] ??= []).push(toMedia(row));
  }

  for (const opinion of rich) {
    opinion.sections = sections[opinion.id] ?? [];
    const pictures = media[opinion.id];
    if (pictures) opinion.media = pictures;
  }
}
