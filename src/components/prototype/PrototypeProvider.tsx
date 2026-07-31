"use client";

/**
 * Client-side stand-in for the parts of the product that need a server:
 * sessions, vote persistence, facet answers, follows and replies.
 *
 * Everything here lives in localStorage so the prototype survives a reload and
 * the review can cover "come back the next day" flows. It is replaced wholesale
 * by Auth.js + Postgres in Phase 1/3 of the roadmap — no component should reach
 * past this hook for session or vote state.
 *
 * There is no password anywhere in this flow, and nothing leaves the device.
 */

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AuthModal, type AccountDetails } from "@/components/prototype/AuthModal";
import { Toast } from "@/components/prototype/Toast";
import { POLLS as FIXTURE_POLLS } from "@/lib/sample-data/polls";
import { TOPICS as FIXTURE_TOPICS } from "@/lib/sample-data/topics";
import type { Poll, PollSideId, Sentiment, Topic } from "@/lib/types";

const STORAGE_KEY = "opinionhq.prototype.v3";

export interface CastVote {
  vote: Sentiment;
  note: string;
  updatedAt: string;
}

/** A pick in a head-to-head poll, plus the optional written reason. */
export interface CastPollVote {
  side: PollSideId;
  reason: string;
  updatedAt: string;
}

/** Answers to the category-specific questions, keyed `topicId:facetId`. */
export type FacetAnswers = Record<string, string>;

export interface PostedReply {
  id: string;
  opinionId: string;
  name: string;
  initials: string;
  text: string;
  createdAt: string;
}

export interface Profile {
  name: string;
  email: string;
  dob?: string;
  mobile?: string;
  occupation?: string;
  country?: string;
  state?: string;
  city?: string;
}

interface PendingVote {
  topicId: string;
  vote: Sentiment;
  note: string;
}

interface PersistedState {
  signedIn: boolean;
  profile: Profile | null;
  votes: Record<string, CastVote>;
  pollVotes: Record<string, CastPollVote>;
  facetAnswers: FacetAnswers;
  follows: string[];
  helpful: string[];
  replies: PostedReply[];
  /** Topics published from the in-app composer, newest first. */
  created: Topic[];
  /** Polls published from the in-app composer, newest first. */
  createdPolls: Poll[];
}

const EMPTY: PersistedState = {
  signedIn: false,
  profile: null,
  votes: {},
  pollVotes: {},
  facetAnswers: {},
  follows: [],
  helpful: [],
  replies: [],
  created: [],
  createdPolls: [],
};

interface PrototypeValue extends PersistedState {
  ready: boolean;
  displayName: string;
  /** Records a vote, or opens the sign-in modal holding it if signed out. */
  submitVote: (topicId: string, vote: Sentiment, note: string) => void;
  clearVote: (topicId: string) => void;
  /** Records a poll pick, opening the auth sheet first if signed out. */
  submitPollVote: (pollId: string, side: PollSideId, reason: string) => void;
  clearPollVote: (pollId: string) => void;
  answerFacet: (topicId: string, facetId: string, optionId: string) => void;
  toggleFollow: (topicId: string) => void;
  toggleHelpful: (opinionId: string) => void;
  postReply: (opinionId: string, text: string) => boolean;
  repliesFor: (opinionId: string) => PostedReply[];
  /** Publishes a composer draft and returns the id it was given. */
  createTopic: (draft: Omit<Topic, "createdBy" | "createdAt">) => string;
  createdTopic: (id: string) => Topic | undefined;
  /** True when this id is not taken by a fixture or an earlier draft. */
  isIdAvailable: (id: string) => boolean;
  /** Publishes a poll draft and returns the id it was given. */
  createPoll: (draft: Omit<Poll, "closes"> & { closes?: string }) => string;
  createdPoll: (id: string) => Poll | undefined;
  isPollIdAvailable: (id: string) => boolean;
  /**
   * Opens the auth sheet directly. `redirectTo` is for entry points that have
   * nowhere to return to — the nav button sends you to the catalog. Callers
   * that opened it mid-task (voting, replying, the composer) omit it so the
   * visitor lands back where they were.
   */
  openAuth: (mode?: "signin" | "signup", redirectTo?: string) => void;
  signOut: () => void;
  toast: (message: string) => void;
}

