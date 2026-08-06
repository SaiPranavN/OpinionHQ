"use client";

/**
 * Renders a poll that exists only in this browser — one published from the
 * composer. The fixture route falls through to this when a slug is not in the
 * editor-published set, so a participant-created poll gets a real, linkable
 * page rather than a 404.
 */

import Link from "next/link";

import { PollAudience } from "@/components/polls/PollAudience";
import { PollHeader } from "@/components/polls/PollHeader";
import { PollReasons } from "@/components/polls/PollReasons";
import { PollVotePanel } from "@/components/polls/PollVotePanel";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { decoratePoll } from "@/lib/derive-poll";

export function LocalPollRoute({ slug }: { slug: string }) {
  const { createdPoll, ready } = usePrototype();

  // Before hydration we cannot know whether this id exists locally; claiming
  // "not found" first would flash the wrong answer.
  if (!ready) {
    return (
      <Wrapper>
        <p className="m-0 text-[14px] text-dim">Loading poll…</p>
      </Wrapper>
    );
  }

  const poll = createdPoll(slug);

  if (!poll) {
    return (
      <Wrapper>
        <h1 className="m-0 font-display font-bold text-[clamp(1.8rem,3.6vw,2.8rem)] tracking-[-0.02em] leading-[1.05] text-cream-bright">
          No poll at this <em className="italic">address</em>
        </h1>
        <p className="m-0 max-w-[440px] text-[14px] leading-[1.6] font-light text-muted">
          It may have been published in a different browser — polls created in
          the prototype are stored locally and do not sync.
        </p>
        <Link
          href="/polls"
          className="rounded-full border border-veil/16 px-5 py-2.5 text-[13.5px] text-soft transition-colors duration-300 hover:border-veil/36"
        >
          Back to polls
        </Link>
      </Wrapper>
    );
  }

  const decorated = decoratePoll(poll);

  return (
    <div
      className="mx-auto flex max-w-[1320px] flex-col gap-[clamp(26px,3.4vw,44px)] px-4 pb-[clamp(70px,9vw,120px)] sm:px-8 lg:px-14"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + 18px)" }}
    >
      <PollHeader poll={decorated} />
      <PollAudience poll={decorated} />
      <PollVotePanel poll={decorated} />
      <PollReasons poll={decorated} reasons={[]} />
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto flex max-w-[1320px] flex-col items-center gap-4 px-4 pb-[clamp(70px,9vw,120px)] text-center sm:px-8"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + 60px)" }}
    >
      {children}
    </div>
  );
}
