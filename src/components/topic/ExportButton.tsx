"use client";

import { useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import type { DecoratedTopic, TopicContext, TimelineEvent } from "@/lib/types";

type State = "idle" | "working";

/**
 * Downloads the dashboard as a PDF. The generator is loaded on click so jsPDF
 * stays out of the initial bundle — nobody pays for it until they export.
 */
export function ExportButton({
  topic,
  context,
  timeline,
}: {
  topic: DecoratedTopic;
  context: TopicContext;
  timeline: TimelineEvent[];
}) {
  const { toast } = usePrototype();
  const [state, setState] = useState<State>("idle");

  const run = async () => {
    if (state === "working") return;
    setState("working");
    try {
      const { exportTopicReport } = await import("@/lib/export/topic-report");
      const filename = await exportTopicReport({ topic, context, timeline });
      toast(`Downloaded ${filename}`);
    } catch (error) {
      console.error("PDF export failed", error);
      toast("Could not build the PDF. Please try again.");
    } finally {
      setState("idle");
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "working"}
      aria-label={`Download ${topic.name} statistics as a PDF`}
      className="flex cursor-pointer items-center gap-2 rounded-full border border-white/16 px-[18px] py-[9px] text-[13px] font-medium text-soft transition-[color,border-color] duration-300 outline-none hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-positive/60 disabled:cursor-progress disabled:opacity-60"
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
      {state === "working" ? "Preparing…" : "Export PDF"}
    </button>
  );
}
