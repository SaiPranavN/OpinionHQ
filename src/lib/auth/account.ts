"use client";

/**
 * Every conversation this app has with Supabase Auth.
 *
 * One file so the flow is readable in one sitting, and so the two doors into an
 * account — the `/signin` page and the sheet that opens mid-vote — cannot drift
 * into calling different things.
 *
 * WHY THE SIGN-UP ORDER SURVIVED. The prototype settled on: name and address,
 * prove the address, then set a password, then demographics. That order is the
 * point — no account can exist against an address its owner never confirmed, and
 * a mistyped address fails before anybody has invested anything.
 *
 * The obvious mapping onto Supabase is `signUp({ email, password })`, and it
 * would have forced the password one step earlier and reordered the screens.
 * `signInWithOtp({ shouldCreateUser: true })` does not: it creates the account
 * from the address alone, emails a code, and leaves the password to be set
 * afterwards with `updateUser`. The four steps map one-to-one.
 *
 * ONE CONSEQUENCE, worth knowing rather than discovering. If the address already
 * has an account, step two is a passwordless *login* to it, and step three then
 * sets a new password. That is a password reset wearing a sign-up's clothes —
 * and it is legitimate, because it requires reading a code sent to that address,
 * which is exactly what a reset requires. `alreadyHadAccount` below is how the
 * UI can notice and say so instead of pretending it made something new.
 */

import type { Session, User } from "@supabase/supabase-js";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

export type AuthResult = { ok: true } | { ok: false; message: string };

const ok: AuthResult = { ok: true };
const fail = (message: string): AuthResult => ({ ok: false, message });

/**
 * Supabase's errors are written for developers. These are the handful a person
 * can actually act on; anything unlisted passes through, because a wrong-but-
 * specific message beats a friendly one that hides what happened.
 */
function readable(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("captcha")) {
    return "The bot check did not pass. Reload the page and try again.";
  }
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email or password is not right.";
  }
  if (m.includes("email not confirmed")) {
    return "This address has not been confirmed yet. Create your account to finish setting it up.";
  }
  if (m.includes("token has expired") || m.includes("expired")) {
    return "That code has expired. Ask for a new one.";
  }
  if (m.includes("invalid") && m.includes("token")) {
    return "That code is not right.";
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) {
    return "Too many attempts just now. Wait a minute and try again.";
  }
  if (m.includes("should be different from the old password")) {
    return "Pick a password you have not used on this account before.";
  }
  if (m.includes("provider is not enabled")) {
    return "Google sign-in is not switched on for this deployment yet.";
  }
  return message;
}

/* ------------------------------------------------------------- signing up */

/**
 * Step one. Creates the account from the address and emails a code.
 *
 * The display name rides along as user metadata so `handle_new_user` has it when
 * the trigger fires — otherwise the profile is created from the local part of
 * the address and has to be corrected a moment later.
 */
export async function startSignUp(
  email: string,
  displayName: string,
  captchaToken?: string,
): Promise<AuthResult> {
  const { error } = await supabaseBrowser().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
      data: { display_name: displayName.trim() },
      // Verified by Supabase against the project's captcha secret, not here.
      // Sent even when undefined so the shape of the call does not change
      // depending on configuration.
      ...(captchaToken ? { captchaToken } : {}),
    },
  });
  return error ? fail(readable(error.message)) : ok;
}

/** Sends another code for the same address. Same call; named for the caller. */
export async function resendSignUpCode(
  email: string,
  captchaToken?: string,
): Promise<AuthResult> {
  const { error } = await supabaseBrowser().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
      ...(captchaToken ? { captchaToken } : {}),
    },
  });
  return error ? fail(readable(error.message)) : ok;
}

export type ConfirmResult =
  | { ok: true; user: User; session: Session; alreadyHadAccount: boolean }
  | { ok: false; message: string };

/**
 * Step two. Exchanges the code for a session.
 *
 * `alreadyHadAccount` compares the account's creation time to now. A brand-new
 * account was created seconds ago by step one; anything older belonged to
 * somebody before this flow started, and the caller should say so rather than
 * announce it created an account it did not.
 */
