import { describe, expect, it } from "vitest";

import { decorate } from "@/lib/derive";
import {
  NEGATIVE_TOPIC,
  TEST_CONTEXT,
  TEST_TOPICS,
  testTimelineFor,
  testTopic,
} from "@/lib/test-support/fixtures";
import { buildTopicReport, reportFilename } from "@/lib/export/topic-report";
import type { Topic } from "@/lib/types";

function inputFor(id: string) {
  const topic = testTopic(id)!;
  return { topic, context: TEST_CONTEXT, timeline: testTimelineFor(id) };
}

describe("PDF export", () => {
  it("produces a real PDF document", async () => {
    const doc = await buildTopicReport(inputFor(NEGATIVE_TOPIC.id));
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    const magic = String.fromCharCode(...bytes.slice(0, 5));
    expect(magic).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(4000);
  });

  it("names the file after the topic and the day it was generated", () => {
    const name = reportFilename(testTopic(NEGATIVE_TOPIC.id)!);
    expect(name).toMatch(/^opinionhq-test-subject-alpha-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("builds for every fixture topic without throwing", async () => {
    for (const topic of TEST_TOPICS) {
      const doc = await buildTopicReport({
        topic: testTopic(topic.id)!,
        context: TEST_CONTEXT,
        timeline: testTimelineFor(topic.id),
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
    place: "india",
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
      context: TEST_CONTEXT,
      timeline: [],
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
});
