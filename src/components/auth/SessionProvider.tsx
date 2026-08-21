"use client";

/**
 * Who is signed in, for the whole app.
 *
 * THIS IS THE FIRST REAL THING IN THE BUILD. Everything else — votes, follows,
 * drafts — is still the prototype's `localStorage`, and deliberately so: this
 * change makes accounts real without touching the parts that would need the read
 * models rewritten to go with them. `PrototypeProvider` reads `signedIn` from
 * here instead of from its own persisted flag, and nothing else about it moved.
 *
 * WHY A CONTEXT AND NOT A SERVER COMPONENT READ. The nav, the vote panel and the
 * sheet all need to know, they are client components, and they need to *react*
 * when it changes — a token refresh, a sign-out in another tab. `getUser()` in a
 * layout would answer once per navigation and go stale in between.
 *
 * `ready` exists so nothing renders a signed-out state before the answer is
 * known. Without it, every page flashes "Sign in" for a moment on reload for
 * somebody who is signed in, which reads as being logged out at random.
 */

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { enabledProviders } from "@/lib/auth/account";
import { readInterests } from "@/lib/interests";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CategoryId } from "@/lib/types";

/** The demographic half. Readable only by its owner — see the identity migration. */
export interface PrivateDetails {
  dob: string | null;
  mobile: string | null;
  occupation: string | null;
  country: string | null;
  gender: string | null;
  state: string | null;
  city: string | null;
  placeId: string | null;
  /**
   * Categories chosen at sign-up, in taxonomy order and already filtered to ids
   * that still exist. Empty for an account created before the step existed,
   * which is what the catalogs check before offering "For you".
   */
  interests: CategoryId[];
}

export interface Account {
  id: string;
  displayName: string;
  initials: string;
  username: string | null;
  headline: string;
  role: "member" | "editor" | "admin";
  suspended: boolean;
  /** True while a subscription is live. Not a role — see the hierarchy docs. */
  pro: boolean;
  details: PrivateDetails;
}

