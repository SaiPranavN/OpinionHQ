import { describe, expect, it } from "vitest";

import {
  buildPollReport,
  pollReportFilename,
  REASONS_PER_OPTION,
  topReasonsBySide,
} from "@/lib/export/poll-report";
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

  it("keeps a column for every option, not just the winner", () => {
    const poll = getPoll("work-setup")!;
    const columns = topReasonsBySide(poll, reasonsFor(poll.id));
    expect(columns).toHaveLength(poll.options.length);
    expect(columns.map((c) => c.option.id)).toEqual(poll.options.map((o) => o.id));
    // Including the options that lost — that is the whole point of the change.
    for (const column of columns) {
      expect(column.reasons.length, column.option.name).toBeGreaterThan(0);
    }
  });

  it("ranks each column by endorsement, best first", () => {
    const poll = getPoll("wfh-office")!;
    for (const { reasons } of topReasonsBySide(poll, reasonsFor(poll.id))) {
      const helpful = reasons.map((r) => r.helpful);
      expect(helpful).toEqual([...helpful].sort((a, b) => b - a));
    }
  });

  it("caps each column at ten and reports what was left out", () => {
    const poll = getPoll("wfh-office")!;
    const all = reasonsFor(poll.id);
    const columns = topReasonsBySide(poll, all);
    expect(all.length).toBeGreaterThan(REASONS_PER_OPTION * poll.options.length);
    for (const column of columns) {
      expect(column.reasons.length).toBe(REASONS_PER_OPTION);
      expect(column.total).toBeGreaterThan(column.reasons.length);
    }
  });

  it("breaks ties by original order so two exports match", () => {
    const poll = getPoll("chai-coffee")!;
    const tied = reasonsFor(poll.id).map((r) => ({ ...r, helpful: 500 }));
    const once = topReasonsBySide(poll, tied);
    const twice = topReasonsBySide(poll, tied);
    expect(once.map((c) => c.reasons.map((r) => r.id))).toEqual(
      twice.map((c) => c.reasons.map((r) => r.id)),
    );
  });

  it("gives an option nobody wrote about an empty column rather than dropping it", () => {
    const poll = getPoll("chai-coffee")!;
    const onlyFirst = reasonsFor(poll.id).filter((r) => r.side === "a");
    const columns = topReasonsBySide(poll, onlyFirst);
    expect(columns).toHaveLength(poll.options.length);
    expect(columns[1]!.reasons).toEqual([]);
    expect(columns[1]!.total).toBe(0);
  });

  it("handles a poll nobody has voted on", async () => {
    // The composer publishes polls in exactly this state.
    const fresh: Poll = {
      id: "fresh-poll",
      question: "A or B?",
      cat: "other",
    place: "india",
      status: "Live",
      summary: "Just created, no votes yet.",
      about: "Published from the composer a moment ago.",
      tags: ["new"],
      options: [
        { id: "a", name: "A", blurb: "The first one.", votes: 0 },
        { id: "b", name: "B", blurb: "The second one.", votes: 0 },
      ],
      closes: "Open-ended",
      trend: 0,
      recency: 0,
      updated: "just now",
    };
    const doc = await buildPollReport({ poll: decoratePoll(fresh), reasons: [] });
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
});
