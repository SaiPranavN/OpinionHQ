/**
 * Who can read what.
 *
 * Four scopes, and they fit on one screen deliberately — access logic spread
 * across components is access logic that gets forgotten in one of them, and
 * the one that forgets is the leak.
 *
 *   asker         everything on their own question
 *   professional  matched: their own answer and thread, plus — once they have
 *                 written it — every other answer on a public question
 *   public        a public question and all its answers. No threads, no
 *                 messages, no ratings, no asker name.
 *   nobody        a private question they have no part in: not even that it
 *                 exists
 *
 * That last clause still matters for private questions. An unauthorized viewer
 * gets "not found", not "forbidden": confirming that a question exists at a
 * given address is itself a disclosure.
 *
 * THREE RULES CARRY THE PRODUCT'S INTEGRITY CLAIM, and all three live here
 * rather than in a component:
 *
 *   1. Threads are never public. A one-to-one discussion is between the asker
 *      and one professional; publishing it would make this a forum, and the
 *      people who agreed to answer did not agree to that.
 *   2. A professional cannot read other answers until they have written their
 *      own. Making questions public created a way to read three opinions and
 *      then "independently" write a fourth. Independent answers are the whole
 *      value proposition, so the gate moved rather than the promise.
 *   3. The private channel opens only when the asker opens it. Being matched
 *      to a question is permission to answer it, not permission to start a
 *      private conversation with the person who asked.
 *
 * NOTE. These are pure functions over state the browser holds, because this
 * build has no server and no session. In production the identical decisions
 * must run server-side before the row leaves the database — a client-side check
 * is a UI convenience, never a security boundary.
 */

import type {
  Answer,
  AnswerComment,
  AskQuestion,
  Match,
  Message,
  Rating,
  Thread,
  Viewer,
} from "@/lib/ask/types";

export type AccessScope = "asker" | "professional" | "public";

export type AccessDecision =
  | { allowed: true; scope: AccessScope }
  | { allowed: false; reason: string };

export function matchFor(
  matches: Match[],
  questionId: string,
  professionalUserId: string,
): Match | undefined {
  return matches.find(
    (m) => m.questionId === questionId && m.professionalUserId === professionalUserId,
  );
}

/** A match grants access until the asker closes the thread. */
export function isLiveMatch(match: Match): boolean {
  return !match.revokedAt;
}

/** The single gate. Everything below assumes it has already run. */
export function decideAccess(
  viewer: Viewer,
  question: AskQuestion | undefined,
  matches: Match[],
): AccessDecision {
  if (!question) return { allowed: false, reason: "No such question." };

  // The asker's own claim outranks everything, including visibility: they can
  // always read their own question whether or not they published it.
  if (viewer.role !== "guest" && question.askerUserId === viewer.userId) {
    return { allowed: true, scope: "asker" };
  }

  // A live match outranks `public` too — a matched professional gets a thread
  // and a reply box, which a passer-by never does.
  if (viewer.role !== "guest") {
    const match = matchFor(matches, question.id, viewer.userId);
    if (match && !match.revokedAt) {
      return { allowed: true, scope: "professional" };
    }
    if (match?.revokedAt && question.visibility === "private") {
      return {
        allowed: false,
        reason: "This question was closed by the person who asked it.",
      };
    }
  }

  // Reading a public question needs no account at all. Requiring one would
  // hide the answers from exactly the people they were written for.
  if (question.visibility === "public") {
    return { allowed: true, scope: "public" };
  }

  if (viewer.role === "guest") {
    return { allowed: false, reason: "Sign in to view your questions." };
  }
  return { allowed: false, reason: "No such question." };
}

/* ------------------------------------------------------------ projections */

/**
 * Answers this viewer may read.
 *
 * The asker sees all of them, always. A passer-by on a public question sees
 * all of them too — that is what publishing means.
 *
 * A professional sees only their own until they have written it. Somebody who
 * reads the answer before theirs will anchor on it, and three anchored
 * opinions are worth less than one independent one. Once their answer is in,
 * there is nothing left to anchor and they may read the rest.
 */
export function visibleAnswers(
  viewer: Viewer,
  scope: AccessScope,
  answers: Answer[],
  question: AskQuestion,
): Answer[] {
  const onQuestion = answers.filter((a) => a.questionId === question.id);

  if (scope === "professional") {
    const mine = onQuestion.filter((a) => a.professionalUserId === viewer.userId);
    if (mine.length === 0) return mine;
    // Their answer exists, so anchoring is no longer possible. On a public
    // question they may now read the others; on a private one they still may
    // not, because those were written for the asker alone.
    return question.visibility === "public" ? onQuestion : mine;
  }

  return onQuestion;
}

/**
 * Threads, and therefore the reply box.
 *
 * Never public, on any question. The asker sees every thread on their own
 * question; a matched professional sees exactly one, theirs.
 */
export function visibleThreads(
  viewer: Viewer,
  scope: AccessScope,
  threads: Thread[],
  questionId: string,
): Thread[] {
  if (scope === "public") return [];
  const onQuestion = threads.filter((t) => t.questionId === questionId);
  if (scope === "professional") {
    return onQuestion.filter((t) => t.professionalUserId === viewer.userId);
  }
  return onQuestion;
}

