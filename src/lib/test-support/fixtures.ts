/**
 * TEST DATA. NOT PRODUCT DATA. Never import this from `src/app` or
 * `src/components`.
 *
 * `src/lib/sample-data` used to hold thirty topics, twenty-two polls and
 * several hundred opinions, and the product read from it — the catalog, the
 * landing page counters, the audience panels. That is why it is gone: a
 * visitor had no way to tell a measured number from an authored one, and once
 * one invented figure is on screen the real ones stop meaning anything.
 *
 * The pure functions still need something to chew on, though. A largest-
 * remainder rounding bug does not care whether the percentages came from
 * Postgres. So this is a deliberately small, obviously-synthetic set: enough
 * shapes to exercise the edges (unvoted, dead heat, two/three/four options,
 * a topic with aspects and one without) and not one row more.
 *
 * The names are nonsense on purpose. If a fixture ever leaks into the product
 * again, "Test Subject Alpha" on a live page is a bug report rather than a
 * plausible-looking topic nobody notices.
 */

import { decorate } from "@/lib/derive";
import { decoratePoll } from "@/lib/derive-poll";
import type {
  DecoratedPoll,
  DecoratedTopic,
  Facet,
  Opinion,
  Poll,
  PollReason,
  TimelineEvent,
  Topic,
  TopicContext,
} from "@/lib/types";

const ASPECTS: Facet[] = [
  {
    id: "worth-it",
    label: "Worth it",
    prompt: "Was it worth what it cost?",
    options: [
      { id: "yes", label: "Clearly yes", tone: "Positive" },
      { id: "even", label: "About even", tone: "Neutral" },
      { id: "no", label: "Clearly not", tone: "Negative" },
    ],
  },
  {
    id: "again",
    label: "Again",
    prompt: "Would you do it again?",
    options: [
      { id: "would", label: "Would", tone: "Positive" },
      { id: "unsure", label: "Not sure", tone: "Neutral" },
      { id: "wouldnt", label: "Would not", tone: "Negative" },
    ],
  },
];

/** A topic with a clear negative lead, votes, and its own aspects. */
export const NEGATIVE_TOPIC: Topic = {
  id: "test-subject-alpha",
  name: "Test Subject Alpha",
  cat: "technology",
  place: "india",
  status: "Live",
  aspects: ASPECTS,
  summary: "A synthetic topic used only by the test suite.",
  about: "Longer synthetic context.",
  tags: ["test"],
  pos: 18,
  neu: 24,
  neg: 58,
  participants: 1200,
  written: 40,
  trend: 70,
  recency: 1,
  updated: "1h ago",
  change: { metric: "negative-sentiment", value: 6.2, direction: "up" },
};

/** Positive lead, different category, no topic-specific aspects. */
export const POSITIVE_TOPIC: Topic = {
  ...NEGATIVE_TOPIC,
  id: "test-subject-beta",
  name: "Test Subject Beta",
  cat: "entertainment",
  aspects: undefined,
  facetSet: "film",
  pos: 71,
  neu: 17,
  neg: 12,
  participants: 640,
  written: 22,
  change: { metric: "positive-sentiment", value: 3.1, direction: "up" },
};

/** Nobody has voted. Every headline string reads differently here. */
export const UNVOTED_TOPIC: Topic = {
  ...NEGATIVE_TOPIC,
  id: "test-subject-gamma",
  name: "Test Subject Gamma",
  cat: "exams",
  pos: 0,
  neu: 0,
  neg: 0,
  participants: 0,
  written: 0,
  trend: 0,
  change: { metric: "participation", value: 0, direction: "up" },
};

/** Exactly even between the poles — must not be reported as a winner. */
export const SPLIT_TOPIC: Topic = {
  ...NEGATIVE_TOPIC,
  id: "test-subject-delta",
  name: "Test Subject Delta",
  cat: "policies",
  pos: 45,
  neu: 10,
  neg: 45,
  participants: 900,
  written: 30,
};

/** Placed in a city, so the place-containment tests have something to reach. */
export const CITY_TOPIC: Topic = {
  ...NEGATIVE_TOPIC,
  id: "test-subject-epsilon",
  name: "Test Subject Epsilon",
  cat: "places",
  place: "bengaluru",
  participants: 300,
  written: 8,
};

export const TEST_TOPICS: Topic[] = [
  CITY_TOPIC,
  NEGATIVE_TOPIC,
  POSITIVE_TOPIC,
  UNVOTED_TOPIC,
  SPLIT_TOPIC,
];

export const TEST_OPINIONS: Opinion[] = [
  {
    id: "op-1",
    topicId: NEGATIVE_TOPIC.id,
    authorId: "user-1",
    name: "Tester One",
    initials: "T1",
    vote: "Negative",
    text: "A synthetic written opinion, long enough to render.",
    time: "2h ago",
    helpful: 4,
    replies: 0,
  },
  {
    id: "op-2",
    topicId: NEGATIVE_TOPIC.id,
    authorId: "user-2",
    name: "Tester Two",
    initials: "T2",
    vote: "Positive",
    text: "A second synthetic opinion taking the other side.",
    time: "3h ago",
    helpful: 1,
    replies: 0,
  },
];

