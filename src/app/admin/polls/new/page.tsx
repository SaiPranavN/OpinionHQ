"use client";

/**
 * The same composer `/polls/new` renders, pointed at Postgres.
 *
 * Nothing about the flow, the validation or the duplicate check is restated
 * here — that was the point of giving the composer a publisher rather than
 * writing a second one for the admin. The only thing this file decides is where
 * a finished poll goes and where the editor lands afterwards.
 */

import { PollComposer, type PollPublisher } from "@/components/create/PollComposer";
import { authorPoll, isSlugFree } from "@/lib/admin/polls";

const publisher: PollPublisher = {
  publish: authorPoll,
  isSlugFree,
  // Back to the desk, not to the public page. A freshly published poll has no
  // votes on it, so its page is an empty split — and the editor's next action is
  // almost always the next poll.
  destination: () => "/admin/polls",
  allowDraft: true,
};

export default function NewPollPage() {
  return <PollComposer publisher={publisher} />;
}
