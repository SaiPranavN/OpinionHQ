"use client";

/**
 * Client-side stand-in for the private-guidance backend.
 *
 * ONE ACCOUNT. There is no contributor record and no application object. A
 * professional is the signed-in user plus a list of verified credentials —
 * `me` below is derived from the session profile, not stored alongside it.
 * Verifying proof does not create a second identity; it adds an attribute to
 * the one you already have.
 *
 * Kept separate from `PrototypeProvider` — different storage key, no shared
 * records. Topics and polls are public measurement objects; these are private
 * consultations with an access list, and sharing a store between them is how a
 * private question ends up in a public feed.
 *
 * WHAT THIS IS NOT. Every authorization decision runs in the browser over data
 * the browser already holds, because this build has no server and no session.
 * That is a UI convenience, not a security boundary: in production the same
 * functions in `lib/ask/access.ts` must run server-side.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import {
  decideAccess,
  publicQuestions,
  type AccessDecision,
} from "@/lib/ask/access";
import { nextVote, type Vote } from "@/lib/ask/comments";
import { matchQuestion, score } from "@/lib/ask/matching";
import { isPlaceId, type PlaceId } from "@/lib/places";
import { canAsk, freeAsksLeft as remainingAsks } from "@/lib/entitlements";
import {
  CREDENTIALS,
  INBOUND_QUESTIONS,
  PROFESSIONALS,
  PUBLIC_ANSWERS,
  SELF_ANSWERS,
  SELF_COMMENTS,
  SELF_MATCHES,
  SELF_MESSAGES,
  SELF_QUESTIONS,
  SELF_THREADS,
  SELF_USER_ID,
} from "@/lib/ask/sample-data/seed";
import { REPLY_CAP } from "@/lib/ask/taxonomy";
import { verify, verifiedAreas } from "@/lib/ask/verification";
import type {
  Answer,
  AnswerComment,
  AskCategoryId,
  Credential,
  Match,
  Message,
  AskQuestion,
  QuestionVisibility,
  Professional,
  ProofType,
  Rating,
  Thread,
  Viewer,
} from "@/lib/ask/types";

// Bumped whenever a stored record changes shape. v3 answers scored the asker's
// options rather than fixed dimensions; v4 added `visibility` to a question;
// v5 threads comments, adds likes, and makes the private channel something the
// asker opens rather than something that is already there; v6 replaces the two
// "liked" id lists with one vote per thing, so like and dislike cannot both be
// held; v7 adds `place` to a question. The key carries the schema rather than
// the code carrying a migration for a prototype's throwaway localStorage.
//
// The v4 bump matters more than it looks. A stored v3 question has no
// `visibility` at all, and `seeded` is already true, so the fixtures never
// re-run to supply one — those questions would silently drop out of the browse
// list with no error anywhere.
const STORAGE_KEY = "opinionhq.ask.v7";

export { SELF_USER_ID, INBOUND_QUESTIONS };

export interface QuestionDraft {
  category: AskCategoryId;
  /** Where the asker is deciding. Coarse — see `AskQuestion.place`. */
  place: PlaceId;
  title: string;
  context: string;
  options: string[];
  deadline: string;
  /** Public unless the asker says otherwise. */
  visibility: QuestionVisibility;
}

export interface AnswerDraft {
  /** One verdict per option the asker listed, by index. */
  verdicts: number[];
  /** Index of the option they would take, or -1 for "none of these". */
  pick: number;
  summary: string;
  reasoning: string;
  nextSteps: string[];
}

interface AskState {
  seeded: boolean;
  questions: AskQuestion[];
  matches: Match[];
  answers: Answer[];
  threads: Thread[];
  messages: Message[];
  ratings: Rating[];
  comments: AnswerComment[];
  /**
   * How the visitor voted, held apart from the counts themselves.
   *
   * A vote is a fact about a person and a thing. With no server there is
   * nowhere to write "you liked this" except beside the count, and folding it
   * in would make the visitor's own tap indistinguishable from the seeded
   * number — so it could never be taken back, and clearing this browser would
   * leave their vote behind on somebody else's tally.
   *
   * One entry per thing, so like and dislike are mutually exclusive by the
   * shape of the data rather than by a rule somebody has to remember.
   */
  commentVotes: Record<string, Vote>;
  answerVotes: Record<string, Vote>;
  /** The visitor's own verified proof. */
  myCredentials: Credential[];
  /** Shown under their name when they answer. */
  myHeadline: string;
  myExpertise: string[];
  readIds: string[];
}

