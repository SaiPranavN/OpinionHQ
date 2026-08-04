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
import { UpgradeModal } from "@/components/prototype/UpgradeModal";
import { isPublishable } from "@/lib/contributions";
import type { ProFeature } from "@/lib/entitlements";
import { isUsablePoll } from "@/lib/derive-poll";
import { POLLS as FIXTURE_POLLS } from "@/lib/sample-data/polls";
import { TOPICS as FIXTURE_TOPICS } from "@/lib/sample-data/topics";
import {
  checkPollDuplicate,
  signPoll,
  type DuplicateVerdict,
  type PollSignatureInput,
} from "@/lib/signature";
import type {
  Opinion,
  Poll,
  PollOptionId,
  ProReaction,
  ProSection,
  Sentiment,
  Topic,
} from "@/lib/types";

/**
 * Bumped whenever a persisted record changes shape. A poll saved when a poll
 * still had two fixed sides (`{ a, b }`) has no `options` array, and decorating
 * it crashes the catalog — so the key carries the schema rather than the code
 * carrying a migration for a prototype's throwaway localStorage.
 *
 * v6 adds `place` to topics and polls. A record written before it has no place
 * at all, and inventing one would put an artifact somewhere its author never
 * claimed.
 */
const STORAGE_KEY = "opinionhq.prototype.v6";

export interface CastVote {
  vote: Sentiment;
  note: string;
  updatedAt: string;
}

/** A pick in a head-to-head poll, plus the optional written reason. */
export interface CastPollVote {
  side: PollOptionId;
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
  /** Set when they signed in with a username rather than an address. */
  username?: string;
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

  /* ------------------------------------------------------------ Pro ---- */

  /**
   * Whether this account can build Pro contributions.
   *
   * Instant in this build, exactly like verification in Ask Verified: a
   * billing flow between the reviewer and the workflow they are trying to walk
   * teaches nothing. In production this is a subscription state read from the
   * server, and nothing about the composer changes.
   */
  pro: boolean;
  /** Pro contributions this visitor published, newest first. */
  contributions: Opinion[];
  /** Unpublished section drafts, keyed by topic. Survives a reload. */
  proDrafts: Record<string, ProSection[]>;
  /**
   * Responses to embedded interactive blocks, keyed `contributionId:blockId`.
   *
   * A slice of its own, next to `votes` rather than inside it, because these
   * two must never be confused: `votes` moves the topic's headline number and
   * this cannot. Keeping them in separate fields means a future aggregate
   * cannot reach the wrong one by accident.
   */
  blockChoices: Record<string, string>;
  /** Contributions this visitor saved. */
  saved: string[];
  /** One reaction per contribution — see `react`. */
  contributionReactions: Record<string, ProReaction>;
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
  pro: false,
  contributions: [],
  proDrafts: {},
  blockChoices: {},
  saved: [],
  contributionReactions: {},
};

interface PrototypeValue extends PersistedState {
  ready: boolean;
  displayName: string;
  /** Records a vote, or opens the sign-in modal holding it if signed out. */
  submitVote: (topicId: string, vote: Sentiment, note: string) => void;
  clearVote: (topicId: string) => void;
  /** Records a poll pick, opening the auth sheet first if signed out. */
  submitPollVote: (pollId: string, side: PollOptionId, reason: string) => void;
  clearPollVote: (pollId: string) => void;
  answerFacet: (topicId: string, facetId: string, optionId: string) => void;
  toggleFollow: (topicId: string) => void;
  toggleHelpful: (opinionId: string) => void;
  postReply: (opinionId: string, text: string) => boolean;
  repliesFor: (opinionId: string) => PostedReply[];

  /* ------------------------------------------------------------ Pro ---- */

