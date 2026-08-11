"use client";

/**
 * The poll composer, pointed at Postgres.
 *
 * This is the only route that renders it. There was a public `/polls/new`
 * alongside it once; authoring a poll is now an editorial act, so the catalog's
 * "Create a poll" invitation points here and is shown to editors only.
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
