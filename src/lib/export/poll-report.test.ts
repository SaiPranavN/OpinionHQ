import { describe, expect, it } from "vitest";

import { buildPollReport, pollReportFilename } from "@/lib/export/poll-report";
import { allPolls, getPoll } from "@/lib/polls";
import { decoratePoll } from "@/lib/derive-poll";
import { reasonsFor } from "@/lib/sample-data/poll-reasons";
import type { Poll } from "@/lib/types";

describe("poll PDF export", () => {
  it("produces a real PDF document", async () => {
    const poll = getPoll("chai-coffee")!;
    const doc = await buildPollReport({ poll, reasons: reasonsFor(poll.id) });
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(4000);
  });

  it("names the file after the poll and the day it was generated", () => {
    expect(pollReportFilename(getPoll("chai-coffee")!)).toMatch(
      /^opinionhq-poll-chai-coffee-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it("builds for every fixture poll without throwing", async () => {
    for (const poll of allPolls()) {
      const doc = await buildPollReport({ poll, reasons: reasonsFor(poll.id) });
      expect(doc.getNumberOfPages(), poll.id).toBeGreaterThan(0);
    }
  });

  it("handles a poll nobody has voted on", async () => {
    // The composer publishes polls in exactly this state.
    const fresh: Poll = {
      id: "fresh-poll",
      question: "A or B?",
      cat: "other",
      status: "Live",
      summary: "Just created, no votes yet.",
      about: "Published from the composer a moment ago.",
      tags: ["new"],
      a: { id: "a", name: "A", blurb: "The first one.", votes: 0 },
      b: { id: "b", name: "B", blurb: "The second one.", votes: 0 },
      closes: "Open-ended",
      trend: 0,
      recency: 0,
      updated: "just now",
    };
    const doc = await buildPollReport({ poll: decoratePoll(fresh), reasons: [] });
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
});
