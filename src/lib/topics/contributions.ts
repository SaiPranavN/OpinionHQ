"use client";

/**
 * Rich contributions, in the database.
 *
 * THEY USED TO LIVE IN LOCALSTORAGE. Somebody would spend twenty minutes on a
 * structured argument, publish it, and it existed on that one browser until the
 * cache was cleared. Nobody else could read it. That was defensible while the
 * whole product was a prototype and indefensible the day real people started
 * writing in it.
 *
 * The write is one call. `publish_contribution` inserts the opinion, its
 * sections, the interactive block, that block's options and the media rows in a
 * single transaction — five round trips from a browser with no transaction
 * around them would happily leave a published contribution missing half its
 * argument, with no way for the author to tell.
 */

import { MEDIA_BUCKET, MEDIA_MAX_BYTES, MEDIA_TYPES } from "@/lib/media";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { InteractiveBlock, ProSection, Sentiment } from "@/lib/types";

export interface MediaDraft {
  path: string;
  kind: "image" | "gif";
  alt: string;
  width: number | null;
  height: number | null;
}

/**
 * The composer's sections, in the shape `publish_contribution` reads.
 *
 * A deliberate translation rather than sending the component's state straight
 * across. The composer carries client-side ids on every section, option and
 * block so React can key them; those ids mean nothing to Postgres, which mints
 * its own, and shipping them would invite somebody later to assume they round
 * trip.
 */
function toPayload(sections: ProSection[]): unknown[] {
  return sections.map((section, position) => {
    if (section.type === "key_points") {
      return { type: section.type, position, points: section.points };
    }
    if (section.type === "interactive") {
      const block: InteractiveBlock = section.block;
      return {
        type: section.type,
        position,
        block: {
          kind: block.kind,
          prompt: block.prompt,
          options: block.options.map((option, i) => ({
            label: option.label,
            position: i,
          })),
        },
      };
    }
    return { type: section.type, position, text: section.text };
  });
}

/**
 * Publishes, replacing whatever this account had on this topic.
 *
 * `opinions` is unique on `(topic_id, author_id)` — the constraint behind one
 * account one vote — so a person has one contribution per topic and publishing
 * again rewrites it. The localStorage version stacked them up, which was only
 * possible because nothing was enforcing anything.
 *
 * Throws with the database's own message. Those are written for a reader
 * ("a contribution needs a headline of at least 8 characters") and replacing
 * them with something generic here would discard the only explanation there is.
 */
export async function publishContribution(
  topicSlug: string,
  vote: Sentiment,
  sections: ProSection[],
  anonymous: boolean,
  media: MediaDraft[] = [],
): Promise<string> {
  const { data, error } = await supabaseBrowser().rpc("publish_contribution", {
    topic_slug: topicSlug,
    vote,
    sections: toPayload(sections) as never,
    anonymous,
    media: media.map((m) => ({
      path: m.path,
      kind: m.kind,
      alt: m.alt,
      width: m.width,
      height: m.height,
    })) as never,
  });

  if (error) throw new Error(error.message);
  return data as unknown as string;
}

/**
 * Takes the rich form off, and leaves the opinion.
 *
 * Not a delete. Somebody withdrawing an essay usually wants the essay gone, not
 * their vote — and silently removing a vote would move the topic's headline
 * number for a reason the person never asked for.
 */
