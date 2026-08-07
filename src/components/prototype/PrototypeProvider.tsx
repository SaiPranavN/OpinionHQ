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

import { useSession } from "@/components/auth/SessionProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AuthModal } from "@/components/prototype/AuthModal";
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

/**
 * WHO IS SIGNED IN IS NO LONGER IN HERE.
 *
 * It moved to `SessionProvider`, which reads it from Supabase. It has to: a
 * boolean in `localStorage` is a claim this browser makes about itself, and the
 * moment votes are written to a database rather than to this object, the
 * database is the only thing that can say whose they are. Everything below is
 * still the prototype's own store, and stays that way until the read models are
 * swapped over.
 */
interface PersistedState {
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
  /** From Supabase, via `SessionProvider`. Not from this store. */
  signedIn: boolean;
  /** The session account, in the shape the prototype's callers already read. */
  profile: Profile | null;
  displayName: string;
  /** Records a vote, or opens the sign-in modal holding it if signed out. */
  submitVote: (topicId: string, vote: Sentiment, note: string) => void;
  clearVote: (topicId: string) => void;
  /** Records a poll pick, opening the auth sheet first if signed out. */
  submitPollVote: (pollId: string, side: PollOptionId, reason: string) => Promise<void>;
  clearPollVote: (pollId: string) => Promise<void>;
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
   * Called once Supabase has already authenticated somebody.
   *
   * Not "sign this person in" — that has happened by the time this runs, in the
   * sheet or on `/signin`. This is the shared tail of both doors: write the vote
   * that was held while the sheet was open, say something, and navigate. Two
   * doors, one completion path, so the held vote cannot be resumed by one and
   * dropped by the other.
   */
  signInWith: (created: boolean) => void;
  signOut: () => Promise<void>;
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

function readStored(): PersistedState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
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
  const {
    signedIn,
    account,
    ready: sessionReady,
    signOut: endSession,
  } = useSession();
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState<PendingVote | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<ProFeature | null>(null);

  // Hydrate after mount so server and first client render agree.
  useEffect(() => {
    setState(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or a full quota — the prototype still works in-memory.
    }
  }, [state, hydrated]);