export function visibleMessages(
  viewer: Viewer,
  scope: AccessScope,
  messages: Message[],
  questionId: string,
): Message[] {
  if (scope === "public") return [];
  return messages
    .filter((m) => {
      if (m.questionId !== questionId) return false;
      if (scope === "professional") return m.professionalUserId === viewer.userId;
      return true;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Ratings stay between the asker, the platform and that professional's own
 * stats. Nobody sees what another professional was rated on the same question,
 * and a public reader sees none at all — a visible score under a public answer
 * turns a considered reply into a performance.
 */
export function visibleRatings(
  viewer: Viewer,
  scope: AccessScope,
  ratings: Rating[],
  questionId: string,
): Rating[] {
  if (scope === "public") return [];
  const onQuestion = ratings.filter((r) => r.questionId === questionId);
  if (scope === "professional") {
    return onQuestion.filter((r) => r.professionalUserId === viewer.userId);
  }
  return onQuestion;
}

/**
 * Comments this viewer may read.
 *
 * Public questions only, and that is a hard rule rather than a default: a
 * private question has no third parties by construction, so a comment on one
 * could only have come from a bug. Returning nothing for a private question
 * means such a bug shows up as a missing comment rather than as a stranger's
 * text appearing inside somebody's private consultation.
 */
export function visibleComments(
  question: AskQuestion,
  comments: AnswerComment[],
  professionalUserId: string,
): AnswerComment[] {
  if (question.visibility !== "public") return [];
  return comments
    .filter(
      (c) =>
        c.questionId === question.id &&
        c.professionalUserId === professionalUserId,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Whether this viewer may post a comment.
 *
 * Anyone signed in, on a public question — including the asker, who often has
 * the most useful thing to add.
 *
 * THE AUTHOR OF THE ANSWER IS A SPECIAL CASE, and threading changed what the
 * right answer is. They still may not open a comment of their own: a public
 * addition to their assessment belongs *in* it, and an author arguing
 * underneath their own answer is how a considered page turns into a message
 * board. But once a reader has replied to them by name, refusing them the
 * reply box means a question addressed to the one person who can answer it
 * hangs there unanswered in public. So: no new comments, replies allowed.
 */
export function canComment(
  question: AskQuestion,
  viewer: Viewer,
  answerAuthorUserId: string,
  parentId?: string,
): boolean {
  if (question.visibility !== "public") return false;
  if (viewer.role === "guest") return false;
  if (viewer.userId === answerAuthorUserId) return parentId !== undefined;
  return true;
}

/**
 * Whether this viewer may vote on an answer or a comment, either way.
 *
 * Signed in, on a public question, and never their own writing. Voting on
 * yourself is blocked not because one number matters but because a count that
 * includes the author is a count that means nothing — and this is a product
 * whose entire claim is that its numbers mean what they say.
 */
export function canVote(
  question: AskQuestion,
  viewer: Viewer,
  authorUserId: string,
): boolean {
  if (question.visibility !== "public") return false;
  if (viewer.role === "guest") return false;
  return viewer.userId !== authorUserId;
}

/**
 * Whether this viewer may open a private follow-up with the professional.
 *
 * The asker only. The private thread is the consultation they asked for; a
 * third party reading a published answer is a reader, not a client, and
 * letting them into that thread would put a stranger inside the one place
 * this feature promises is between two people.
 */
export function canMessagePrivately(
  question: AskQuestion,
  viewer: Viewer,
): boolean {
  return viewer.role !== "guest" && viewer.userId === question.askerUserId;
}

/**
 * Whether the private channel on this thread is open.
 *
 * The thread record exists from the moment somebody is matched — it is how the
 * pair's status is tracked — but the private channel inside it starts closed.
 * Nothing about a matched professional entitles them to a private line; that is
 * the asker's to open.
 *
 * The message fallback is deliberate and it fails in the safe direction. A
 * thread carrying messages but no open stamp can only be a record written
 * before this field existed, and hiding a conversation that has already
 * happened from the two people who had it is worse than showing a channel that
 * is, by the evidence of its own contents, already open.
 */
export function isPrivateOpen(thread: Thread, messages: Message[] = []): boolean {
  if (thread.privateOpenedAt) return true;
  return messages.some(
    (m) =>
      m.questionId === thread.questionId &&
      m.professionalUserId === thread.professionalUserId,
  );
}

/**
 * Whether this viewer may open the private channel right now.
 *
 * The asker, on a thread that is neither already open nor already finished.
 * Reopening a resolved thread would undo the access revocation that resolving
 * performs, so the answer there is a new question rather than a new message.
 */
export function canOpenPrivate(
  question: AskQuestion,
  viewer: Viewer,
  thread: Thread,
  messages: Message[] = [],
): boolean {
  if (!canMessagePrivately(question, viewer)) return false;
  if (isPrivateOpen(thread, messages)) return false;
  return thread.status !== "Resolved" && thread.status !== "Closed";
}

/**
 * Whether this viewer may see who asked.
 *
 * Publishing a question is not publishing yourself. The asker's name reaches
 * the people actually working on it, and nobody else.
 */
export function canSeeAsker(scope: AccessScope): boolean {
  return scope === "asker" || scope === "professional";
}

/** Question ids a professional is currently allowed to open. */
export function matchedQuestionIds(matches: Match[], professionalUserId: string): string[] {
  return matches
    .filter((m) => m.professionalUserId === professionalUserId && isLiveMatch(m))
    .map((m) => m.questionId);
}

/** The public browse list. Private questions never enter it. */
export function publicQuestions(questions: AskQuestion[]): AskQuestion[] {
  return questions.filter((q) => q.visibility === "public");
}
