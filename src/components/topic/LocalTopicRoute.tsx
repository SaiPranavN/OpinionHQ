"use client";

/**
 * Renders a topic that exists only in this browser — one published from the
 * composer. The fixture route falls through to this when a slug is not in the
 * editor-published set, so a participant-created topic has a real, linkable
 * dashboard rather than a 404.
 *
 * When topics live in Postgres this component disappears: the server route
 * finds them and this fallback is never reached.
 */

import Link from "next/link";

import { TopicDashboard } from "@/components/topic/TopicDashboard";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { decorate } from "@/lib/derive";
import { DEFAULT_CONTEXT } from "@/lib/sample-data/timeline";

export function LocalTopicRoute({ slug }: { slug: string }) {
  const { createdTopic, ready } = usePrototype();

  // Before hydration we cannot know whether this id exists locally; showing
  // "not found" first would flash the wrong answer.
  if (!ready) {
    return (
      <Wrapper>
        <p className="m-0 text-[14px] text-dim">Loading topic…</p>
      </Wrapper>
    );
  }

  const topic = createdTopic(slug);

  if (!topic) {
    return (
      <Wrapper>
        <h1 className="m-0 font-serif text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.05] text-cream-bright">
          No topic at this <em className="italic">address</em>
        </h1>
        <p className="m-0 max-w-[440px] text-[14px] leading-[1.6] font-light text-muted">
          It may have been published in a different browser — topics created
          in the prototype are stored locally and do not sync.
        </p>
        <Link
          href="/topics"
          className="rounded-full border border-white/16 px-5 py-2.5 text-[13.5px] text-soft transition-colors duration-300 hover:border-white/36"
        >
          Back to Explore
        </Link>
      </Wrapper>
    );
  }

  return (
    <TopicDashboard
      topic={decorate(topic)}
      context={{
        ...DEFAULT_CONTEXT,
        updated: "Published just now",
        explain: `Created in the prototype by ${topic.createdBy ?? "a participant"}. No verified developments have been published for it yet.`,
        markers: [],
      }}
      opinions={[]}
      timeline={[]}
    />
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
