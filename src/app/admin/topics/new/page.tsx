"use client";

/**
 * The same composer `/topics/new` renders, pointed at Postgres.
 *
 * Nothing about the flow, the validation or the aspect rules is restated here —
 * that was the point of giving the composer a publisher rather than writing a
 * second one for the admin. The only thing this file decides is where a finished
 * topic goes and where the editor lands afterwards.
 */

import { TopicComposer, type TopicPublisher } from "@/components/create/TopicComposer";
import { authorTopic, isSlugFree } from "@/lib/admin/topics";

const publisher: TopicPublisher = {
  publish: authorTopic,
  isSlugFree,
  // Back to the desk, not to the public page. A freshly published topic has no
  // votes on it, so its dashboard is a screen of zeroes — and the editor's next
  // action is almost always the next topic.
  destination: () => "/admin/topics",
  allowDraft: true,
};

export default function NewTopicPage() {
  return <TopicComposer publisher={publisher} />;
}