const PrototypeContext = createContext<PrototypeValue | null>(null);

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "YO";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/** Ids already taken by editor-published fixtures. */
const FIXTURE_IDS = new Set(FIXTURE_TOPICS.map((e) => e.id));
const FIXTURE_POLL_IDS = new Set(FIXTURE_POLLS.map((p) => p.id));

/**
 * A vote on a participant-created topic is, for now, the entire sample —
 * there is no server tallying anyone else's. One vote means 100% of one tone.
 */
function applyLocalVote(topic: Topic, vote: Sentiment): Topic {
  return {
    ...topic,
    participants: 1,
    pos: vote === "Positive" ? 100 : 0,
    neu: vote === "Neutral" ? 100 : 0,
    neg: vote === "Negative" ? 100 : 0,
    updated: "just now",
    // A single vote is not a weekly trend. Zero here makes `decorate` say so
    // rather than reporting a meaningless "up 100%".
    change: { metric: "participation", value: 0, direction: "up" },
  };
}

/**
 * Moves one vote onto `side` in a participant-created poll, taking it off the
 * previous pick if the vote is being changed rather than cast for the first
 * time — otherwise updating a vote would inflate the total.
 */
function applyLocalPollVote(poll: Poll, side: PollSideId, previous?: PollSideId): Poll {
  if (previous === side) return poll;
  const shift = (id: PollSideId) =>
    (side === id ? 1 : 0) - (previous === id ? 1 : 0);
  return {
    ...poll,
    a: { ...poll.a, votes: Math.max(poll.a.votes + shift("a"), 0) },
    b: { ...poll.b, votes: Math.max(poll.b.votes + shift("b"), 0) },
    updated: "just now",
  };
}

