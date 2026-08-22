"use client";

/**
 * Deterministic local fixtures for the subject map, at stress scale.
 *
 * CLEARLY NOT DATA. Every value here is generated from a seeded PRNG and the
 * page that renders it 404s in production. Nothing imports from this file.
 */

import { useMemo, useState } from "react";

import { SubjectMap } from "@/components/subject-map/SubjectMap";
import { decorate } from "@/lib/derive";
import { decoratePoll } from "@/lib/derive-poll";
import {
  pollSubject,
  topicSubject,
  type MapSubject,
} from "@/lib/subject-map/subjects";
import { CATEGORIES } from "@/lib/taxonomy";
import type { Poll, PollOption, StatusId, Topic } from "@/lib/types";

/** mulberry32 — small, seeded, good enough for fixtures. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STATUSES: StatusId[] = ["Ongoing", "Live", "Upcoming", "Resolved", "Disputed"];
const WORDS =
  "metro corridor exam policy festival stadium startup budget census verdict monsoon highway tariff campus spectrum tribunal referendum".split(
    " ",
  );

function makeTopics(count: number, rand: () => number): MapSubject[] {
  const out: MapSubject[] = [];
  for (let i = 0; i < count; i++) {
    const participants = rand() < 0.06 ? 0 : Math.floor(rand() * 40_000) + 1;
    const pos = Math.floor(rand() * 101);
    const neg = Math.floor(rand() * (101 - pos));
    const neu = 100 - pos - neg;
    const nameLen = 2 + Math.floor(rand() * (rand() < 0.08 ? 14 : 5));
    const name = Array.from(
      { length: nameLen },
      () => WORDS[Math.floor(rand() * WORDS.length)],
    ).join(" ");
    const topic: Topic = {
      id: `dev-topic-${i}`,
      name: `Fixture ${i}: ${name}`,
      cat: CATEGORIES[Math.floor(rand() * CATEGORIES.length)]!.id,
      place: "india",
      status: STATUSES[Math.floor(rand() * STATUSES.length)]!,
      summary: "Generated stress-test record. Not a real subject.",
      about: "",
      tags: [],
      pos: participants === 0 ? 0 : pos,
      neu: participants === 0 ? 0 : neu,
      neg: participants === 0 ? 0 : neg,
      participants,
      trend: Math.floor(rand() * 100),
      recency: i,
      updated: "1h ago",
      createdAt: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString(),
      change: { metric: "participation", value: 1, direction: "up" },
    };
    out.push(topicSubject(decorate(topic)));
  }
  return out;
}

function makePolls(count: number, rand: () => number): MapSubject[] {
  const out: MapSubject[] = [];
  for (let i = 0; i < count; i++) {
    const optionCount = 2 + Math.floor(rand() * 3);
    const empty = rand() < 0.07;
    const options: PollOption[] = Array.from({ length: optionCount }, (_, j) => ({
      id: (["a", "b", "c", "d"] as const)[j]!,
      name: `Option ${String.fromCharCode(65 + j)}`,
      blurb: "",
      votes: empty ? 0 : Math.floor(rand() * 9000),
    }));
    const poll: Poll = {
      id: `dev-poll-${i}`,
      question: `Fixture question ${i}: ${WORDS[i % WORDS.length]} or ${WORDS[(i + 3) % WORDS.length]}?`,
      cat: CATEGORIES[Math.floor(rand() * CATEGORIES.length)]!.id,
      place: "india",
      status: "Live",
      summary: "Generated stress-test record. Not a real poll.",
      about: "",
      tags: [],
      options,
      closes: "Open-ended",
      trend: Math.floor(rand() * 100),
      recency: i,
      updated: "1h ago",
      createdAt: new Date(Date.UTC(2026, 2, 1) + i * 43_200_000).toISOString(),
    };
    out.push(pollSubject(decoratePoll(poll)));
  }
  return out;
}

const SIZES = [1, 2, 6, 40, 150, 400] as const;

export function DevSubjectMap() {
  const [size, setSize] = useState<number>(400);
  const [kind, setKind] = useState<"topic" | "poll">("topic");

  const subjects = useMemo(() => {
    const rand = prng(kind === "topic" ? 1337 : 4242);
    return kind === "topic" ? makeTopics(size, rand) : makePolls(size, rand);
  }, [size, kind]);

  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-24 pb-16">
      <h1 className="font-display text-2xl font-bold text-cream-bright">
        Subject map stress bench
      </h1>
      <p className="mt-1 text-[13px] text-muted">
        Deterministic generated fixtures — dev builds only, no production data.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {SIZES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSize(n)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] ${
              size === n
                ? "border-positive/50 bg-positive/12 text-positive-light"
                : "border-veil/12 text-muted"
            }`}
          >
            {n}
          </button>
        ))}
        <span className="mx-2 text-veil/25">|</span>
        {(["topic", "poll"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] ${
              kind === k
                ? "border-poll/50 bg-poll/12 text-poll-soft"
                : "border-veil/12 text-muted"
            }`}
          >
            {k}s
          </button>
        ))}
      </div>
      <div className="mt-5">
        <SubjectMap
          subjects={subjects}
          accent={kind === "topic" ? "positive" : "poll"}
          focusRequest={null}
          label={`Stress bench — ${subjects.length} generated ${kind}s`}
        />
      </div>
    </div>
  );
}