const EMPTY: AskState = {
  seeded: false,
  questions: [],
  matches: [],
  answers: [],
  threads: [],
  messages: [],
  ratings: [],
  comments: [],
  commentVotes: {},
  answerVotes: {},
  myCredentials: [],
  myHeadline: "",
  myExpertise: [],
  readIds: [],
};

interface AskValue extends AskState {
  ready: boolean;
  signedIn: boolean;
  /** Seeded people plus the visitor, once they have proof. */
  professionals: Professional[];
  allCredentials: Credential[];
  /** Questions the visitor asked. */
  myQuestions: AskQuestion[];
  /** Questions routed to the visitor to answer. */
  inbox: AskQuestion[];
  /** Every public question, newest first — the browse list. */
  browsable: AskQuestion[];
  /** Ids of the visitor's own questions with an answer they have not opened. */
  unansweredSeen: Set<string>;
  /** Areas the visitor can answer in. Empty until they verify something. */
  myAreas: AskCategoryId[];
  isProfessional: boolean;
  me: Professional | null;

  access: (questionId: string) => {
    question: AskQuestion | undefined;
    viewer: Viewer;
    decision: AccessDecision;
  };

  /** Asks a question, or opens the subscribe sheet when the allowance is spent. */
  ask: (draft: QuestionDraft) => string;
  /** Free questions still available. Always 0 for a Pro account — see `pro`. */
  freeAsksLeft: number;
  /** Whether asking is possible right now, on the free tier or on Pro. */
  canAskNow: boolean;
  answer: (questionId: string, draft: AnswerDraft) => void;
  /** The asker opens the private channel on one answer. Theirs alone to open. */
  openPrivate: (questionId: string, professionalUserId: string) => void;
  reply: (questionId: string, professionalUserId: string, body: string) => boolean;
  closeThread: (
    questionId: string,
    professionalUserId: string,
    outcome: "Resolved" | "Not useful",
  ) => void;
  rate: (questionId: string, professionalUserId: string, helpfulness: number) => void;
  /**
   * Posts a public comment on one answer, or a reply to one. Public questions
   * only.
   */
  comment: (
    questionId: string,
    professionalUserId: string,
    body: string,
    parentId?: string,
  ) => boolean;
  /**
   * Records the visitor's vote. Pressing the side they already hold takes it
   * back; pressing the other side moves it. The count is derived, never
   * written.
   */
  voteComment: (commentId: string, kind: Vote) => void;
  voteAnswer: (answerId: string, kind: Vote) => void;
  markRead: (questionId: string) => void;

  /** Instant in the prototype — no review queue between you and the workflow. */
  verifyMe: (
    category: AskCategoryId,
    proofTypes: ProofType[],
    profile: { headline: string; expertise: string[] },
  ) => void;
  unverify: (credentialId: string) => void;
  resetAsk: () => void;
}

const AskContext = createContext<AskValue | null>(null);

function readStored(): AskState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AskState>;
    return {
      ...EMPTY,
      ...parsed,
      // Fail closed. A question whose visibility cannot be read is treated as
      // private, never as public: the cost of getting this wrong in one
      // direction is a question somebody has to re-publish, and in the other
      // it is a question they never agreed to publish at all.
      // Belt as well as braces on both fields. The key bump above handles the
      // known shape changes, but a half-written record or a tab still running
      // older code would otherwise render a question as `Worldwide` — a claim
      // its author never made, and exactly the "somebody forgot to place it"
      // case that `lib/places.ts` refuses to let a blank stand for.
      questions: (parsed.questions ?? [])
        .filter((q) => typeof q.place === "string" && isPlaceId(q.place))
        .map((q) => ({
          ...q,
          visibility: q.visibility === "public" ? "public" : "private",
        })),
    };
  } catch {
    return EMPTY;
  }
}