export async function confirmSignUpCode(email: string, token: string): Promise<ConfirmResult> {
  const { data, error } = await supabaseBrowser().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email",
  });

  if (error) return { ok: false, message: readable(error.message) };
  if (!data.user || !data.session) {
    return { ok: false, message: "That code did not open a session. Ask for a new one." };
  }

  const createdAt = new Date(data.user.created_at).getTime();
  return {
    ok: true,
    user: data.user,
    session: data.session,
    alreadyHadAccount: Number.isFinite(createdAt) && Date.now() - createdAt > 5 * 60 * 1000,
  };
}

/** Step three. Requires the session step two opened. */
export async function setPassword(password: string): Promise<AuthResult> {
  const { error } = await supabaseBrowser().auth.updateUser({ password });
  return error ? fail(readable(error.message)) : ok;
}

/**
 * Whether the profile has the fields the cross-tabs are built from.
 *
 * The same three the callback checks, asked from the client so the password
 * step knows whether there is a details step still to do after it.
 */
export async function detailsAreComplete(): Promise<boolean> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profile_private")
    .select("dob, occupation, country, gender")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(data?.dob && data?.occupation && data?.country && data?.gender);
}

/* --------------------------------------------------------------- the profile */

export interface AccountDetailsInput {
  displayName?: string;
  dob?: string;
  mobile?: string;
  gender?: string;
  occupation?: string;
  country?: string;
  state?: string;
  city?: string;
  /**
   * Category ids from the last step. Omitted rather than empty when the caller
   * is not writing them — see `saveAccountDetails` for why the difference
   * matters.
   */
  interests?: readonly string[];
}

/**
 * Step four. The demographics every cross-tab is built from.
 *
 * Two writes because the data is in two tables, and it is in two tables on
 * purpose: `profiles` is what other people can read, `profile_private` is what
 * only its owner can. Both are row-level-secured to this account, so neither
 * call can touch somebody else's row however it is invoked.
 *
 * `place_id` is resolved from the state they picked, which is drawn from the
 * same registry topics and polls use — so an account's state and an artifact's
 * state are the same string by construction, and the geography cross-tab joins
 * cleanly instead of matching on prose.
 */
export async function saveAccountDetails(details: AccountDetailsInput): Promise<AuthResult> {
  const supabase = supabaseBrowser();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail("You are not signed in.");

  if (details.displayName?.trim()) {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: details.displayName.trim() })
      .eq("id", user.id);
    if (error) return fail(readable(error.message));
  }

  /**
   * `interests` is written only when the caller passed some.
   *
   * The demographics screen and the interests screen are two steps that both
   * end in this function, and the first of them knows nothing about the second.
   * Sending `interests: []` from the demographics step would wipe a list the
   * person had already chosen — which is exactly what happens to somebody
   * resuming a half-finished sign-up, the one case where the data is most
   * easily lost and least easily noticed. Undefined means "not my column"; an
   * explicit empty array is still respected, because deselecting everything is
   * a thing the picker can legitimately produce.
   */
  const patch: Database["public"]["Tables"]["profile_private"]["Update"] = {
    dob: details.dob || null,
    mobile: details.mobile?.trim() || null,
    gender: (details.gender || null) as never,
    occupation: details.occupation || null,
    country: details.country || null,
    state: details.state?.trim() || null,
    city: details.city?.trim() || null,
    place_id: placeFor(details.country, details.state),
  };
  if (details.interests) patch.interests = [...details.interests];

  const { error } = await supabase
    .from("profile_private")
    .update(patch)
    .eq("user_id", user.id);

  return error ? fail(readable(error.message)) : ok;
}

/**
 * Whether this account has ever picked any categories.
 *
 * Asked at sign-in so an account created before the interests step existed can
 * be offered it — otherwise their catalogs say "All" forever and the only way
 * to fix that is to know the dashboard has a panel for it.
 *
 * `true` ON ERROR, WHICH IS THE SAFE WRONG ANSWER. A deployment whose schema
 * predates the column fails this select outright, and the two ways to be wrong
 * are not symmetrical: answering "they have some" skips an offer, answering
 * "they have none" puts a picker in front of somebody every time they sign in,
 * attached to a save that cannot succeed.
 */
export async function hasSavedInterests(): Promise<boolean> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;

  const { data, error } = await supabase
    .from("profile_private")
    .select("interests")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return true;
  return (data?.interests?.length ?? 0) > 0;
}

/* --------------------------------------------------- not asking again */

const SKIP_KEY = "ohq.interests.offer.skipped";

