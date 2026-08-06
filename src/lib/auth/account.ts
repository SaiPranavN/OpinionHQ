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

export type AuthResult = { ok: true } | { ok: false; message: string };

const ok: AuthResult = { ok: true };
const fail = (message: string): AuthResult => ({ ok: false, message });

/**
 * Supabase's errors are written for developers. These are the handful a person
 * can actually act on; anything unlisted passes through, because a wrong-but-
 * specific message beats a friendly one that hides what happened.
 */
function readable(message: string): string {
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
export async function startSignUp(email: string, displayName: string): Promise<AuthResult> {
  const { error } = await supabaseBrowser().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
      data: { display_name: displayName.trim() },
    },
  });
  return error ? fail(readable(error.message)) : ok;
}

/** Sends another code for the same address. Same call; named for the caller. */
export async function resendSignUpCode(email: string): Promise<AuthResult> {
  const { error } = await supabaseBrowser().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
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

/* --------------------------------------------------------------- the profile */

export interface AccountDetailsInput {
  displayName?: string;
  dob?: string;
  mobile?: string;
  occupation?: string;
  country?: string;
  state?: string;
  city?: string;
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

  const { error } = await supabase
    .from("profile_private")
    .update({
      dob: details.dob || null,
      mobile: details.mobile?.trim() || null,
      occupation: details.occupation || null,
      country: details.country || null,
      state: details.state?.trim() || null,
      city: details.city?.trim() || null,
      place_id: placeFor(details.country, details.state),
    })
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