interface SessionValue {
  /** False until the first answer arrives. Nothing should render a signed-out
   *  state before this is true. */
  ready: boolean;
  user: User | null;
  account: Account | null;
  signedIn: boolean;
  displayName: string;
  /** True when an account exists but has not finished step four. */
  needsDetails: boolean;
  isEditor: boolean;
  isAdmin: boolean;
  /**
   * The categories this account chose, or empty when signed out.
   *
   * Exposed here rather than reached for through `account.details` so callers
   * get a *stable* array. `account?.details.interests ?? []` allocates a fresh
   * empty array on every render, which is a dependency that never compares
   * equal — enough to re-run a catalog's `useMemo` on every keystroke.
   */
  interests: CategoryId[];
  /**
   * Whether this deployment has Google configured. False until the answer
   * arrives, so a button that would lead to an error page is never rendered
   * during the gap.
   */
  googleEnabled: boolean;
  /** Re-reads the profile. Call after writing to it. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * One round trip, not three.
 *
 * `profile_private` and `subscriptions` are embedded through their foreign keys
 * rather than fetched separately, so signing in costs one request instead of
 * three sequential ones on a cold cache. Both are row-level-secured to this
 * account: the embed cannot widen what the caller was allowed to see.
 */
const PRIVATE_COLUMNS = "dob, mobile, occupation, gender, country, state, city, place_id";

const accountQuery = (withInterests: boolean) =>
  "id, display_name, initials, username, headline, role, suspended_at, " +
  `profile_private(${PRIVATE_COLUMNS}${withInterests ? ", interests" : ""}), ` +
  "subscriptions(status, current_period_end, revoked_at)";

/**
 * Whether this deployment's database has the `interests` column yet.
 *
 * ORDERING INSURANCE, AND IT EARNS ITS KEEP. Code ships when a branch is pushed;
 * a migration is applied by hand. So there is always a window where the new
 * bundle is live against the old schema, and PostgREST answers a select naming
 * an unknown column with an error for the *whole request* — not a null for that
 * one field. Without this, that window is not "interests quietly missing", it
 * is `loadAccount` bailing out, `account` staying null, and every signed-in
 * person on the site being shown a "Sign in" button until somebody runs the
 * migration. A reading preference is not worth that failure mode.
 *
 * One retry, and the answer is remembered for the tab: a schema does not gain
 * the column halfway through somebody's visit, and re-asking on every profile
 * read would double the requests for the life of the session.
 */
let interestsColumnExists = true;

type PrivateRow = {
  dob: string | null;
  mobile: string | null;
  occupation: string | null;
  gender: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  place_id: string | null;
  interests: string[] | null;
};

/** One frozen empty array, so "signed out" is a stable dependency. */
const NO_INTERESTS: CategoryId[] = [];

/** PostgREST returns an embedded one-to-one as either an object or a 1-length
 *  array depending on how it inferred the relationship. Take either. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const loadAccount = useCallback(async (id: string) => {
    const read = (withInterests: boolean) =>
      supabaseBrowser()
        .from("profiles")
        .select(accountQuery(withInterests))
        .eq("id", id)
        .maybeSingle();

    let { data, error } = await read(interestsColumnExists);

    // A schema that predates the interests migration. Ask again without it
    // rather than leaving a signed-in person looking at a signed-out site.
    if (error && interestsColumnExists) {
      interestsColumnExists = false;
      ({ data, error } = await read(false));
    }

    if (error || !data) {
      setAccount(null);
      return;
    }

    // Through `unknown`: PostgREST types an embedded select as a union that
    // includes a parse-error shape, and the generated types cannot narrow it
    // here. The reads below are all defensive anyway.
    const row = data as unknown as Record<string, unknown>;
    const priv = one<PrivateRow>(row.profile_private as PrivateRow | PrivateRow[] | null);
    const sub = one<{
      status: string;
      current_period_end: string | null;
      revoked_at: string | null;
    }>(row.subscriptions as never);

    setAccount({
      id: row.id as string,
      displayName: (row.display_name as string) ?? "",
      initials: (row.initials as string) ?? "?",
      username: (row.username as string) ?? null,
      headline: (row.headline as string) ?? "",
      role: (row.role as Account["role"]) ?? "member",
      suspended: Boolean(row.suspended_at),
      // The three conditions `is_pro()` applies, in the same order, including
      // the revocation check. This is a mirror of a SQL function and it will
      // drift if that function changes — the row policies are what actually
      // enforce any of it, so a stale answer here shows a button that the
      // database then refuses, rather than letting anything through.
      pro:
        sub !== null &&
        !sub.revoked_at &&
        (sub.status === "active" || sub.status === "trialing") &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date()),
      details: {
        dob: priv?.dob ?? null,
        mobile: priv?.mobile ?? null,
        occupation: priv?.occupation ?? null,
        gender: (priv?.gender as string | null) ?? null,
        country: priv?.country ?? null,
        state: priv?.state ?? null,
        city: priv?.city ?? null,
        placeId: priv?.place_id ?? null,
        interests: readInterests(priv?.interests),
      },
    });
  }, []);

  useEffect(() => {
    // A checkout with no .env.local runs the prototype exactly as before rather
    // than throwing on every page. `ready` still flips, so nothing hangs.
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    const supabase = supabaseBrowser();
    let cancelled = false;

    // Asked once per mount, not per render of a sign-in surface. Which providers
    // a project has does not change while somebody is looking at the page.
    void enabledProviders().then(({ google }) => {
      if (!cancelled) setGoogleEnabled(google);
    });

    // `getUser` on the way in, not `getSession`: the cookie is
    // attacker-controllable and only the auth server can say the token in it is
    // real. After that the listener is enough — its events carry a session the
    // library has already validated.
    void supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      setUser(data.user ?? null);
      if (data.user) await loadAccount(data.user.id);
      if (!cancelled) setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setAccount(null);
        setReady(true);
        return;
      }
      // TOKEN_REFRESHED fires on a timer and changes nothing about the profile;
      // re-fetching on it would put a request on the wire every hour per tab for
      // data that did not move.
      if (event !== "TOKEN_REFRESHED") void loadAccount(nextUser.id);
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadAccount]);

  const refresh = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.getUser();
    setUser(data.user ?? null);
    if (data.user) await loadAccount(data.user.id);
    else setAccount(null);
  }, [loadAccount]);

  const doSignOut = useCallback(async () => {
    await supabaseBrowser().auth.signOut();
    setUser(null);
    setAccount(null);
  }, []);

  const value = useMemo<SessionValue>(() => {
    const details = account?.details;
    return {
      ready,
      user,
      account,
      signedIn: Boolean(user),
      displayName: account?.displayName ?? "",
      // The four the cross-tabs are built from. Mobile is not on this list —
      // it is for account recovery and nothing charts it.
      //
      // `gender` is here so accounts created before the column existed are
      // routed back to the details step to fill it in, rather than sitting
      // permanently outside the gender breakdown with no way to opt in.
      needsDetails:
        Boolean(user) &&
        (!details?.dob || !details?.occupation || !details?.country || !details?.gender),
      isEditor: account?.role === "editor" || account?.role === "admin",
      isAdmin: account?.role === "admin",
      interests: details?.interests ?? NO_INTERESTS,
      googleEnabled,
      refresh,
      signOut: doSignOut,
    };
  }, [ready, user, account, googleEnabled, refresh, doSignOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>.");
  return value;
}