function slugId(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `q-${base || "question"}-${Math.random().toString(36).slice(2, 6)}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "YO";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function AskProvider({ children }: { children: ReactNode }) {
  const { signedIn, profile, toast, pro, openUpgrade } = usePrototype();
  const [state, setState] = useState<AskState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readStored());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or a full quota — still works in memory.
    }
  }, [state, ready]);

  // Seed the worked history once, on first load — NOT on first sign-in, which
  // is what it used to do.
  //
  // Under the old private-only model that was right: every seeded record was
  // the visitor's own, so there was nothing to show a signed-out visitor. Now
  // that questions are public by default, gating the seed behind sign-in meant
  // a guest browsing `/ask` saw five public questions all reading "no answers
  // yet" — the exact empty section the hybrid model exists to fix.
  //
  // Seeding unconditionally is also the more honest arrangement: the data
  // simply exists, and `lib/ask/access.ts` decides who may read which parts of
  // it. Signing out changes the viewer, not the database.
  useEffect(() => {
    if (!ready || state.seeded) return;
    setState((prev) => ({
      ...prev,
      seeded: true,
      questions: [...SELF_QUESTIONS, ...prev.questions],
      matches: [...SELF_MATCHES, ...prev.matches],
      answers: [...SELF_ANSWERS, ...PUBLIC_ANSWERS, ...prev.answers],
      threads: [...SELF_THREADS, ...prev.threads],
      messages: [...SELF_MESSAGES, ...prev.messages],
      comments: [...SELF_COMMENTS, ...prev.comments],
    }));
  }, [ready, state.seeded]);

  const allCredentials = useMemo(
    () => [...CREDENTIALS, ...state.myCredentials],
    [state.myCredentials],
  );

  const myAreas = useMemo(
    () => verifiedAreas(state.myCredentials, SELF_USER_ID),
    [state.myCredentials],
  );

  /** The visitor, viewed as somebody who can answer. Same account, one view. */
  const me = useMemo<Professional | null>(() => {
    if (myAreas.length === 0) return null;
    const name = profile?.name || "You";
    return {
      userId: SELF_USER_ID,
      name,
      initials: initialsOf(name),
      headline: state.myHeadline || "Verified professional",
      tone: "#1DB954",
      expertise: state.myExpertise,
      areas: myAreas,
      // No track record yet, and a percentage off nothing is not one either.
      answered: 0,
      helpfulPct: 0,
    };
  }, [myAreas, profile, state.myHeadline, state.myExpertise]);

  const professionals = useMemo(
    () => (me ? [...PROFESSIONALS, me] : PROFESSIONALS),
    [me],
  );

  /**
   * Routes inbound questions to the visitor whenever their proof changes.
   *
   * This is where relevance is enforced end to end: proving employment scores
   * them against career questions only. College and exam questions are not
   * ranked low — `score` returns null and they never become a match.
   */
  useEffect(() => {
    if (!ready || !me) return;
    setState((prev) => {
      const already = new Set(
        prev.matches.filter((m) => m.professionalUserId === SELF_USER_ID).map((m) => m.questionId),
      );
      const fresh: Match[] = [];
      for (const question of INBOUND_QUESTIONS) {
        if (already.has(question.id)) continue;
        const candidate = score(question, me, allCredentials);
        if (!candidate) continue;
        fresh.push({
          id: `m-${question.id}-${SELF_USER_ID}`,
          questionId: question.id,
          professionalUserId: SELF_USER_ID,
          reasons: candidate.reasons,
          matchedAt: new Date().toISOString(),
        });
      }
      return fresh.length === 0 ? prev : { ...prev, matches: [...prev.matches, ...fresh] };
    });
  }, [ready, me, allCredentials]);

  const allQuestions = useMemo(
    () => [...state.questions, ...INBOUND_QUESTIONS],
    [state.questions],
  );

  const myQuestions = useMemo(
    () =>
      state.questions
        .filter((q) => q.askerUserId === SELF_USER_ID)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.questions],
  );

  /**
   * How many questions this account has asked, and therefore what is left.
   *
   * Counted off the questions themselves rather than kept in a separate
   * counter. A counter can drift from the record it describes — after a reset,
   * a failed write, a schema bump — and a billing limit that drifts is a
   * billing limit that either overcharges or gives the product away. This one
   * cannot drift, because it *is* the record.
   *
   * SEEDED QUESTIONS DO NOT COUNT. The three worked examples are attributed to
   * the visitor so the section has something to demonstrate, but nobody asked
   * them — and billing somebody for fixtures meant a brand-new account opened
   * the app already out of free questions, which is the worst possible first
   * impression of a price. `simulated` is the flag every fixture carries and a
   * test in `ask.test.ts` holds it true for all of them.
   */
  const asked = myQuestions.filter((q) => !q.simulated).length;
  const freeAsksLeft = remainingAsks(asked);
  const canAskNow = canAsk(pro, asked);

  const inbox = useMemo(() => {
    const ids = new Set(
      state.matches
        .filter((m) => m.professionalUserId === SELF_USER_ID && !m.revokedAt)
        .map((m) => m.questionId),
    );
    return allQuestions.filter((q) => ids.has(q.id) && q.askerUserId !== SELF_USER_ID);
  }, [state.matches, allQuestions]);

  /**
   * The browse list — every public question, newest first.
   *
   * Runs through `publicQuestions` rather than filtering inline, so there is
   * one place in the codebase that decides what "public" means and a test can
   * point at it. A private question must never reach this array.
   */
  const browsable = useMemo(
    () =>
      publicQuestions(allQuestions).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    [allQuestions],
  );

  /**
   * Question ids the visitor asked that have an answer they have not opened.
   *
   * Drives the dot on "My questions". Deliberately counts *answers* rather
   * than messages: a dot that fires on a reply in a thread you are already
   * reading is noise, and the thing worth interrupting somebody for is that
   * somebody has answered at all.
   */
  const unansweredSeen = useMemo(() => {
    const seen = new Set(state.readIds);
    return new Set(
      myQuestions
        .filter(
          (q) =>
            !seen.has(q.id) && state.answers.some((a) => a.questionId === q.id),
        )
        .map((q) => q.id),
    );
  }, [myQuestions, state.answers, state.readIds]);

  /* -------------------------------------------------------------- access */

  const access = useCallback(
    (questionId: string) => {
      const question = allQuestions.find((q) => q.id === questionId);
      if (!signedIn) {
        const viewer: Viewer = { role: "guest", userId: "" };
        return { question, viewer, decision: decideAccess(viewer, question, state.matches) };
      }
      // Asker first, then matched professional. One account, two roles on the
      // same question is impossible — you cannot be matched to your own.
      const asAsker: Viewer = { role: "asker", userId: SELF_USER_ID };
      const askerDecision = decideAccess(asAsker, question, state.matches);
      if (askerDecision.allowed) return { question, viewer: asAsker, decision: askerDecision };

      const asPro: Viewer = { role: "professional", userId: SELF_USER_ID };
      return { question, viewer: asPro, decision: decideAccess(asPro, question, state.matches) };
    },
    [allQuestions, signedIn, state.matches],
  );

  /* ------------------------------------------------------------- asking */

  const ask = useCallback(
    (draft: QuestionDraft) => {
      // Guarded here as well as on the button. Asking is the metered action;
      // a mutation that trusts its caller is a mutation that trusts whatever
      // else can reach it, and the whole allowance would then be advisory.
      if (!canAsk(pro, asked)) {
        openUpgrade("ask-question");
        return "";
      }
      const now = new Date().toISOString();
      const id = slugId(draft.title);
      const question: AskQuestion = {
        ...draft,
        id,
        askerUserId: SELF_USER_ID,
        askerName: profile?.name || "You",
        createdAt: now,
        updatedAt: now,
      };
      // Matching runs against the seeded pool. The visitor is excluded — you
      // cannot be routed your own question.
      const matches = matchQuestion(question, PROFESSIONALS, CREDENTIALS, now);

      setState((prev) => ({
        ...prev,
        questions: [question, ...prev.questions],
        matches: [...prev.matches, ...matches],
        threads: [
          ...prev.threads,
          ...matches.map((m) => ({
            questionId: id,
            professionalUserId: m.professionalUserId,
            status: "Awaiting answer" as const,
            updatedAt: now,
          })),
        ],
      }));

      toast(
        matches.length > 0
          ? `Sent privately to ${matches.length} verified ${matches.length === 1 ? "person" : "people"}.`
          : "Submitted privately. Nobody verified in this area matches it yet.",
      );
      return id;
    },
    [profile, toast, pro, asked, openUpgrade],
  );

  /* ----------------------------------------------------------- answering */

  const answer = useCallback(
    (questionId: string, draft: AnswerDraft) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const existing = prev.answers.find(
          (a) => a.questionId === questionId && a.professionalUserId === SELF_USER_ID,
        );
        const record: Answer = existing
          ? { ...existing, ...draft, updatedAt: now }
          : {
              id: `a-${questionId}-${SELF_USER_ID}`,
              questionId,
              professionalUserId: SELF_USER_ID,
              ...draft,
              createdAt: now,
              updatedAt: now,
            };
        const hasThread = prev.threads.some(
          (t) => t.questionId === questionId && t.professionalUserId === SELF_USER_ID,
        );
        return {
          ...prev,
          answers: existing
            ? prev.answers.map((a) => (a.id === existing.id ? record : a))
            : [...prev.answers, record],
          threads: hasThread
            ? prev.threads.map((t) =>
                t.questionId === questionId && t.professionalUserId === SELF_USER_ID
                  ? { ...t, status: "Answered", updatedAt: now }
                  : t,
              )
            : [
                ...prev.threads,
                {
                  questionId,
                  professionalUserId: SELF_USER_ID,
                  status: "Answered" as const,
                  updatedAt: now,
                },
              ],
        };
      });
      toast("Answer sent privately.");
    },
    [toast],
  );

  /**
   * Opens the private channel on one answer.
   *
   * Guarded on the asker rather than on the button, because a mutation that
   * trusts its caller is a mutation that trusts every future caller. The thread
   * record usually exists already — it is created when the question is matched
   * — but an answer can arrive on a question that never had one, so this
   * upserts rather than assuming.
   */
  const openPrivate = useCallback<AskValue["openPrivate"]>(
    (questionId, professionalUserId) => {
      const question = allQuestions.find((q) => q.id === questionId);
      if (!question || question.askerUserId !== SELF_USER_ID || !signedIn) return;

      const now = new Date().toISOString();
      let already = false;

      setState((prev) => {
        const existing = prev.threads.find(
          (t) => t.questionId === questionId && t.professionalUserId === professionalUserId,
        );
        if (existing?.privateOpenedAt) {
          already = true;
          return prev;
        }
        return {
          ...prev,
          threads: existing
            ? prev.threads.map((t) =>
                t.questionId === questionId && t.professionalUserId === professionalUserId
                  ? { ...t, privateOpenedAt: now, updatedAt: now }
                  : t,
              )
            : [
                ...prev.threads,
                {
                  questionId,
                  professionalUserId,
                  status: "Answered" as const,
                  privateOpenedAt: now,
                  updatedAt: now,
                },
              ],
        };
      });

      if (!already) {
        const person = professionals.find((p) => p.userId === professionalUserId);
        toast(
          `Private thread open with ${person?.name ?? "them"}. Only the two of you can see it.`,
        );
      }
    },
    [allQuestions, signedIn, professionals, toast],
  );

  const reply = useCallback(
    (questionId: string, professionalUserId: string, body: string) => {
      const text = body.trim();
      if (!text) return false;
      const isAsker = professionalUserId !== SELF_USER_ID;
      let refused = false;
      // Nobody writes into a channel the asker has not opened — including the
      // professional, whose reply box does not exist until it is open. Checked
      // here as well, so the rule survives the next component that forgets it.
      let closed = false;

      setState((prev) => {
        const thread = prev.threads.find(
          (t) => t.questionId === questionId && t.professionalUserId === professionalUserId,
        );
        if (thread && !thread.privateOpenedAt) {
          closed = true;
          return prev;
        }
        const own = prev.messages.filter(
          (m) =>
            m.questionId === questionId &&
            m.professionalUserId === professionalUserId &&
            m.senderRole === (isAsker ? "asker" : "professional"),
        );
        if (own.length >= REPLY_CAP) {
          refused = true;
          return prev;
        }
        const now = new Date().toISOString();
        const message: Message = {
          id: `msg-${questionId}-${professionalUserId}-${prev.messages.length}-${Date.now()}`,
          questionId,
          professionalUserId,
          senderUserId: SELF_USER_ID,
          senderRole: isAsker ? "asker" : "professional",
          body: text,
          createdAt: now,
        };
        return {
          ...prev,
          messages: [...prev.messages, message],
          threads: prev.threads.map((t) =>
            t.questionId === questionId && t.professionalUserId === professionalUserId
              ? { ...t, status: "In discussion", updatedAt: now }
              : t,
          ),
          questions: prev.questions.map((q) =>
            q.id === questionId ? { ...q, updatedAt: now } : q,
          ),
        };
      });

      if (closed) {
        toast("That private thread has not been opened by the person who asked.");
        return false;
      }
      if (refused) {
        toast(`Reply limit reached — ${REPLY_CAP} each way.`);
        return false;
      }
      toast("Sent privately.");
      return true;
    },
    [toast],
  );

  const closeThread = useCallback<AskValue["closeThread"]>(
    (questionId, professionalUserId, outcome) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        threads: prev.threads.map((t) =>
          t.questionId === questionId && t.professionalUserId === professionalUserId
            ? {
                ...t,
                status: outcome === "Resolved" ? "Resolved" : "Closed",
                outcome,
                updatedAt: now,
              }
            : t,
        ),
        // Closing ends that person's access to the question.
        matches: prev.matches.map((m) =>
          m.questionId === questionId && m.professionalUserId === professionalUserId
            ? { ...m, revokedAt: now }
            : m,
        ),
        questions: prev.questions.map((q) =>
          q.id === questionId ? { ...q, updatedAt: now } : q,
        ),
      }));
      toast(
        outcome === "Resolved"
          ? "Marked resolved. Their access to your question has ended."
          : "Closed. Their access to your question has ended.",
      );
    },
    [toast],
  );

  const rate = useCallback<AskValue["rate"]>(
    (questionId, professionalUserId, helpfulness) => {
      setState((prev) => ({
        ...prev,
        ratings: [
          ...prev.ratings.filter(
            (r) =>
              !(r.questionId === questionId && r.professionalUserId === professionalUserId),
          ),
          {
            questionId,
            professionalUserId,
            helpfulness,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      toast("Saved. It stays between you and their stats.");
    },
    [toast],
  );

  /**
   * A third party's public note on an answer.
   *
   * Guarded here as well as in the UI. The button is only rendered where
   * `canComment` allows it, but a state mutation that trusts the button is a
   * mutation that trusts whatever else can call it — and a comment appearing
   * on a private question would be a stranger's text inside somebody's private
   * consultation.
   */
  const comment = useCallback<AskValue["comment"]>(
    (questionId, professionalUserId, body, parentId) => {
      const text = body.trim();
      if (!text) return false;
      if (!signedIn) {
        toast("Sign in to comment on an answer.");
        return false;
      }
      const question = allQuestions.find((q) => q.id === questionId);
      if (!question || question.visibility !== "public") return false;

      const name = profile?.name || "You";
      setState((prev) => {
        // A reply must hang off a comment that is actually on this answer.
        // Without the check a stale id from a re-render would attach it
        // somewhere else, or to nothing — and `commentTree` would quietly
        // promote it to the top of the list as though it had been written
        // there.
        const parent = parentId
          ? prev.comments.find(
              (c) =>
                c.id === parentId &&
                c.questionId === questionId &&
                c.professionalUserId === professionalUserId,
            )
          : undefined;
        return {
          ...prev,
          comments: [
            ...prev.comments,
            {
              id: `c-${questionId}-${professionalUserId}-${Date.now()}`,
              questionId,
              professionalUserId,
              ...(parent ? { parentId: parent.id } : {}),
              authorUserId: SELF_USER_ID,
              authorName: name,
              authorInitials: initialsOf(name),
              body: text,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
      toast(
        parentId
          ? "Reply posted. Everyone reading this question can see it."
          : "Comment posted. Everyone reading this question can see it.",
      );
      return true;
    },
    [signedIn, profile, allQuestions, toast],
  );

  /**
   * Votes, both kinds, both targets.
   *
   * No toast. A vote is the lightest thing on the page and a confirmation
   * banner for one would be louder than the act — the count moving by one is
   * the feedback.
   */
  const castVote = useCallback(
    (field: "commentVotes" | "answerVotes", id: string, kind: Vote, what: string) => {
      if (!signedIn) {
        toast(`Sign in to vote on ${what}.`);
        return;
      }
      setState((prev) => {
        const next = { ...prev[field] };
        const resolved = nextVote(next[id], kind);
        if (resolved) next[id] = resolved;
        else delete next[id];
        return { ...prev, [field]: next };
      });
    },
    [signedIn, toast],
  );

  const voteComment = useCallback<AskValue["voteComment"]>(
    (commentId, kind) => castVote("commentVotes", commentId, kind, "a comment"),
    [castVote],
  );

  const voteAnswer = useCallback<AskValue["voteAnswer"]>(
    (answerId, kind) => castVote("answerVotes", answerId, kind, "an answer"),
    [castVote],
  );

  const markRead = useCallback((questionId: string) => {
    setState((prev) => {
      const ids = prev.messages.filter((m) => m.questionId === questionId).map((m) => m.id);
      const merged = new Set([...prev.readIds, ...ids]);
      if (merged.size === prev.readIds.length) return prev;
      return { ...prev, readIds: [...merged] };
    });
  }, []);

  /* ------------------------------------------------------- verification */

  const verifyMe = useCallback<AskValue["verifyMe"]>(
    (category, proofTypes, profileDetails) => {
      const fresh = verify(SELF_USER_ID, category, proofTypes);
      setState((prev) => ({
        ...prev,
        myHeadline: profileDetails.headline || prev.myHeadline,
        myExpertise: profileDetails.expertise.length
          ? [...new Set([...prev.myExpertise, ...profileDetails.expertise])]
          : prev.myExpertise,
        myCredentials: [
          ...prev.myCredentials.filter((c) => !fresh.some((f) => f.id === c.id)),
          ...fresh,
        ],
      }));
      toast(
        `Verified. You can now answer ${category} questions — and only ${category} questions.`,
      );
    },
    [toast],
  );

  const unverify = useCallback(
    (credentialId: string) => {
      setState((prev) => ({
        ...prev,
        myCredentials: prev.myCredentials.filter((c) => c.id !== credentialId),
      }));
      toast("Removed. Matching for that area stops immediately.");
    },
    [toast],
  );

  const resetAsk = useCallback(() => {
    setState(EMPTY);
    toast("Ask Verified data cleared from this browser.");
  }, [toast]);

  const value = useMemo<AskValue>(
    () => ({
      ...state,
      ready,
      signedIn,
      professionals,
      allCredentials,
      myQuestions,
      freeAsksLeft,
      canAskNow,
      inbox,
      browsable,
      unansweredSeen,
      myAreas,
      isProfessional: myAreas.length > 0,
      me,
      access,
      ask,
      answer,
      openPrivate,
      reply,
      closeThread,
      rate,
      comment,
      voteComment,
      voteAnswer,
      markRead,
      verifyMe,
      unverify,
      resetAsk,
    }),
    [
      state,
      ready,
      signedIn,
      professionals,
      allCredentials,
      myQuestions,
      freeAsksLeft,
      canAskNow,
      inbox,
      browsable,
      unansweredSeen,
      myAreas,
      me,
      access,
      ask,
      answer,
      openPrivate,
      reply,
      closeThread,
      rate,
      comment,
      voteComment,
      voteAnswer,
      markRead,
      verifyMe,
      unverify,
      resetAsk,
    ],
  );

  return <AskContext.Provider value={value}>{children}</AskContext.Provider>;
}

export function useAsk(): AskValue {
  const ctx = useContext(AskContext);
  if (!ctx) throw new Error("useAsk must be used inside <AskProvider>");
  return ctx;
}
