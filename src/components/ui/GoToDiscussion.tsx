"use client";

/**
 * "Go to discussions" — the jump from the numbers to what people said.
 *
 * WHY IT WRITES A HASH RATHER THAN JUST SCROLLING. On a topic the discussion
 * lives behind a tab that `TopicTabs` owns, so a button that only scrolled
 * would land the reader on the Overview tab with the thread still hidden — the
 * right place on screen and the wrong content in it. Setting `#discussion`
 * lets that component switch itself, and has a second payoff: the URL now
 * carries the destination, so a link to `/topics/x#discussion` opens on the
 * thread for whoever it is sent to.
 *
 * Polls have no tabs; the same hash simply names the reasons column.
 */

import { useCallback } from "react";

export function GoToDiscussion({
  targetId = "discussion",
  label = "Go to discussions",
}: {
  targetId?: string;
  label?: string;
}) {
  const go = useCallback(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    // Written without a navigation so the page does not jump before the smooth
    // scroll starts, and so the back button is not filled with hash entries.
    // `TopicTabs` listens for this.
    if (window.location.hash !== `#${targetId}`) {
      window.history.replaceState(null, "", `#${targetId}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [targetId]);

  return (
    <button
      type="button"
      onClick={go}
      className="ohq-press inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-positive px-[18px] py-[9px] text-[13px] font-semibold whitespace-nowrap text-positive-ink transition-[background,box-shadow] duration-300 ease-ohq outline-none hover:bg-[#25CC61] hover:shadow-[0_10px_30px_-10px_rgba(29,185,84,0.55)] focus-visible:ring-2 focus-visible:ring-positive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
    >
      {label}
      <span aria-hidden className="font-mono text-[11px]">
        ↓
      </span>
    </button>
  );
}
