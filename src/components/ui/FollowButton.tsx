"use client";

/**
 * Follow, with the follower count always beside it.
 *
 * ALWAYS, INCLUDING ZERO. The first version rendered the number only when it
 * was above zero, which is the state every new topic is in — so the button
 * read "Follow" with nothing next to it and looked like a feature that had not
 * been wired up. A count of nought is a real answer to "how many people follow
 * this", and hiding it is how you make a working thing look broken.
 *
 * SELF-CONTAINED ON PURPOSE. It reads its own state on mount rather than
 * threading `followerCount` through the decorated types, the row mappers and
 * two page queries for one button. These pages are gated to signed-in readers,
 * so nothing here needs to be in the server HTML.
 *
 * The click moves the number immediately and then takes whatever the database
 * says. Optimism alone would be wrong — a refused insert returns zero rows and
 * no error, so a button that trusted its own guess would sit there reading
 * "Following" over a row that was never written.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { readFollowState, toggleFollow, type FollowKind, type FollowState } from "@/lib/follows";

export function FollowButton({ kind, id }: { kind: FollowKind; id: string }) {
  const { toast } = usePrototype();
  const router = useRouter();
  const [state, setState] = useState<FollowState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    readFollowState(kind, id).then((s) => {
      if (live) setState(s);
    });
    return () => {
      live = false;
    };
  }, [kind, id]);

  const onClick = useCallback(async () => {
    if (!state || busy) return;

    // Signed out cannot follow. These pages are gated, so this is the rare
    // case of a session expiring while the page is open — say so rather than
    // no-opping under the cursor.
    if (!state.signedIn) {
      // `router.push`, not `window.location.href`. A full document load throws
      // away the React tree and the Supabase client with it, to reach a route
      // this app already owns — and it is the slow way to do it. Next 16's
      // linter flags the assignment for exactly that reason.
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setBusy(true);
    const optimistic: FollowState = {
      ...state,
      following: !state.following,
      count: Math.max(state.count + (state.following ? -1 : 1), 0),
    };
    setState(optimistic);

    try {
      setState(await toggleFollow(kind, id, state.following));
    } catch (e) {
      // Put the number back rather than leaving a lie on screen, and say so.
      // A counter that silently springs back is the symptom that hid this bug
      // for a whole round of "it increments then resets".
      setState(state);
      toast(e instanceof Error ? e.message : "Could not save that follow.");
    } finally {
      setBusy(false);
    }
  }, [kind, id, state, busy, toast]);

  const following = state?.following ?? false;
  const count = state?.count ?? 0;
  const label = `${count} ${count === 1 ? "follower" : "followers"}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!state || busy}
      aria-pressed={following}
      aria-label={`${following ? "Unfollow" : "Follow"} — ${label}`}
      title={label}
      className="ohq-press inline-flex cursor-pointer items-center gap-2.5 rounded-full border px-[18px] py-[9px] text-[13px] font-medium whitespace-nowrap transition-[color,border-color,background] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 disabled:cursor-default"
      style={{
        color: following ? "#4ED27C" : "#D6D3CD",
        borderColor: following
          ? "rgba(29,185,84,0.45)"
          : "color-mix(in oklab, var(--color-veil) 16%, transparent)",
        background: following ? "rgba(29,185,84,0.10)" : "transparent",
        // Dimmed only until the first answer arrives. It never disappears, so
        // the action row does not reflow when the count lands.
        opacity: state ? 1 : 0.55,
      }}
    >
      <span aria-hidden className="text-[13px]">
        {following ? "✓" : "+"}
      </span>
      {following ? "Following" : "Follow"}
      <span
        aria-hidden
        className="rounded-full bg-veil/8 px-2 py-px font-mono text-[11px] tabular-nums text-dim"
      >
        {count}
      </span>
    </button>
  );
}
