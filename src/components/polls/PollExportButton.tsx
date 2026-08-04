"use client";

import { useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import type { DecoratedPoll, PollReason } from "@/lib/types";

/**
 * Downloads the poll result as a PDF. The generator is loaded on click so jsPDF
 * stays out of the initial bundle.
 */
export function PollExportButton({
  poll,
  reasons,
}: {
  poll: DecoratedPoll;
  reasons: PollReason[];
}) {
  const { toast } = usePrototype();
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (working) return;
    setWorking(true);
    try {
      const { exportPollReport } = await import("@/lib/export/poll-report");
      const filename = await exportPollReport({ poll, reasons });
      toast(`Downloaded ${filename}`);
    } catch (error) {
      console.error("Poll PDF export failed", error);
      toast("Could not build the PDF. Please try again.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={working}
      aria-label={`Download the result of "${poll.question}" as a PDF`}
      className="flex cursor-pointer items-center gap-2 rounded-full border border-veil/16 px-[18px] py-[9px] text-[13px] font-medium text-soft transition-[color,border-color] duration-300 outline-none hover:border-veil/40 hover:text-cream-bright focus-visible:ring-2 focus-visible:ring-poll/60 disabled:cursor-progress disabled:opacity-60"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v11" />
        <path d="m8 10.5 4 4 4-4" />
        <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
      </svg>
      {working ? "Preparing…" : "Export PDF"}
    </button>
  );
}
