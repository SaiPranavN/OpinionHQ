import { describe, expect, it } from "vitest";

import { decorate } from "@/lib/derive";
import { getTopic } from "@/lib/topics";
import { buildTopicReport, reportFilename } from "@/lib/export/topic-report";
import { TOPICS } from "@/lib/sample-data/topics";
import { DEFAULT_CONTEXT, contextFor, timelineFor } from "@/lib/sample-data/timeline";
import type { Topic } from "@/lib/types";

function inputFor(id: string) {
  const topic = getTopic(id)!;
  return { topic, context: contextFor(id), timeline: timelineFor(id) };
}

describe("PDF export", () => {
  it("produces a real PDF document", async () => {
    const doc = await buildTopicReport(inputFor("neet"));
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    const magic = String.fromCharCode(...bytes.slice(0, 5));
    expect(magic).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(4000);
  });

  it("paginates rather than overflowing a single page", async () => {
    const doc = await buildTopicReport(inputFor("neet"));
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it("names the file after the topic and the day it was generated", () => {
    const name = reportFilename(getTopic("neet")!);
    expect(name).toMatch(/^opinionhq-neet-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("builds for every fixture topic without throwing", async () => {
    for (const topic of TOPICS) {
      const doc = await buildTopicReport({
        topic: getTopic(topic.id)!,
        context: contextFor(topic.id),
        timeline: timelineFor(topic.id),
      });
      expect(doc.getNumberOfPages(), topic.id).toBeGreaterThan(0);
    }
  });

  it("handles a topic nobody has voted on", async () => {
    // The composer publishes topics in exactly this state.
    const fresh: Topic = {
      id: "fresh-topic",
      name: "A brand new topic",
      cat: "controversies",
      status: "Proposed",
      summary: "Just created, no votes yet.",
      about: "Published from the composer a moment ago.",
      tags: ["new"],
      aspects: [
        {
          id: "q",
          label: "A question",
          prompt: "Is this working?",
          options: [
            { id: "pos", label: "Yes", tone: "Positive" },
            { id: "neu", label: "Maybe", tone: "Neutral" },
            { id: "neg", label: "No", tone: "Negative" },
          ],
        },
      ],
      pos: 0,
      neu: 0,
      neg: 0,
      participants: 0,
      trend: 0,
      recency: 0,
      updated: "just now",
      change: { metric: "participation", value: 0, direction: "up" },
      createdBy: "Someone",
    };

    const doc = await buildTopicReport({
      topic: decorate(fresh),
      context: DEFAULT_CONTEXT,
      timeline: [],
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
});