export const TEST_TIMELINE: TimelineEvent[] = [
  {
    id: "ev-1",
    topicId: NEGATIVE_TOPIC.id,
    date: "2026-01-15",
    title: "Something verifiable happened",
    desc: "A synthetic development.",
    src: "Test Source",
    status: "Confirmed",
  },
];

export const TEST_CONTEXT: TopicContext = {
  updated: "Updated 1h ago",
  explain: "Synthetic context for the test suite.",
  markers: [],
};

/* ------------------------------------------------------------------ polls */

/** Two options, a clear lead. */
export const TWO_OPTION_POLL: Poll = {
  id: "test-poll-two",
  question: "Alpha or Beta?",
  cat: "technology",
  place: "india",
  status: "Live",
  summary: "A synthetic two-option poll.",
  about: "Longer synthetic context.",
  tags: ["test"],
  options: [
    { id: "a", name: "Alpha", blurb: "The first one.", votes: 600 },
    { id: "b", name: "Beta", blurb: "The second one.", votes: 400 },
  ],
  closes: "Open-ended",
  trend: 60,
  recency: 1,
  updated: "1h ago",
};

export const THREE_OPTION_POLL: Poll = {
  ...TWO_OPTION_POLL,
  id: "test-poll-three",
  question: "Alpha, Beta or Gamma?",
  cat: "sports",
  options: [
    { id: "a", name: "Alpha", blurb: "First.", votes: 500 },
    { id: "b", name: "Beta", blurb: "Second.", votes: 300 },
    { id: "c", name: "Gamma", blurb: "Third.", votes: 200 },
  ],
};

export const FOUR_OPTION_POLL: Poll = {
  ...TWO_OPTION_POLL,
  id: "test-poll-four",
  question: "Alpha, Beta, Gamma or Delta?",
  cat: "food",
  options: [
    { id: "a", name: "Alpha", blurb: "First.", votes: 400 },
    { id: "b", name: "Beta", blurb: "Second.", votes: 300 },
    { id: "c", name: "Gamma", blurb: "Third.", votes: 200 },
    { id: "d", name: "Delta", blurb: "Fourth.", votes: 100 },
  ],
};

/** Nobody has voted — a 0/0 split is not a dead heat. */
export const UNVOTED_POLL: Poll = {
  ...TWO_OPTION_POLL,
  id: "test-poll-unvoted",
  question: "Nobody has answered this?",
  options: [
    { id: "a", name: "Alpha", blurb: "First.", votes: 0 },
    { id: "b", name: "Beta", blurb: "Second.", votes: 0 },
  ],
  trend: 0,
};

export const TEST_POLLS: Poll[] = [
  TWO_OPTION_POLL,
  THREE_OPTION_POLL,
  FOUR_OPTION_POLL,
  UNVOTED_POLL,
];

export const TEST_POLL_REASONS: PollReason[] = [
  {
    id: "reason-1",
    pollId: TWO_OPTION_POLL.id,
    side: "a",
    name: "Tester One",
    initials: "T1",
    text: "A synthetic reason for picking Alpha.",
    time: "2h ago",
    helpful: 3,
  },
  {
    id: "reason-2",
    pollId: TWO_OPTION_POLL.id,
    side: "b",
    name: "Tester Two",
    initials: "T2",
    text: "A synthetic reason for picking Beta.",
    time: "4h ago",
    helpful: 1,
  },
];

export function testOpinionsFor(topicId: string): Opinion[] {
  return TEST_OPINIONS.filter((o) => o.topicId === topicId);
}

export function testReasonsFor(pollId: string): PollReason[] {
  return TEST_POLL_REASONS.filter((r) => r.pollId === pollId);
}

/* ------------------------------------------------- decorated conveniences */

/**
 * Decorated forms, for tests that exercise the presentation layer end to end.
 *
 * Built lazily so importing this module stays cheap for the tests that only
 * want raw shapes.
 */
export function testTopics(): DecoratedTopic[] {
  return TEST_TOPICS.map(decorate);
}

export function testTopic(id: string): DecoratedTopic | undefined {
  return testTopics().find((t) => t.id === id);
}

export function testDecoratedPolls(): DecoratedPoll[] {
  return TEST_POLLS.map(decoratePoll);
}

export const TEST_TOPICS_BY_ID: ReadonlyMap<string, Topic> = new Map(
  TEST_TOPICS.map((t) => [t.id, t]),
);

/** One synthetic Pro contribution, for the contributions tests. */
export const TEST_PRO_CONTRIBUTIONS: Opinion[] = [
  {
    id: "pro-1",
    topicId: NEGATIVE_TOPIC.id,
    authorId: "user-3",
    name: "Tester Three",
    initials: "T3",
    vote: "Negative",
    text: "Synthetic Pro contribution summary.",
    time: "1d ago",
    helpful: 9,
    replies: 0,
    format: "pro",
    authorLine: "Pro contributor",
    sections: [
      { id: "s1", position: 0, type: "headline", text: "A synthetic headline for the tests" },
      { id: "s2", position: 1, type: "quick_take", text: "A synthetic quick take with enough words to render." },
    ],
  },
];

export function testProContributionsFor(topicId: string): Opinion[] {
  return TEST_PRO_CONTRIBUTIONS.filter((c) => c.topicId === topicId);
}

export function testTimelineFor(topicId: string): TimelineEvent[] {
  return TEST_TIMELINE.filter((e) => e.topicId === topicId);
}
