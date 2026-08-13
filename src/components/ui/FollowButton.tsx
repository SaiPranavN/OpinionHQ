"use client";

/**
 * Follow, with the count beside it.
 *
 * SELF-CONTAINED ON PURPOSE. It reads its own state on mount rather than having
 * `followerCount` threaded through the decorated types, the row mappers and two
 * page queries for one button. These pages are already gated to signed-in
 * readers, so nothing here needs to be in the server HTML.
 *
 * The count is what the database says after the write, not what the click
 * assumed. A refused insert returns zero rows and no error — an optimistic
 * button would sit there reading "Following" over a row that does not exist.
 */

import { useCallback, useEffect, useState } from "react";

import { readFollowState, toggleFollow, type FollowKind, type FollowState } from "@/lib/follows";

export function FollowButton({ kind, id }: { kind: FollowKind; id: string }) {
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
    setBusy(true);
    try {
      setState(await toggleFollow(kind, id, state.following));
    } finally {
      setBusy(false);
    }
  }, [kind, id, state, busy]);

  // Renders at its final size before the answer arrives, so the action row does
  // not jump once the count lands.
  const following = state?.following ?? false;
  const count = state?.count ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!state || busy}
      aria-pressed={following}
      aria-label={following ? "Unfollow" : "Follow"}
      className="ohq-press inline-flex cursor-pointer items-center gap-2 rounded-full border px-[18px] py-[9px] text-[13px] font-medium whitespace-nowrap transition-[color,border-color,background] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 disabled:cursor-default"
      style={{
        color: following ? "#4ED27C" : "#D6D3CD",
        borderColor: following
          ? "rgba(29,185,84,0.45)"
          : "color-mix(in oklab, var(--color-veil) 16%, transparent)",
        background: following ? "rgba(29,185,84,0.10)" : "transparent",
        opacity: state ? 1 : 0.55,
      }}
    >
      {following ? "Following" : "Follow"}
      {count > 0 ? (
        <span className="font-mono text-[11px] text-dim tabular-nums">{count}</span>
      ) : null}
    </button>
  );
}