export async function unpublishContribution(topicSlug: string): Promise<boolean> {
  const { data, error } = await supabaseBrowser().rpc("unpublish_contribution", {
    topic_slug: topicSlug,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/* -------------------------------------------------------------------- media */

/**
 * Uploads one file and returns its storage path.
 *
 * THE PATH CONTAINS NO ACCOUNT ID, which is the opposite of the usual
 * `<uid>/<file>` convention and is the whole reason this function exists rather
 * than the call being inlined. A URL is public markup; `…/contributions/<uid>/
 * cat.gif` sitting under an anonymous contribution hands over exactly the
 * identifier the feed view goes to such lengths to withhold. Ownership is
 * enforced by `storage.objects.owner`, which Supabase fills in and no client
 * can set.
 */
export async function uploadMedia(file: File): Promise<MediaDraft> {
  if (!MEDIA_TYPES.includes(file.type)) {
    throw new Error("Images and GIFs only — PNG, JPEG, WebP or GIF.");
  }
  if (file.size > MEDIA_MAX_BYTES) {
    throw new Error("That file is over 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `c/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseBrowser()
    .storage.from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const size = await measure(file);
  return {
    path,
    kind: file.type === "image/gif" ? "gif" : "image",
    alt: "",
    width: size?.width ?? null,
    height: size?.height ?? null,
  };
}

/**
 * Reads the pixel dimensions, so the card can reserve the right space.
 *
 * Without them every image lands at an unknown height and the whole feed jumps
 * as each one decodes. Failure is not an error — an unmeasurable file still
 * uploads, it just gets a default box.
 */
function measure(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Attaches media to a poll reason, which has no rich composer to carry it. */
export async function attachReasonMedia(
  pollReasonId: string,
  media: MediaDraft[],
): Promise<void> {
  if (media.length === 0) return;
  const { error } = await supabaseBrowser()
    .from("contribution_media")
    .insert(
      media.map((m, position) => ({
        poll_reason_id: pollReasonId,
        storage_path: m.path,
        kind: m.kind,
        alt: m.alt,
        width: m.width,
        height: m.height,
        position,
      })),
    );
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------ my contributions */

export interface MyContribution {
  id: string;
  topicSlug: string;
  topicName: string;
  headline: string;
  vote: string;
  helpful: number;
  sections: number;
  anonymous: boolean;
}

/**
 * This account's rich contributions, for the activity dashboard.
 *
 * Reads what the server has rather than an array this browser was keeping,
 * which is the whole point of the move: the old list was per-device, so the
 * dashboard on a phone showed nothing for work published on a laptop.
 *
 * Three queries rather than one join, because `opinion_feed` carries `topic_id`
 * and the dashboard needs the slug to link. A `topic_slug` column on the view
 * would collapse this to one, and is not worth a migration for a panel that
 * renders a handful of rows.
 */
export async function readMyContributions(): Promise<MyContribution[]> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("opinion_feed")
    .select("id, topic_id, body, vote, helpful_count, anonymous")
    .eq("author_id", user.id)
    .eq("format", "pro")
    .order("created_at", { ascending: false });

  const mine = (rows ?? []) as {
    id: string;
    topic_id: string;
    body: string;
    vote: string;
    helpful_count: number;
    anonymous: boolean;
  }[];
  if (mine.length === 0) return [];

  const [{ data: topics }, { data: sections }] = await Promise.all([
    supabase.from("topics").select("id, slug, name").in("id", mine.map((m) => m.topic_id)),
    supabase.from("opinion_sections").select("opinion_id").in("opinion_id", mine.map((m) => m.id)),
  ]);

  const byTopic = new Map(
    ((topics ?? []) as { id: string; slug: string; name: string }[]).map((t) => [t.id, t]),
  );
  const counts = new Map<string, number>();
  for (const s of ((sections ?? []) as { opinion_id: string }[])) {
    counts.set(s.opinion_id, (counts.get(s.opinion_id) ?? 0) + 1);
  }

  return mine.map((row) => {
    const topic = byTopic.get(row.topic_id);
    return {
      id: row.id,
      topicSlug: topic?.slug ?? "",
      topicName: topic?.name ?? "A topic",
      // The headline is stored as the opinion body — see `publish_contribution`.
      headline: row.body,
      vote: row.vote,
      helpful: row.helpful_count,
      sections: counts.get(row.id) ?? 0,
      anonymous: Boolean(row.anonymous),
    };
  });
}

/** Clears this account's existing pictures on a reason before re-attaching. */
export async function clearReasonMedia(pollReasonId: string): Promise<void> {
  await supabaseBrowser()
    .from("contribution_media")
    .delete()
    .eq("poll_reason_id", pollReasonId);
}