  /**
   * The visitor's own votes and aspect answers, from the database.
   *
   * ONE QUERY EACH, not one per topic. A card wants to know "did you vote on
   * this" while rendering, and asking per card would put sixty requests on the
   * wire for the catalog alone — so the whole set is fetched once when the
   * session settles and held as a cache.
   *
   * `localStorage` is not consulted, and votes recorded there before this build
   * are deliberately not migrated: they were cast against fixture topics that no
   * longer exist, by a browser rather than by an account. Importing them would
   * put unattributable votes into a real aggregate.
   */
  useEffect(() => {
    if (!sessionReady || !signedIn) {
      setState((prev) => ({ ...prev, votes: {}, facetAnswers: {}, pollVotes: {} }));
      return;
    }

    let cancelled = false;
    void (async () => {
      const supabase = supabaseBrowser();
      const [{ data: castVotes }, { data: answers }, { data: picks }] = await Promise.all([
        supabase.rpc("my_votes"),
        supabase.rpc("my_facet_answers"),
        supabase.rpc("my_poll_votes"),
      ]);
      if (cancelled) return;

      const votes: Record<string, CastVote> = {};
      for (const row of (castVotes ?? []) as {
        topic_slug: string;
        vote: Sentiment;
        body: string;
        updated_at: string;
      }[]) {
        votes[row.topic_slug] = {
          vote: row.vote,
          note: row.body,
          updatedAt: row.updated_at,
        };
      }

      const facetAnswers: FacetAnswers = {};
      for (const row of (answers ?? []) as {
        topic_slug: string;
        aspect_id: string;
        option_id: string;
      }[]) {
        // `topicSlug:aspectId` — the exact key the facet panel builds from the
        // topic it is rendering. Storing it any other way would leave every
        // question looking unanswered.
        facetAnswers[`${row.topic_slug}:${row.aspect_id}`] = row.option_id;
      }

      // The reason is not fetched here. It lives on the poll page, which reads
      // it server-side along with everyone else's, so caching a second copy in
      // the client would give the panel and the list below it two sources for
      // the same sentence.
      const pollVotes: Record<string, CastPollVote> = {};
      for (const row of (picks ?? []) as {
        poll_slug: string;
        option_slot: PollOptionId;
        updated_at: string;
      }[]) {
        pollVotes[row.poll_slug] = {
          side: row.option_slot,
          reason: "",
          updatedAt: row.updated_at,
        };
      }

      setState((prev) => ({ ...prev, votes, facetAnswers, pollVotes }));
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionReady, signedIn]);

  /**
   * Both halves have to have answered.
   *
   * Consumers use `ready` to decide whether to render a signed-out state, and
   * the local store settles a tick before Supabase does. Reporting ready on the
   * store alone made every page flash "Sign in" on reload for somebody who was
   * signed in the whole time.
   */
  const ready = hydrated && sessionReady;

  const toast = useCallback((next: string) => setMessage(next), []);

  /**
   * The session account in the shape this store's callers already read.
   *
   * Mapped rather than re-typed so `AskProvider` and the composers did not all
   * have to change on the same day the session became real. `email` is not on
   * `profiles` — it lives in `auth.users` and nothing in the app displays it —
   * so it comes through empty rather than being invented.
   */
  const profile = useMemo<Profile | null>(
    () =>
      account
        ? {
            name: account.displayName,
            email: "",
            username: account.username ?? undefined,
            dob: account.details.dob ?? undefined,
            mobile: account.details.mobile ?? undefined,
            occupation: account.details.occupation ?? undefined,
            country: account.details.country ?? undefined,
            state: account.details.state ?? undefined,
            city: account.details.city ?? undefined,
          }
        : null,
    [account],
  );

  const displayName = profile?.name ?? "";

  const openAuth = useCallback(
    (mode: "signin" | "signup" = "signin", to?: string) => {
      setRedirectTo(to ?? null);
      setAuthMode(mode);
    },
    [],
  );

  /**
   * Records a vote in Postgres, then updates the local cache.
   *
   * WRITE FIRST, CACHE SECOND. The optimistic order — paint it, then send it —
   * is tempting on a button this cheap, and wrong here: the row policies can
   * refuse (signed out, suspended, topic archived), and a UI that has already
   * said "recorded" cannot honestly take it back. So the database answers first
   * and the screen follows.
   *
   * The signature has not changed, which is the point. Every caller still says
   * `submitVote(slug, vote, note)`; only what happens inside did.
   */
  const submitVote = useCallback(
    async (topicId: string, vote: Sentiment, note: string) => {
      if (!signedIn) {
        // Hold the selection and draft; the modal resumes it after sign-in.
        setPending({ topicId, vote, note });
        setAuthMode("signin");
        return;
      }

      const { error } = await supabaseBrowser().rpc("cast_vote", {
        topic_slug: topicId,
        vote,
        body: note.trim(),
      });

      if (error) {
        toast(
          error.message.toLowerCase().includes("row-level security")
            ? "That topic is not open for voting."
            : error.message,
        );
        return;
      }

      setState((prev) => ({
        ...prev,
        votes: {
          ...prev.votes,
          [topicId]: { vote, note, updatedAt: new Date().toISOString() },
        },
      }));
      // The aggregate on the page was rendered on the server and is now one
      // vote out of date. Refreshing re-reads it rather than adding one here and
      // hoping the two agree.
      router.refresh();
      toast("Opinion recorded. Your vote is now part of the aggregate.");
    },
    [signedIn, toast, router],
  );

  const createTopic = useCallback(
    (draft: Omit<Topic, "createdBy" | "createdAt">) => {
      const topic: Topic = {
        ...draft,
        createdBy: profile?.name ?? "A participant",
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({ ...prev, created: [topic, ...prev.created] }));
      toast(`“${topic.name}” is live. It is open for votes now.`);
      return topic.id;
    },
    [profile, toast],
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

  /**
   * Called once authentication has already succeeded.
   *
   * IT NO LONGER SIGNS ANYBODY IN. Supabase did that before this runs, and
   * `SessionProvider` has already seen it — the sole job left here is the one
   * this callback always really had: not losing what somebody was in the middle
   * of. A vote held while the sheet was open is written now, and the caller is
   * sent back where they came from.
   */
  const completeAuth = useCallback(
    (created: boolean) => {
      if (pending) {
        setState((prev) => ({
          ...prev,
          votes: {
            ...prev.votes,
            [pending.topicId]: {
              vote: pending.vote,
              note: pending.note,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      }

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

  /**
   * Records a pick in Postgres, then updates the local cache.
   *
   * Write first, cache second — see `submitVote` for why. A poll adds one
   * refusal topics do not have: `closes_at`. The insert policy on `poll_votes`
   * checks it, so a poll that closed while the page was open refuses the vote
   * rather than accepting one after the deadline.
   *
   * The reason is a second call because it is a second row with its own policy
   * ("you may only explain a pick you actually made"), and that policy can only
   * pass once the vote exists.
   */
  const submitPollVote = useCallback(
    async (pollId: string, side: PollOptionId, reason: string) => {
      if (!signedIn) {
        toast("Sign in to cast your vote in this poll.");
        setAuthMode("signin");
        return;
      }

      const supabase = supabaseBrowser();
      const { error } = await supabase.rpc("cast_poll_vote", {
        poll_slug: pollId,
        option_slot: side,
      });

      if (error) {
        const message = error.message.toLowerCase();
        toast(
          message.includes("row-level security")
            ? "This poll is closed, or not open for voting."
            : error.message,
        );
        return;
      }

      const text = reason.trim();
      if (text) {
        const { error: reasonError } = await supabase.rpc("explain_poll_vote", {
          poll_slug: pollId,
          reason: text,
        });
        // The vote landed even if the reason did not, so this says which half
        // failed rather than implying the whole thing was lost.
        if (reasonError) {
          toast("Vote recorded, but your reason could not be saved.");
          setState((prev) => ({
            ...prev,
            pollVotes: {
              ...prev.pollVotes,
              [pollId]: { side, reason: "", updatedAt: new Date().toISOString() },
            },
          }));
          router.refresh();
          return;
        }
      } else {
        // Clearing the box withdraws the reason, rather than leaving the old
        // text sitting under a pick it may no longer explain.
        await supabase.rpc("retract_poll_reason", { poll_slug: pollId });
      }

      setState((prev) => ({
        ...prev,
        pollVotes: {
          ...prev.pollVotes,
          [pollId]: { side, reason: text, updatedAt: new Date().toISOString() },
        },
      }));
      router.refresh();
      toast(
        text
          ? "Vote recorded, and your reason is now next to it."
          : "Vote recorded. You can add a reason any time.",
      );
    },
    [signedIn, toast, router],
  );

  const clearPollVote = useCallback(
    async (pollId: string) => {
      const { error } = await supabaseBrowser().rpc("withdraw_poll_vote", {
        poll_slug: pollId,
      });
      if (error) {
        toast(error.message);
        return;
      }
      setState((prev) => {
        const pollVotes = { ...prev.pollVotes };
        delete pollVotes[pollId];
        return { ...prev, pollVotes };
      });
      router.refresh();
      toast("Vote withdrawn.");
    },
    [toast, router],
  );

  const clearVote = useCallback(
    async (topicId: string) => {
      const { error } = await supabaseBrowser().rpc("withdraw_vote", { topic_slug: topicId });
      if (error) {
        toast(error.message);
        return;
      }
      setState((prev) => {
        const votes = { ...prev.votes };
        delete votes[topicId];
        return { ...prev, votes };
      });
      router.refresh();
    },
    [toast, router],
  );

  /**
   * Answers one aspect, or clears it by choosing the same option again.
   *
   * `facetId` is the aspect's database id — `Facet.id` carries it, mapped in
   * `lib/topics/rows.ts` — so nothing has to resolve a label here. The stored
   * key stays `topicId:facetId` because that is what the facet panel reads, and
   * changing it would have been a change to a component this rewrite otherwise
   * did not touch.
   */
  const answerFacet = useCallback(
    async (topicId: string, facetId: string, optionId: string) => {
      if (!signedIn) {
        toast("Sign in to answer the questions under this topic.");
        setAuthMode("signin");
        return;
      }

      const supabase = supabaseBrowser();
      const key = `${topicId}:${facetId}`;
      const clearing = state.facetAnswers[key] === optionId;

      const { error } = clearing
        ? await supabase.rpc("clear_aspect", { aspect: facetId })
        : await supabase.rpc("answer_aspect", { aspect: facetId, choice: optionId });

      if (error) {
        toast(error.message);
        return;
      }

      setState((prev) => {
        const facetAnswers = { ...prev.facetAnswers };
        if (clearing) delete facetAnswers[key];
        else facetAnswers[key] = optionId;
        return { ...prev, facetAnswers };
      });
      router.refresh();
    },
    [signedIn, state.facetAnswers, toast, router],
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
      if (!signedIn) {
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
    [signedIn, toast],
  );

  const postReply = useCallback(
    (opinionId: string, text: string) => {
      const body = text.trim();
      if (!body) return false;
      if (!signedIn) {
        toast("Sign in to reply to this opinion.");
        setAuthMode("signin");
        return false;
      }
      const name = profile?.name || "You";
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
    [signedIn, profile, toast],
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
      if (!signedIn) {
        setAuthMode("signin");
        return;
      }
      setUpgrade(feature);
    },
    [signedIn],
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
      if (!signedIn) {
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
      const name = profile?.name || "You";
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
        authorLine: profile?.occupation || "Pro contributor",
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
    [signedIn, state.pro, profile, toast],
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
      if (!signedIn) {
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
    [signedIn, toast],
  );

  const blockChoice = useCallback(
    (contributionId: string, blockId: string) =>
      state.blockChoices[`${contributionId}:${blockId}`],
    [state.blockChoices],
  );

  const toggleSave = useCallback(
    (contributionId: string) => {
      if (!signedIn) {
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
    [signedIn, toast],
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
      if (!signedIn) {
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
    [signedIn, toast],
  );

  const repliesFor = useCallback(
    (opinionId: string) => state.replies.filter((r) => r.opinionId === opinionId),
    [state.replies],
  );

  /**
   * Ends the Supabase session, and leaves this store alone.
   *
   * The votes and drafts below are still keyed to a browser rather than to an
   * account, so clearing them on sign-out would throw away work that signing
   * back in would not restore. The wording says so, and stops being true the
   * moment the read models move onto the database — at which point this should
   * clear the local store instead.
   */
  const signOut = useCallback(async () => {
    await endSession();
    toast("Signed out. Your votes stay recorded on this device.");
  }, [endSession, toast]);

  const value = useMemo<PrototypeValue>(
    () => ({
      ...state,
      ready,
      signedIn,
      profile,
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
      signedIn,
      profile,
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
