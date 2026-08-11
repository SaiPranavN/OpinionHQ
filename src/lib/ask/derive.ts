/**
 * Presentation derivations.
 *
 * Everything a screen needs is computed here, once, so no component invents
 * its own phrasing for "waiting on you" or its own idea of what counts unread.
 */

import {
  isPrivateOpen,
  visibleComments,
  visibleMessages,
  type AccessScope,
} from "@/lib/ask/access";
import { commentTree, countComments } from "@/lib/ask/comments";
import { askCategory, REPLY_CAP } from "@/lib/ask/taxonomy";
import { orderCredentials } from "@/lib/ask/verification";
import type {
  Answer,
  AnswerComment,
  Credential,
  DecoratedAnswer,
  DecoratedQuestion,
  Match,
  Message,
  AskQuestion,
  Professional,
  QuestionStatus,
  Rating,
  Thread,
  Viewer,
} from "@/lib/ask/types";

/* ------------------------------------------------------------------ time */

export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const seconds = Math.max(Math.round((now.getTime() - then) / 1000), 0);
  if (seconds < 90) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}

export function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function deadlineNote(deadline: string, now = new Date()): string {
  if (!deadline.trim()) return "No deadline";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return `By ${deadline}`;
  const days = Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return `Deadline passed — ${shortDate(deadline)}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 14) return `${days} days to decide`;
  return `By ${shortDate(deadline)}`;
}

/* -------------------------------------------------------------- statuses */

/**
 * A question shows whatever is furthest along across its threads, so the
 * dashboard row says the most useful true thing: "Answered" beats "Awaiting
 * answer" when one of three people has delivered.
 */
const RANK: Record<QuestionStatus, number> = {
  Answered: 50,
  "In discussion": 40,
  "Awaiting answer": 30,
  "Finding someone": 20,
  Resolved: 10,
  Closed: 0,
};

export function questionStatus(matches: Match[], threads: Thread[]): QuestionStatus {
  if (threads.length === 0) {
    return matches.some((m) => !m.revokedAt) ? "Awaiting answer" : "Finding someone";
  }
  const open = threads.filter((t) => t.status !== "Resolved" && t.status !== "Closed");
  const pool = open.length > 0 ? open : threads;
  return pool.reduce<QuestionStatus>(
    (best, thread) => (RANK[thread.status] > RANK[best] ? thread.status : best),
    pool[0]!.status,
  );
}

export function statusLine(status: QuestionStatus, matched: number, answers: number): string {
  switch (status) {
    case "Finding someone":
      return "Looking for people with relevant verified proof.";
    case "Awaiting answer":
      return `Sent to ${matched} verified ${matched === 1 ? "person" : "people"}. No answer yet.`;
    case "Answered":
      return `${answers} ${answers === 1 ? "answer" : "answers"} ready to read.`;
    case "In discussion":
      return "Private discussion in progress.";
    case "Resolved":
      return "You marked this resolved.";
    case "Closed":
      return "Closed. No further messages.";
  }
}

/** Whose move it is, for a thread header. */
export function turnLine(status: string): string {
  switch (status) {
    case "Awaiting answer":
      return "Waiting on them";
    case "Answered":
      return "Answer ready";
    case "In discussion":
      return "Open";
    case "Resolved":
      return "Resolved";
    default:
      return "Closed";
  }
}

/* -------------------------------------------------------------- decoration */

/** Unread counts from the other side only — never your own messages. */
export function unreadFor(userId: string, messages: Message[], readIds: string[]): number {
  const read = new Set(readIds);
  return messages.filter((m) => m.senderUserId !== userId && !read.has(m.id)).length;
}

export function decorateQuestion(
  question: AskQuestion,
  {
    matches,
    threads,
    answers,
    messages,
    readIds,
    viewerUserId,
    now = new Date(),
  }: {
    matches: Match[];
    threads: Thread[];
    answers: Answer[];
    messages: Message[];
    readIds: string[];
    viewerUserId: string;
    now?: Date;
  },
): DecoratedQuestion {
  const mine = matches.filter((m) => m.questionId === question.id);
  const myThreads = threads.filter((t) => t.questionId === question.id);
  const myAnswers = answers.filter((a) => a.questionId === question.id);
  const status = questionStatus(mine, myThreads);

  return {
    question,
    category: askCategory(question.category),
    matches: mine,
    answerCount: myAnswers.length,
    unreadCount: unreadFor(
      viewerUserId,
      messages.filter((m) => m.questionId === question.id),
      readIds,
    ),
    status,
    statusLine: statusLine(status, mine.length, myAnswers.length),
    deadlineNote: deadlineNote(question.deadline, now),
  };
}

export function decorateAnswer(
  answer: Answer,
  {
    question,
    professional,
    credentials,
    threads,
    messages,
    ratings,
    comments,
    viewer,
    scope,
  }: {
    question: AskQuestion;
    professional: Professional;
    credentials: Credential[];
    threads: Thread[];
    messages: Message[];
    ratings: Rating[];
    comments: AnswerComment[];
    viewer: Viewer;
    scope: AccessScope;
  },
): DecoratedAnswer {
  const thread = threads.find(
    (t) =>
      t.questionId === answer.questionId &&
      t.professionalUserId === answer.professionalUserId,
  ) ?? {
    questionId: answer.questionId,
    professionalUserId: answer.professionalUserId,
    status: "Answered" as const,
    updatedAt: answer.updatedAt,
  };

  const threadMessages = visibleMessages(viewer, scope, messages, question.id).filter(
    (m) => m.professionalUserId === answer.professionalUserId,
  );

  const tree = commentTree(visibleComments(question, comments, answer.professionalUserId));

  return {
    answer,
    professional,
    comments: tree,
    commentCount: countComments(tree),
    // Asked of the full message list rather than the visible one: whether the
    // channel is open is a fact about the thread, not about who is looking at
    // it. A public reader never reaches this — `visibleThreads` returns nothing
    // for them — but if the flag were derived from their empty view it would
    // read "closed" for a channel that is open, which is the kind of quiet
    // disagreement between two screens that becomes a bug report later.
    privateOpen: isPrivateOpen(thread, messages),
    credentials: orderCredentials(
      credentials.filter(
        (c) => c.userId === professional.userId && c.category === question.category,
      ),
    ),
    thread,
    messages: threadMessages,
    rating: ratings.find(
      (r) =>
        r.questionId === answer.questionId &&
        r.professionalUserId === answer.professionalUserId,
    ),
    replies: countReplies(threadMessages),
  };
}

/** Replies against the cap, per side. */
export function countReplies(messages: Message[]): {
  asker: number;
  professional: number;
  cap: number;
} {
  let asker = 0;
  let professional = 0;
  for (const message of messages) {
    if (message.senderRole === "asker") asker += 1;
    else professional += 1;
  }
  return { asker, professional, cap: REPLY_CAP };
}