  /**
   * Opens the subscribe sheet, naming the feature that asked for it.
   *
   * Every gate in the app calls this rather than rendering its own paywall, so
   * there is one sheet, one price and one place to change either.
   */
  openUpgrade: (feature: ProFeature) => void;
  subscribePro: () => void;
  cancelPro: () => void;
  /** Pro contributions this visitor published on one topic, newest first. */
  contributionsFor: (topicId: string) => Opinion[];
  /** Publishes a section draft as a contribution. Returns its id. */
  publishPro: (topicId: string, sections: ProSection[], vote: Sentiment) => string | null;
  /** Rewrites an already-published contribution (brief §5). */
  editPro: (contributionId: string, sections: ProSection[]) => void;
  saveProDraft: (topicId: string, sections: ProSection[]) => void;
  discardProDraft: (topicId: string) => void;
  proDraftFor: (topicId: string) => ProSection[] | undefined;
  /** Answers an embedded block. Never touches topic sentiment. */
  chooseBlock: (contributionId: string, blockId: string, optionId: string) => void;
  blockChoice: (contributionId: string, blockId: string) => string | undefined;
  toggleSave: (contributionId: string) => void;
  /** Sets or clears this visitor's reaction. One at a time. */
  react: (contributionId: string, reaction: ProReaction) => void;
  /** Publishes a composer draft and returns the id it was given. */
  createTopic: (draft: Omit<Topic, "createdBy" | "createdAt">) => string;
  createdTopic: (id: string) => Topic | undefined;
  /** True when this id is not taken by a fixture or an earlier draft. */
  isIdAvailable: (id: string) => boolean;
  /**
   * Publishes a poll draft — or refuses it, when the same poll already exists.
   *
   * Returns a result rather than an id so the refusal cannot be mistaken for a
   * success. `existingId` is the poll the author should be sent to instead:
   * their participation belongs on that one, which is the whole point of
   * refusing this one.
   */
  createPoll: (
    draft: Omit<Poll, "closes"> & { closes?: string },
  ) => { ok: true; id: string } | { ok: false; existingId: string };
  createdPoll: (id: string) => Poll | undefined;
  isPollIdAvailable: (id: string) => boolean;
  /** Live duplicate verdict for a draft, so the composer can warn before publish. */
  pollDuplicate: (candidate: PollSignatureInput) => DuplicateVerdict;
  /**
   * Opens the auth sheet directly. `redirectTo` is for entry points that have
   * nowhere to return to — the nav button sends you to the catalog. Callers
   * that opened it mid-task (voting, replying, the composer) omit it so the
   * visitor lands back where they were.
   */
  openAuth: (mode?: "signin" | "signup", redirectTo?: string) => void;
  /**
   * Completes a sign-in from outside the sheet.
   *
   * The `/signin` page has its own form and does its own navigation, so it
   * needs the same completion path the modal uses rather than a second one —
   * this is that path, and it still resumes a held vote if one exists.
   */
  signInWith: (details: AccountDetails, created: boolean) => void;
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
function applyLocalPollVote(
  poll: Poll,
  side: PollOptionId,
  previous?: PollOptionId,
): Poll {
  if (previous === side) return poll;
  return {
    ...poll,
    options: poll.options.map((option) => {
      const shift = (side === option.id ? 1 : 0) - (previous === option.id ? 1 : 0);
      return shift === 0
        ? option
        : { ...option, votes: Math.max(option.votes + shift, 0) };
    }),
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
      // Belt as well as braces: the key bump above handles the known shape
      // change, but a half-written record or a tab still running older code
      // would otherwise take down every poll on the catalog, not just its own.
      createdPolls: Array.isArray(parsed.createdPolls)
        ? parsed.createdPolls.filter(isUsablePoll)
        : [],
      pro: Boolean(parsed.pro),
      // A stored contribution with no sections would render as an empty Pro
      // card — a headline is the one thing publishing requires, so a record
      // without one never existed and should not be revived.
      contributions: Array.isArray(parsed.contributions)
        ? parsed.contributions.filter((c) => isPublishable(c.sections ?? []))
        : [],
      proDrafts: parsed.proDrafts ?? {},
      blockChoices: parsed.blockChoices ?? {},
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      contributionReactions: parsed.contributionReactions ?? {},
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
  const [upgrade, setUpgrade] = useState<ProFeature | null>(null);

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

  /**
   * Every poll a duplicate could collide with — fixtures plus anything created
   * in this session, signed once per change rather than per keystroke.
   */
  const signedPolls = useMemo(
    () => [...FIXTURE_POLLS, ...state.createdPolls].map(signPoll),
    [state.createdPolls],
  );

  const pollDuplicate = useCallback(
    (candidate: PollSignatureInput) => checkPollDuplicate(candidate, signedPolls),
    [signedPolls],
  );

  /**
   * Publishes a poll, unless it already exists.
   *
   * The check is here and not only in the composer. A rule enforced on the
   * button is a rule that holds until somebody adds a second way to create a
   * poll — an import, a duplicate-this action, a seeded demo — and this is the
   * one control standing between the catalog and forty cards asking the same
   * thing after a news event.
   */
  const createPoll = useCallback<PrototypeValue["createPoll"]>(
    (draft) => {
      const verdict = checkPollDuplicate(draft, signedPolls);
      if (verdict.kind === "duplicate") {
        toast("That poll already exists. Your vote belongs on the original.");
        return { ok: false, existingId: verdict.existing.id };
      }
      const poll: Poll = { closes: "Open-ended", ...draft };
      setState((prev) => ({ ...prev, createdPolls: [poll, ...prev.createdPolls] }));
      toast(`“${poll.question}” is live. It is open for votes now.`);
      return { ok: true, id: poll.id };
    },
    [signedPolls, toast],
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
    (pollId: string, side: PollOptionId, reason: string) => {
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

  /* ------------------------------------------------------------------ Pro */

  /**
   * Reaching for a Pro feature.
   *
   * Signing in comes first when they are signed out — a subscribe sheet shown
   * to somebody with no account asks them to buy something they cannot yet
   * own, and they would have to go through auth afterwards anyway.
   */
  const openUpgrade = useCallback(
    (feature: ProFeature) => {
      if (!state.signedIn) {
        setAuthMode("signin");
        return;
      }
      setUpgrade(feature);
    },
    [state.signedIn],
  );

  const subscribePro = useCallback(() => {
    setState((prev) => ({ ...prev, pro: true }));
    setUpgrade(null);
    toast("Pro is on. Unlimited questions, and the rich composer is available.");
  }, [toast]);

  /**
   * Cancelling takes the tools away and leaves the work alone.
   *
   * Anything already published stays published. Retracting somebody's
   * contributions because they stopped paying would make the archive a
   * function of the billing state, and the reader who found a contribution
   * useful is not party to that arrangement.
   */
  const cancelPro = useCallback(() => {
    setState((prev) => ({ ...prev, pro: false }));
    toast("Pro cancelled. Everything you published stays published.");
  }, [toast]);

  const contributionsFor = useCallback(
    (topicId: string) => state.contributions.filter((c) => c.topicId === topicId),
    [state.contributions],
  );

  /**
   * Publishes a draft.
   *
   * The contribution is written into the same shape as every fixture opinion —
   * same fields, same reply key, same helpful key — with `format: "pro"` and
   * its sections attached. That is what puts it in one feed with everything
   * else rather than in a parallel one.
   *
   * Counts start at zero. A published contribution has been read by nobody,
   * and seeding it with engagement would be the one lie this section cannot
   * afford.
   */
  const publishPro = useCallback<PrototypeValue["publishPro"]>(
    (topicId, sections, vote) => {
      if (!state.signedIn) {
        toast("Sign in to publish a contribution.");
        setAuthMode("signin");
        return null;
      }
      if (!state.pro) {
        toast("Pro tools are needed to build a rich contribution.");
        return null;
      }
      if (!isPublishable(sections)) {
        toast("A contribution needs a headline before it can be published.");
        return null;
      }
      const name = state.profile?.name || "You";
      const id = `pro-${topicId}-${Date.now().toString(36)}`;
      const contribution: Opinion = {
        id,
        topicId,
        name: `${name} (you)`,
        initials: initialsOf(name),
        vote,
        text: "",
        time: "Just now",
        helpful: 0,
        replies: 0,
        format: "pro",
        sections: sections.map((section, i) => ({ ...section, position: i })),
        authorLine: state.profile?.occupation || "Pro contributor",
        saves: 0,
      };
      setState((prev) => {
        const rest = Object.fromEntries(
          Object.entries(prev.proDrafts).filter(([key]) => key !== topicId),
        );
        return { ...prev, contributions: [contribution, ...prev.contributions], proDrafts: rest };
      });
      toast("Published. It sits in the same conversation as every other opinion.");
      return id;
    },
    [state.signedIn, state.pro, state.profile, toast],
  );

  const editPro = useCallback<PrototypeValue["editPro"]>(
    (contributionId, sections) => {
      if (!isPublishable(sections)) {
        toast("A contribution needs a headline.");
        return;
      }
      setState((prev) => ({
        ...prev,
        contributions: prev.contributions.map((c) =>
          c.id === contributionId
            ? { ...c, sections: sections.map((s, i) => ({ ...s, position: i })) }
            : c,
        ),
      }));
      toast("Updated.");
    },
    [toast],
  );

  const saveProDraft = useCallback<PrototypeValue["saveProDraft"]>((topicId, sections) => {
    setState((prev) => ({ ...prev, proDrafts: { ...prev.proDrafts, [topicId]: sections } }));
  }, []);

  const discardProDraft = useCallback((topicId: string) => {
    setState((prev) => {
      const rest = Object.fromEntries(
          Object.entries(prev.proDrafts).filter(([key]) => key !== topicId),
        );
      return { ...prev, proDrafts: rest };
    });
  }, []);

  const proDraftFor = useCallback(
    (topicId: string) => state.proDrafts[topicId],
    [state.proDrafts],
  );

  /**
   * Answering an embedded block.
   *
   * Writes to `blockChoices` and to nothing else. No call to `submitVote`, no
   * touch of `votes`, no path from here to the topic's sentiment split — which
   * is the whole contract of §9 and is asserted by a test rather than trusted.
   */
  const chooseBlock = useCallback<PrototypeValue["chooseBlock"]>(
    (contributionId, blockId, optionId) => {
      if (!state.signedIn) {
        toast("Sign in to answer this.");
        setAuthMode("signin");
        return;
      }
      setState((prev) => {
        const key = `${contributionId}:${blockId}`;
        const next = { ...prev.blockChoices };
        if (next[key] === optionId) delete next[key];
        else next[key] = optionId;
        return { ...prev, blockChoices: next };
      });
    },
    [state.signedIn, toast],
  );

  const blockChoice = useCallback(
    (contributionId: string, blockId: string) =>
      state.blockChoices[`${contributionId}:${blockId}`],
    [state.blockChoices],
  );

  const toggleSave = useCallback(
    (contributionId: string) => {
      if (!state.signedIn) {
        toast("Sign in to save this.");
        setAuthMode("signin");
        return;
      }
      setState((prev) => ({
        ...prev,
        saved: prev.saved.includes(contributionId)
          ? prev.saved.filter((id) => id !== contributionId)
          : [...prev.saved, contributionId],
      }));
    },
    [state.signedIn, toast],
  );

  /**
   * One reaction per person per contribution.
   *
   * Insightful, Useful and Well explained are not mutually exclusive as words,
   * but letting one reader press all three turns three counts into one count
   * printed three times. Choosing forces the reader to say which of them they
   * actually mean, which is the only reason to have three.
   */
  const react = useCallback(
    (contributionId: string, reaction: ProReaction) => {
      if (!state.signedIn) {
        toast("Sign in to react.");
        setAuthMode("signin");
        return;
      }
      setState((prev) => {
        const next = { ...prev.contributionReactions };
        if (next[contributionId] === reaction) delete next[contributionId];
        else next[contributionId] = reaction;
        return { ...prev, contributionReactions: next };
      });
    },
    [state.signedIn, toast],
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
      openUpgrade,
      subscribePro,
      cancelPro,
      contributionsFor,
      publishPro,
      editPro,
      saveProDraft,
      discardProDraft,
      proDraftFor,
      chooseBlock,
      blockChoice,
      toggleSave,
      react,
      createTopic,
      createdTopic,
      isIdAvailable,
      createPoll,
      createdPoll,
      isPollIdAvailable,
      pollDuplicate,
      openAuth,
      signInWith: completeAuth,
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
      openUpgrade,
      subscribePro,
      cancelPro,
      contributionsFor,
      publishPro,
      editPro,
      saveProDraft,
      discardProDraft,
      proDraftFor,
      chooseBlock,
      blockChoice,
      toggleSave,
      react,
      createTopic,
      createdTopic,
      isIdAvailable,
      createPoll,
      createdPoll,
      isPollIdAvailable,
      pollDuplicate,
      openAuth,
      completeAuth,
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
      <UpgradeModal
        feature={upgrade}
        onSubscribe={subscribePro}
        onCancel={() => setUpgrade(null)}
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
