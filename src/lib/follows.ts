"use client";

/**
 * Following a topic or a poll.
 *
 * The house pattern: the browser writes with the visitor's own session and the
 * row policies decide. `follow for yourself` / `unfollow for yourself` check
 * `auth.uid() = user_id`, so an account cannot follow on somebody else's
 * behalf however the request is shaped.
 *
 * THE COUNT IS NOT WRITTEN HERE. `follower_count` lives on the stats row and is
 * maintained by a trigger; no client has update privilege on it. A count the
 * browser could set is a count that means whatever the last caller wanted.
 *
 * Delete is used for unfollow rather than a toggle flag, so the primary key
 * `(subject_id, user_id)` does the deduplication. Two tabs racing produce a
 * duplicate-key error rather than two follows.
 */

import { supabaseBrowser } from "@/lib/supabase/client";

export type FollowKind = "topic" | "poll";

export interface FollowState {
  following: boolean;
  count: number;
  /** False when nobody is signed in — the button says so rather than failing. */
  signedIn: boolean;
}

/**
 * The two subjects are written out rather than looked up in a map.
 *
 * A `{ table, key }` lookup reads better and does not typecheck: the generated
 * types resolve the table to a union, and a column name then has to be valid
 * for every member of it — `poll_id` is not a column of `topic_follows`. Two
 * explicit branches keep the literals concrete, which is the whole point of
 * generating types from the schema.
 */

/** Reads the follower count, and whether this visitor is one of them. */
export async function readFollowState(
  kind: FollowKind,
  id: string,
): Promise<FollowState> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (kind === "topic") {
    const [countRow, mine] = await Promise.all([
      supabase.from("topic_stats").select("follower_count").eq("topic_id", id).maybeSingle(),
      user
        ? supabase
            .from("topic_follows")
            .select("topic_id")
            .eq("topic_id", id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return {
      count: Number(countRow.data?.follower_count ?? 0),
      following: Boolean(mine.data),
      signedIn: Boolean(user),
    };
  }

  const [countRow, mine] = await Promise.all([
    supabase.from("poll_stats").select("follower_count").eq("poll_id", id).maybeSingle(),
    user
      ? supabase
          .from("poll_follows")
          .select("poll_id")
          .eq("poll_id", id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    count: Number(countRow.data?.follower_count ?? 0),
    following: Boolean(mine.data),
    signedIn: Boolean(user),
  };
}

/**
 * Follows or unfollows, and reports what the row actually says afterwards.
 *
 * Returns the re-read state rather than the optimistic guess: a refused insert
 * comes back as zero rows and no error, so trusting the guess is how a button
 * ends up showing "Following" for a row that was never written.
 */
export async function toggleFollow(
  kind: FollowKind,
  id: string,
  currentlyFollowing: boolean,
): Promise<FollowState> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { following: false, count: 0, signedIn: false };

  if (kind === "topic") {
    if (currentlyFollowing) {
      await supabase.from("topic_follows").delete().eq("topic_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("topic_follows").insert({ topic_id: id, user_id: user.id });
    }
  } else if (currentlyFollowing) {
    await supabase.from("poll_follows").delete().eq("poll_id", id).eq("user_id", user.id);
  } else {
    await supabase.from("poll_follows").insert({ poll_id: id, user_id: user.id });
  }

  return readFollowState(kind, id);
}

/**
 * How many subjects this account follows, across topics and polls.
 *
 * For the activity dashboard, whose "Following" tally used to count an array
 * in this browser's localStorage — a number that was wrong on every other
 * device and became wrong everywhere once follows moved into Postgres.
 *
 * `head: true` with an exact count asks Postgres for the number and no rows.
 * The dashboard wants a tally, not a list, and fetching every row to call
 * `.length` on it is how a tally starts costing what a page costs.
 */
export async function readMyFollowCount(): Promise<number> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const [topics, polls] = await Promise.all([
    supabase
      .from("topic_follows")
      .select("topic_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("poll_follows")
      .select("poll_id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return (topics.count ?? 0) + (polls.count ?? 0);
}