function readStored(): PersistedState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      signedIn: Boolean(parsed.signedIn),
      profile: parsed.profile ?? null,
      votes: parsed.votes ?? {},
      pollVotes: parsed.pollVotes ?? {},
      facetAnswers: parsed.facetAnswers ?? {},
      follows: Array.isArray(parsed.follows) ? parsed.follows : [],
      helpful: Array.isArray(parsed.helpful) ? parsed.helpful : [],
      replies: Array.isArray(parsed.replies) ? parsed.replies : [],
      created: Array.isArray(parsed.created) ? parsed.created : [],
      createdPolls: Array.isArray(parsed.createdPolls) ? parsed.createdPolls : [],
    };
  } catch {
    return EMPTY;
  }
}

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<PendingVote | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Hydrate after mount so server and first client render agree.
  useEffect(() => {
    setState(readStored());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or a full quota — the prototype still works in-memory.
    }
  }, [state, ready]);

  const toast = useCallback((next: string) => setMessage(next), []);

  const displayName = state.profile?.name ?? "";

  const openAuth = useCallback(
    (mode: "signin" | "signup" = "signin", to?: string) => {
      setRedirectTo(to ?? null);
      setAuthMode(mode);
    },
    [],
  );

  const submitVote = useCallback(
    (topicId: string, vote: Sentiment, note: string) => {
      if (!state.signedIn) {
        // Hold the selection and draft; the modal resumes it after sign-in.
        setPending({ topicId, vote, note });
        setAuthMode("signin");
        return;
      }
      setState((prev) => ({
        ...prev,
        votes: {
          ...prev.votes,
          [topicId]: { vote, note, updatedAt: new Date().toISOString() },
        },
        // Topics created in-app have no seeded aggregate, so a vote on one is
        // the whole sample. Fixture topics keep their authored numbers.
        created: prev.created.map((e) =>
          e.id === topicId ? applyLocalVote(e, vote) : e,
        ),
      }));
      toast("Opinion recorded. Your vote is now part of the aggregate.");
    },
    [state.signedIn, toast],
  );

  const createTopic = useCallback(
    (draft: Omit<Topic, "createdBy" | "createdAt">) => {
      const topic: Topic = {
        ...draft,
        createdBy: state.profile?.name ?? "A participant",
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({ ...prev, created: [topic, ...prev.created] }));
      toast(`“${topic.name}” is live. It is open for votes now.`);
      return topic.id;
    },
    [state.profile, toast],
  );

  const createdTopic = useCallback(
    (id: string) => state.created.find((e) => e.id === id),
    [state.created],
  );

  const createPoll = useCallback(
    (draft: Omit<Poll, "closes"> & { closes?: string }) => {
      const poll: Poll = { closes: "Open-ended", ...draft };
      setState((prev) => ({ ...prev, createdPolls: [poll, ...prev.createdPolls] }));
      toast(`“${poll.question}” is live. It is open for votes now.`);
      return poll.id;
    },
    [toast],
  );

  const createdPoll = useCallback(
    (id: string) => state.createdPolls.find((p) => p.id === id),
    [state.createdPolls],
  );

  const isPollIdAvailable = useCallback(
    (id: string) => !FIXTURE_POLL_IDS.has(id) && !state.createdPolls.some((p) => p.id === id),
    [state.createdPolls],
  );

  const isIdAvailable = useCallback(
    (id: string) => !FIXTURE_IDS.has(id) && !state.created.some((e) => e.id === id),
    [state.created],
  );

  const completeAuth = useCallback(
    (details: AccountDetails, created: boolean) => {
      const profile: Profile = { ...details };
      setState((prev) => {
        const next: PersistedState = { ...prev, signedIn: true, profile };
        if (pending) {
          next.votes = {
            ...prev.votes,
            [pending.topicId]: {
              vote: pending.vote,
              note: pending.note,
              updatedAt: new Date().toISOString(),
            },
          };
        }
        return next;
      });

      const hadPending = pending !== null;
      const destination = redirectTo;
      setPending(null);
      setAuthMode(null);
      setRedirectTo(null);

      if (hadPending) {
        toast("Signed in — your draft was kept and your opinion is recorded.");
        return;
      }

      toast(
        created
          ? "Account created. You can vote, reply and create topics."
          : "Signed in. You can vote, reply and create topics.",
      );
      // Only entry points with nowhere to return to set a destination — the nav
      // button lands you in the catalog. Signing in mid-task stays put.
      if (destination) router.push(destination);
    },
    [pending, redirectTo, toast, router],
  );

  const submitPollVote = useCallback(
    (pollId: string, side: PollSideId, reason: string) => {
      if (!state.signedIn) {
        toast("Sign in to cast your vote in this poll.");
        setAuthMode("signin");
        return;
      }
      setState((prev) => {
        const already = prev.pollVotes[pollId];
        return {
          ...prev,
          pollVotes: {
            ...prev.pollVotes,
            [pollId]: { side, reason, updatedAt: new Date().toISOString() },
          },
          // Polls created in-app have no seeded tally, so a vote on one is the
          // whole sample. Fixture polls keep their authored counts.
          createdPolls: prev.createdPolls.map((poll) =>
            poll.id === pollId ? applyLocalPollVote(poll, side, already?.side) : poll,
          ),
        };
      });
      toast(
        reason.trim()
          ? "Vote recorded, and your reason is now next to it."
          : "Vote recorded. You can add a reason any time.",
      );
    },
    [state.signedIn, toast],
  );

  const clearPollVote = useCallback((pollId: string) => {
    setState((prev) => {
      const pollVotes = { ...prev.pollVotes };
      delete pollVotes[pollId];
      return { ...prev, pollVotes };
    });
  }, []);

  const clearVote = useCallback((topicId: string) => {
    setState((prev) => {
      const votes = { ...prev.votes };
      delete votes[topicId];
      return { ...prev, votes };
    });
  }, []);

  const answerFacet = useCallback(
    (topicId: string, facetId: string, optionId: string) => {
      setState((prev) => {
        const key = `${topicId}:${facetId}`;
        const facetAnswers = { ...prev.facetAnswers };
        // Clicking the selected answer again clears it.
        if (facetAnswers[key] === optionId) delete facetAnswers[key];
        else facetAnswers[key] = optionId;
        return { ...prev, facetAnswers };
      });
    },
    [],
  );

  const toggleFollow = useCallback(
    (topicId: string) => {
      setState((prev) => {
        const following = prev.follows.includes(topicId);
        toast(
          following
            ? "Unfollowed. You will stop getting updates for this topic."
            : "Following. New verified updates will show in your feed.",
        );
        return {
          ...prev,
          follows: following
            ? prev.follows.filter((id) => id !== topicId)
            : [...prev.follows, topicId],
        };
      });
    },
    [toast],
  );

  const toggleHelpful = useCallback(
    (opinionId: string) => {
      if (!state.signedIn) {
        toast("Sign in to mark an opinion helpful.");
        setAuthMode("signin");
        return;
      }
      setState((prev) => ({
        ...prev,
        helpful: prev.helpful.includes(opinionId)
          ? prev.helpful.filter((id) => id !== opinionId)
          : [...prev.helpful, opinionId],
      }));
    },
    [state.signedIn, toast],
  );

  const postReply = useCallback(
    (opinionId: string, text: string) => {
      const body = text.trim();
      if (!body) return false;
      if (!state.signedIn) {
        toast("Sign in to reply to this opinion.");
        setAuthMode("signin");
        return false;
      }
      const name = state.profile?.name || "You";
      setState((prev) => ({
        ...prev,
        replies: [
          ...prev.replies,
          {
            id: `${opinionId}-${prev.replies.length}-${Date.now()}`,
            opinionId,
            name,
            initials: initialsOf(name),
            text: body,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      toast("Reply posted.");
      return true;
    },
    [state.signedIn, state.profile, toast],
  );

  const repliesFor = useCallback(
    (opinionId: string) => state.replies.filter((r) => r.opinionId === opinionId),
    [state.replies],
  );

  const signOut = useCallback(() => {
    setState((prev) => ({ ...prev, signedIn: false, profile: null }));
    toast("Signed out. Your votes stay recorded on this device.");
  }, [toast]);

  const value = useMemo<PrototypeValue>(
    () => ({
      ...state,
      ready,
      displayName,
      submitVote,
      clearVote,
      submitPollVote,
      clearPollVote,
      answerFacet,
      toggleFollow,
      toggleHelpful,
      postReply,
      repliesFor,
      createTopic,
      createdTopic,
      isIdAvailable,
      createPoll,
      createdPoll,
      isPollIdAvailable,
      openAuth,
      signOut,
      toast,
    }),
    [
      state,
      ready,
      displayName,
      submitVote,
      clearVote,
      submitPollVote,
      clearPollVote,
      answerFacet,
      toggleFollow,
      toggleHelpful,
      postReply,
      repliesFor,
      createTopic,
      createdTopic,
      isIdAvailable,
      createPoll,
      createdPoll,
      isPollIdAvailable,
      openAuth,
      signOut,
      toast,
    ],
  );

  return (
    <PrototypeContext.Provider value={value}>
      {children}
      <AuthModal
        mode={authMode}
        heldVote={pending?.vote ?? null}
        heldNote={pending?.note ?? ""}
        onModeChange={setAuthMode}
        onCancel={() => {
          setAuthMode(null);
          setPending(null);
          setRedirectTo(null);
        }}
        onComplete={completeAuth}
      />
      <Toast message={message} onDone={() => setMessage(null)} />
    </PrototypeContext.Provider>
  );
}

export function usePrototype(): PrototypeValue {
  const ctx = useContext(PrototypeContext);
  if (!ctx) {
    throw new Error("usePrototype must be used inside <PrototypeProvider>");
  }
  return ctx;
}