/**
 * "Not now", remembered.
 *
 * IN THE BROWSER, NOT THE DATABASE, and that is the deliberate half. An empty
 * interest list is a legitimate answer — it means "open the catalogs on
 * everything" — so somebody who clears theirs on the dashboard would otherwise
 * be handed the same picker at every sign-in for the rest of time. What is
 * being recorded is not a fact about the account, it is that this browser has
 * already made the offer once; a column for it would be storing UI history
 * next to a date of birth.
 *
 * The cost is that the offer comes back on a new device. For a one-click
 * dismissal on a prompt somebody can also act on from their dashboard, that is
 * the right side to be wrong on.
 */
export function interestOfferSkipped(): boolean {
  try {
    return window.localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    // Private mode, or storage disabled. Offering is the better failure.
    return false;
  }
}

export function skipInterestOffer(): void {
  try {
    window.localStorage.setItem(SKIP_KEY, "1");
  } catch {
    // Nothing to do. They see the offer again next time, which is survivable.
  }
}

/**
 * Just the reading preferences, without touching a demographic.
 *
 * A separate call rather than a flag on the one above, because the two are
 * written at different moments by different screens and the demographics patch
 * sets eight columns to whatever the caller happens to be holding. Somebody
 * changing their interests later should not be able to blank their own date of
 * birth by way of a form that never showed it to them.
 */
export async function saveInterests(interests: readonly string[]): Promise<AuthResult> {
  const supabase = supabaseBrowser();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail("You are not signed in.");

  const { error } = await supabase
    .from("profile_private")
    .update({ interests: [...interests] })
    .eq("user_id", user.id);

  return error ? fail(readable(error.message)) : ok;
}

/**
 * Which node of the places tree an account sits at.
 *
 * Coarse on purpose. A city is not asked for as a picker, so the state is the
 * finest thing that can be resolved reliably, and a free-text city would produce
 * three spellings of Bengaluru in one breakdown. Anything outside India resolves
 * to `worldwide` until the registry grows past it — better an honest "not
 * placed" than a row invented from a country name.
 */
function placeFor(country?: string, state?: string): string {
  if (country !== "India") return "worldwide";
  if (!state?.trim()) return "india";
  const slug = state.trim().toLowerCase().replace(/\s+/g, "-");
  return INDIAN_STATE_IDS.has(slug) ? slug : "india";
}

/** Mirrors the `state`-level rows of `src/lib/places.ts`. */
const INDIAN_STATE_IDS = new Set([
  "andhra-pradesh", "assam", "bihar", "delhi", "goa", "gujarat", "haryana",
  "himachal-pradesh", "karnataka", "kerala", "madhya-pradesh", "maharashtra",
  "odisha", "punjab", "rajasthan", "tamil-nadu", "telangana", "uttarakhand",
  "uttar-pradesh", "west-bengal",
]);

/* --------------------------------------------------------------- Google */

/**
 * Which sign-in providers this deployment actually has.
 *
 * FOUND BY CLICKING THE BUTTON. `signInWithOAuth` does not check whether the
 * provider exists — it builds the authorize URL and navigates, so the refusal
 * arrives as a page of JSON on Supabase's domain, with the app's error handling
 * left behind on a page nobody is looking at any more. There is no return value
 * to inspect, because there is no return.
 *
 * So the question is asked in advance instead. `/auth/v1/settings` is a public
 * endpoint that reports the enabled providers, which means the button's presence
 * follows the deployment rather than an environment variable somebody has to
 * remember to flip on the day they configure Google.
 */
export async function enabledProviders(): Promise<{ google: boolean }> {
  try {
    const { url, key } = supabaseEnv();
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!response.ok) return { google: false };
    const settings = (await response.json()) as { external?: Record<string, boolean> };
    return { google: Boolean(settings.external?.google) };
  } catch {
    // Offline, or the project is unreachable. Hiding the button is the safer
    // wrong answer: a missing button is a smaller failure than one that leaves
    // for an error page.
    return { google: false };
  }
}

/**
 * Hands off to Google and comes back at `/auth/callback`.
 *
 * `next` is carried on the callback's query string rather than in local state,
 * because the round trip leaves this page entirely and whatever was in memory
 * does not survive it.
 */
export async function startGoogle(next: string): Promise<AuthResult> {
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabaseBrowser().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return error ? fail(readable(error.message)) : ok;
}

/* -------------------------------------------------------------- signing out */

export async function signOut(): Promise<void> {
  await supabaseBrowser().auth.signOut();
}
