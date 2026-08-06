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
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** The demographic half. Readable only by its owner — see the identity migration. */
export interface PrivateDetails {
  dob: string | null;
  mobile: string | null;
  occupation: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  placeId: string | null;
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
const ACCOUNT_QUERY =
  "id, display_name, initials, username, headline, role, suspended_at, " +
  "profile_private(dob, mobile, occupation, country, state, city, place_id), " +
  "subscriptions(status, current_period_end)";

type PrivateRow = {
  dob: string | null;
  mobile: string | null;
  occupation: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  place_id: string | null;
};

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
    const { data, error } = await supabaseBrowser()
      .from("profiles")
      .select(ACCOUNT_QUERY)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      setAccount(null);
      return;
    }

    // Through `unknown`: PostgREST types an embedded select as a union that
    // includes a parse-error shape, and the generated types cannot narrow it
    // here. The reads below are all defensive anyway.
    const row = data as unknown as Record<string, unknown>;
    const priv = one<PrivateRow>(row.profile_private as PrivateRow | PrivateRow[] | null);
    const sub = one<{ status: string; current_period_end: string | null }>(
      row.subscriptions as never,
    );

    setAccount({
      id: row.id as string,
      displayName: (row.display_name as string) ?? "",
      initials: (row.initials as string) ?? "?",
      username: (row.username as string) ?? null,
      headline: (row.headline as string) ?? "",
      role: (row.role as Account["role"]) ?? "member",
      suspended: Boolean(row.suspended_at),
      pro:
        sub !== null &&
        (sub.status === "active" || sub.status === "trialing") &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date()),
      details: {
        dob: priv?.dob ?? null,
        mobile: priv?.mobile ?? null,
        occupation: priv?.occupation ?? null,
        country: priv?.country ?? null,
        state: priv?.state ?? null,
        city: priv?.city ?? null,
        placeId: priv?.place_id ?? null,
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
      // The three the cross-tabs are built from. Mobile is not on this list —
      // it is for account recovery and nothing charts it.
      needsDetails:
        Boolean(user) && (!details?.dob || !details?.occupation || !details?.country),
      isEditor: account?.role === "editor" || account?.role === "admin",
      isAdmin: account?.role === "admin",
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
