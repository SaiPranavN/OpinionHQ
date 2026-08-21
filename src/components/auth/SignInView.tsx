"use client";

/**
 * `/signin` — signing in, and the whole account-creation flow.
 *
 * LAYOUT. The panel used to be vertically centred inside a forced full-height
 * grid, which is fine for a three-field sign-in and cuts the bottom off
 * everything taller — the details step ran past the fold with no way to reach
 * it. So the page scrolls normally now: the card sizes to its content, the
 * argument on the left is sticky so it stays put while a long step scrolls,
 * and below `lg` the card is the only thing on screen.
 *
 * CREATING AN ACCOUNT IS FIVE STEPS, in this order for a reason:
 *
 *   1. Name, address, and a bot check.
 *   2. Prove the address before anything is built on it.
 *   3. Set a password, twice.
 *   4. The demographics the product's charts are made of.
 *   5. What they actually want to read.
 *
 * Verifying before the password means a mistyped address fails while nobody has
 * invested anything, and — the part that matters on a product whose claim is
 * "one account, one vote" — no account can exist against an address its owner
 * never confirmed. An unverified account is a vote somebody manufactured.
 *
 * Step five is last because it is the one step that is pleasant to fill in and
 * the one step that costs nothing to get wrong: the demographics are what every
 * cross-tab is made of, and the interests only decide which chip a catalog
 * opens on. Ending on "pick what you like" rather than on a date of birth is
 * worth the ordering by itself.
 *
 * Google skips steps 2 and 3: an OAuth address arrives verified and there is no
 * password to set. It does not skip 4 or 5, because nothing in an OAuth profile
 * says where somebody lives, what they do, or what they came here to read — so
 * it comes back from `/auth/callback` at `?step=details` rather than at the
 * catalog.
 *
 * IT IS REAL NOW, and the order above survived the change. The obvious mapping
 * onto Supabase — `signUp({ email, password })` — would have forced the password
 * a step earlier and reordered the screens. `signInWithOtp` does not: it creates
 * the account from the address alone and leaves the password to `updateUser`
 * afterwards, so the steps map one to one. See `lib/auth/account.ts`.
 *
 * NOTHING HERE IS A PLACEHOLDER ANY MORE. The bot check is Cloudflare Turnstile
 * and its token is verified by the auth service, not by this page; the code is
 * emailed and verified server-side; the password is set against a proved
 * address; and the demographics land in Postgres.
 *
 * The captcha renders in BOTH modes. Enabling it on the project makes a token
 * mandatory on every auth endpoint, so showing the widget only on the sign-up
 * side left sign-in posting without one and being refused outright — which
 * reads as a wrong password rather than a missing widget.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CaptchaBox, type CaptchaState } from "@/components/auth/CaptchaBox";
import {
  IdentifierField,
  OrRule,
  PasswordField,
  authInput,
  AuthField,
  checkPassword,
  readIdentifier,
} from "@/components/auth/CredentialForm";
import { GoogleButton } from "@/components/auth/GoogleSignIn";
import { InterestPicker } from "@/components/auth/InterestPicker";
import { OtpInput } from "@/components/auth/OtpInput";
import {
  ProfileFields,
  ProfilePrivacyNote,
  type ProfileDetails,
} from "@/components/auth/ProfileFields";
import { useSession } from "@/components/auth/SessionProvider";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Brand } from "@/components/ui/Brand";
import {
  confirmSignUpCode,
  detailsAreComplete,
  hasSavedInterests,
  interestOfferSkipped,
  resendSignUpCode,
  saveAccountDetails,
  saveInterests,
  skipInterestOffer,
  setPassword as setAccountPassword,
  startGoogle,
  startSignUp,
} from "@/lib/auth/account";
import { signInWithIdentifier } from "@/lib/auth/actions";
import { safeNext, withWelcome } from "@/lib/auth/redirect";
import { interestsAreEnough, MIN_INTERESTS } from "@/lib/interests";
import type { CategoryId } from "@/lib/types";
import {
  CODE_LENGTH,
  MIN_PASSWORD_LENGTH,
  RESEND_SECONDS,
  hasErrors,
  passwordsMatch,
  scorePassword,
  stepPosition,
  validateDetails,
  type DetailErrors,
  type SignupStep,
} from "@/lib/auth/signup";

export function SignInView() {
  const router = useRouter();
  const params = useSearchParams();
  const { signedIn, ready, signInWith, displayName } = usePrototype();
  const { refresh, account, needsDetails, googleEnabled } = useSession();

  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  // `?step=…` is how `/auth/callback` resumes a sign-up that opened a session
  // before it finished.
  //
  //   details  — a first-time Google account: verified address, no password to
  //              set, and none of the demographics the cross-tabs need.
  //   password — somebody who opened the "or use this link instead" link in the
  //              code email. They are signed in and have no password, which is
  //              an account they cannot sign into again without a reset.
  //   interests — a complete account that predates the interests step. Nothing
  //              is missing except a reading preference, which is an offer
  //              rather than an obligation — see `offering` below. It is the
  //              one resume that cannot skip anything, because there is nothing
  //              after it but the page they were going to anyway.
  //
  // Only these three resume. Anything else starts at the beginning rather than
  // trusting a step name off a query string to skip verification.
  const resumeStep = params.get("step");
  const [step, setStep] = useState<SignupStep>(
    resumeStep === "details" || resumeStep === "password" || resumeStep === "interests"
      ? (resumeStep as SignupStep)
      : "account",
  );
  /**
   * The interests screen is an offer to an existing account, not step five.
   *
   * Same picker, different contract. In sign-up it is the last thing standing
   * between somebody and their account and it asks for at least one. Here the
   * account already exists and works — they were signing in to do something
   * else — so it gets its own heading and a way past it, and "Not now" is
   * remembered so the offer is made once per browser rather than at every
   * sign-in for the rest of time.
   */
  const [offering, setOffering] = useState(resumeStep === "interests");
  // Only the details resume implies Google. Arriving at the password step means
  // the opposite — a Google account has no password to set.
  const [viaGoogle, setViaGoogle] = useState(resumeStep === "details");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [profile, setProfile] = useState<ProfileDetails>({ country: "India" });
  const [interests, setInterests] = useState<CategoryId[]>([]);

  const [captcha, setCaptcha] = useState<CaptchaState>("idle");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  /**
   * Bumped whenever the token in hand is spent or abandoned.
   *
   * A Turnstile token covers one auth attempt. Supabase consumes it on
   * verification, so after sending a code, resending one, or signing in — pass
   * or fail — the next attempt needs a new one. Switching between "Sign in" and
   * "Create one" abandons the attempt the token was fetched for, which is the
   * case that was reported: the mode switch cleared the passed state, the
   * widget had already finished and had no reason to fire again, and the submit
   * button stayed disabled with no way to re-arm it.
   */
  const [captchaNonce, setCaptchaNonce] = useState(0);
  const refreshCaptcha = () => setCaptchaNonce((n) => n + 1);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState<string | null>(params.get("error"));
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({});
  const firstField = useRef<HTMLInputElement>(null);

  const next = safeNext(params.get("next"));
  const signup = mode === "signup";
  const strength = scorePassword(password);

  useEffect(() => {
    firstField.current?.focus();
  }, [mode, step]);

  // A Google account arriving at the details step already has a name; showing
  // it back beats an empty field they have to retype.
  useEffect(() => {
    if (viaGoogle && account?.displayName && !name) setName(account.displayName);
  }, [viaGoogle, account?.displayName, name]);

  // Resend cooldown. A code you can request forty times a second is a mail
  // provider's problem and an abuse vector; real deployments rate-limit this
  // server-side and this is the same rule where the build can hold it.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const reset = () => {
    setStep("account");
    setViaGoogle(false);
    setPassword("");
    setConfirm("");
    setCode("");
    setInterests([]);
    refreshCaptcha();
    setError(null);
    setDetailErrors({});
  };

  /**
   * The one exit.
   *
   * `refresh` before navigating, so the session context has the finished profile
   * by the time the destination renders — without it the nav shows "Sign in" for
   * a beat on a page reached by signing in, which reads as the sign-in failing.
   */
  const finish = async (created: boolean) => {
    setPassword("");
    setConfirm("");
    await refresh();
    signInWith(created);
    // A new account lands on the catalog carrying the flag that opens the
    // founding-member offer. An existing one goes exactly where it asked to.
    router.push(created ? withWelcome(next) : next);
  };

  /* ------------------------------------------------------------ step one */

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const read = readIdentifier(identifier);
    if ("error" in read) {
      setError(read.error);
      return;
    }

    if (!signup) {
      const bad = checkPassword(password);
      if (bad) {
        setError(bad);
        return;
      }
      setBusy(true);
      setError(null);
      const result = await signInWithIdentifier(identifier, password, captchaToken ?? undefined);
      setBusy(false);
      if (!result.ok) {
        // Supabase consumed the token verifying it, so a second attempt with
        // the same one is refused for the captcha rather than for the password.
        refreshCaptcha();
        setError(result.message);
        return;
      }

      // An account from before the interests step exists, has never been asked,
      // and has not waved the question away on this browser. Ask once, here,
      // where they are already stopped — the dashboard panel is the answer for
      // somebody who goes looking, and this is the answer for everybody else.
      if (!interestOfferSkipped() && !(await hasSavedInterests())) {
        setOffering(true);
        setStep("interests");
        return;
      }

      await finish(false);
      return;
    }

    if (!name.trim()) {
      setError("Add a display name — it is what signs your opinions.");
      return;
    }
    if (!read.email) {
      setError("Creating an account needs an email address, not a username.");
      return;
    }
    if (captcha !== "passed") {
      setError("Complete the bot check first.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await startSignUp(read.email, name, captchaToken ?? undefined);
    setBusy(false);
    refreshCaptcha();
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setCode("");
    setCooldown(RESEND_SECONDS);
    setStep("verify");
  };

  /* ------------------------------------------------------------ step two */

  /**
   * The code is checked by the auth server, not here.
   *
   * Which is what makes it worth anything: the old local comparison could be
   * read out of the page, and its attempt counter could be reset by reloading.
   * Supabase rate-limits and expires the token server-side, so the only thing
   * left to do here is show what it said.
   */
  const submitCode = async (entered = code) => {
    if (busy) return;
    if (entered.trim().length < CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits.`);
      return;
    }

    setBusy(true);
    setError(null);
    const result = await confirmSignUpCode(identifier, entered);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Somebody who already had an account has just proved they still control the
    // address, which is a password reset by another name. Legitimate, but not
    // "account created" — saying that would be a lie about what happened.
    if (result.alreadyHadAccount) {
      setError(null);
      setViaGoogle(false);
    }
    setStep("password");
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    const result = await resendSignUpCode(identifier, captchaToken ?? undefined);
    setBusy(false);
    refreshCaptcha();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCode("");
    setCooldown(RESEND_SECONDS);
    setError(null);
  };

  /* ---------------------------------------------------------- step three */

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (!strength.ok) {
      setError(strength.hints[0] ?? `Passwords are at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    const mismatch = passwordsMatch(password, confirm);
    if (mismatch) {
      setError(mismatch);
      return;
    }

    setBusy(true);
    setError(null);
    const result = await setAccountPassword(password);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }

    // Somebody resuming here already has an account and may well have filled in
    // their details long ago — they were sent back only because the password
    // was missing. Making them retype a date of birth they already gave would
    // be asking for the same information twice to fix a different problem.
    if (resumeStep === "password" && (await detailsAreComplete())) {
      await finish(false);
      return;
    }

    setBusy(false);
    setStep("details");
  };

  /* ----------------------------------------------------------- step four */

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const found = validateDetails(profile);
    setDetailErrors(found);
    if (hasErrors(found)) {
      setError("A few fields still need filling in.");
      return;
    }

    setBusy(true);
    setError(null);
    // No `interests` key at all, which is what stops this write blanking a list
    // chosen on a previous visit — see `saveAccountDetails`.
    const result = await saveAccountDetails({ ...profile, displayName: name.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep("interests");
  };

  /* ----------------------------------------------------------- step five */

  /**
   * The account is already complete by the time this screen is reached.
   *
   * Which is the point: step four wrote the demographics and the display name,
   * so somebody who closes the tab here has a working account with a "For you"
   * that falls back to showing everything. Nothing about this step can leave a
   * half-built account behind, and that is why it is the one placed last.
   */
  const submitInterests = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (!interestsAreEnough(interests)) {
      setError(
        MIN_INTERESTS === 1
          ? "Pick at least one — you can change these later."
          : `Pick at least ${MIN_INTERESTS}.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    const result = await saveInterests(interests);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // `false` when this was an offer: nothing was created, and `withWelcome`
    // opens the founding-member panel — which would be a strange thing to show
    // somebody who has had an account for months.
    await finish(!offering);
  };

  /** "Not now". Remembered, so it is asked once rather than at every sign-in. */
  const declineInterests = async () => {
    if (busy) return;
    skipInterestOffer();
    setBusy(true);
    await finish(false);
  };

  /** Leaves for Google and comes back at `/auth/callback`. */
  const withGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await startGoogle(next);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
    }
  };

  /* -------------------------------------------------------------- render */

  /**
   * Partway through creating an account in this tab, right now.
   *
   * THIS DISTINCTION IS THE WHOLE BUG THIS FIXES. Verifying the emailed code
   * opens a session, so `signedIn` turns true at step two — while the person is
   * still standing in the middle of the flow with a password and a profile left
   * to give. Without this, `unfinished` below turned true at exactly that
   * moment, and since the password screen renders only when `!unfinished`, step
   * three was suppressed and the form jumped from "verify email" straight to
   * "about you". The password was never asked for, so the account had none, so
   * the next sign-in had nothing to sign in with.
   *
   * A session is not evidence that sign-up finished. Being at a later step is.
   */
  /**
   * `step === "interests"` is on this list unconditionally, and it has to be.
   *
   * By the time that screen renders, the demographics have been written but the
   * session context has not been re-read — `refresh()` happens in `finish`, at
   * the very end. So `needsDetails` is still true, `unfinished` below would
   * still be true, and the details form would render *underneath* the interest
   * picker: the same person filling in the same date of birth twice on one
   * screen. It cannot be reached from a query string either — `?step=` accepts
   * only `details` and `password` — so nothing can arrive here without having
   * been through step four first.
   */
  const midFlow =
    (signup && (step === "verify" || step === "password")) || step === "interests";

  /**
   * Signed in, and the flow was never finished — on some earlier visit.
   *
   * An account can exist with no date of birth, occupation or country: abandon
   * step four, or arrive through Google, and that is exactly where you are.
   * Showing the "nothing to do here" panel to somebody in that state would be a
   * dead end in front of the only screen that can fix it, so the details step
   * wins over it.
   */
  const unfinished = ready && signedIn && needsDetails && !midFlow;

  // `midFlow` guards this too: signing in happens at step two, and without it
  // the panel would replace the rest of the form the instant the code was
  // accepted.
  if (ready && signedIn && !unfinished && !midFlow) {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-4">
          <h1 className="m-0 font-display font-bold text-[clamp(1.7rem,3.4vw,2.3rem)] tracking-[-0.02em] leading-[1.08] text-cream-bright">
            You are signed in as <em>{displayName || "you"}</em>.
          </h1>
          <p className="m-0 text-[14px] leading-[1.6] font-light text-muted">
            Nothing to do here. Your activity is on your dashboard.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/dashboard"
              className="rounded-full bg-positive px-5 py-3 text-[14px] font-semibold text-positive-ink transition-colors duration-300 hover:bg-[#25CC61]"
            >
              Your dashboard
            </Link>
            <Link
              href="/topics"
              className="rounded-full border border-veil/16 px-5 py-3 text-[14px] font-medium text-cream transition-colors duration-300 hover:border-veil/40"
            >
              Explore opinions
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // An unfinished account has only one thing left to do, so the page shows only
  // that — not a sign-in form it would be nonsense to fill in.
  /**
   * `ready && signedIn`, not just the step name.
   *
   * The picker writes to an account, so there has to be one. Sign-up reaches
   * this step with a session already open — it was opened at the verify step,
   * three screens back — so the guard costs that path nothing, and it is what
   * stops `?step=interests` typed by a signed-out visitor from rendering a
   * picker attached to a save that can only answer "you are not signed in".
   * They get the sign-in form instead, which is the honest response, and the
   * offer finds them again on the other side of it.
   */
  const onInterests = step === "interests" && ready && signedIn;
  const onDetails = !onInterests && (unfinished || (signup && step === "details"));
  const position = stepPosition(step, viaGoogle);
  // The two screens that are forms rather than a handful of fields.
  const wide = onDetails || onInterests;

  return (
    <Shell wide={wide}>
      {/* Shown while walking the flow, including its last step.
          `unfinished` is true on the details screen of a normal sign-up — the
          account exists by then and its demographics are still blank — so
          gating on it alone hid the progress bar exactly where somebody most
          wants to see "Step 5 of 5". The one case that should not show it is a
          returning visitor who is dropped straight onto details having done
          none of the earlier steps. */}
      {signup && !(unfinished && step === "account") ? (
        <Progress index={position.index} total={position.total} />
      ) : null}

      {/* ---------------------------------------------------- verify email */}
      {!unfinished && signup && step === "verify" ? (
        <div className="flex flex-col gap-5">
          <Heading
            title={
              <>
                Check your <em>email</em>
              </>
            }
            blurb={
              <>
                We sent a {CODE_LENGTH}-digit code to{" "}
                <strong className="font-medium text-cream">{identifier.trim()}</strong>. Enter it
                below to prove the address is yours.
              </>
            }
          />

          <OtpInput
            length={CODE_LENGTH}
            value={code}
            onChange={(nextCode) => {
              setCode(nextCode);
              setError(null);
            }}
            onComplete={submitCode}
            invalid={Boolean(error)}
          />

          {error ? <ErrorLine>{error}</ErrorLine> : null}

          <div className="flex flex-col gap-2.5">
            <PrimaryButton onClick={() => void submitCode()} disabled={busy}>
              {busy ? "Checking…" : "Verify email"}
            </PrimaryButton>
            <div className="flex items-center justify-between gap-3 text-[12.5px]">
              <button
                type="button"
                onClick={() => {
                  setStep("account");
                  setError(null);
                }}
                className="cursor-pointer text-muted transition-colors hover:text-cream"
              >
                ← Wrong address?
              </button>
              <button
                type="button"
                onClick={() => void resend()}
                disabled={cooldown > 0 || busy}
                className="cursor-pointer text-muted transition-colors hover:text-cream disabled:cursor-default disabled:text-dim/60"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------- set a password */}
      {!unfinished && signup && step === "password" ? (
        <form onSubmit={submitPassword} className="flex flex-col gap-5">
          <Heading
            title={
              <>
                Set a <em>password</em>
              </>
            }
            blurb="Your email is confirmed. This is the last thing standing between your account and somebody else."
          />

          <div className="flex flex-col gap-4">
            <PasswordField
              value={password}
              onChange={(v) => {
                setPassword(v);
                setError(null);
              }}
              signup
              minLength={MIN_PASSWORD_LENGTH}
            />
            <StrengthMeter score={strength.score} label={strength.label} hints={strength.hints} />
            <AuthField label="Confirm password" required>
              <input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError(null);
                }}
                placeholder="Type it again"
                autoComplete="new-password"
                className={authInput}
              />
            </AuthField>
          </div>

          {error ? <ErrorLine>{error}</ErrorLine> : null}

          <div className="flex flex-col gap-2.5">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Saving…" : "Continue"}
            </PrimaryButton>
            {/* No way back to the code step: it has been spent. Supabase
                invalidates a token once it has opened a session, so returning
                there would offer to re-enter something that cannot work. */}
          </div>
        </form>
      ) : null}

      {/* ------------------------------------------------------- about you */}
      {onDetails ? (
        <form onSubmit={submitDetails} className="flex flex-col gap-5">
          <Heading
            title={
              <>
                A little <em>about you</em>
              </>
            }
            blurb="Every field is needed — these are what the region, age and occupation breakdowns are built from."
          />

          <ProfileFields
            value={profile}
            onChange={(nextProfile) => {
              setProfile(nextProfile);
              setError(null);
            }}
            errors={detailErrors}
            // Two rows of three on a desktop, pairs on a tablet, stacked on a
            // phone. See the note on `Shell`'s wide frame.
            columns={3}
          />

          <ProfilePrivacyNote />

          {error ? <ErrorLine>{error}</ErrorLine> : null}

          <div className="flex flex-col gap-2.5">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Saving…" : "Continue"}
            </PrimaryButton>
          </div>
        </form>
      ) : null}

      {/* -------------------------------------------------- what you read */}
      {onInterests ? (
        <form onSubmit={submitInterests} className="flex flex-col gap-5">
          <Heading
            title={
              offering ? (
                <>
                  Welcome back. What should we <em>show you first</em>?
                </>
              ) : (
                <>
                  What are you <em>interested in</em>?
                </>
              )
            }
            blurb={
              offering
                ? "This is new since you last signed in. Pick a few subjects and your topic and poll catalogs will open on them instead of on everything."
                : "Pick the subjects worth your time. Topics and polls will open on these — it changes what you see first, never what a result says."
            }
          />

          <InterestPicker
            value={interests}
            onChange={(next) => {
              setInterests(next);
              setError(null);
            }}
          />

          <p className="m-0 rounded-[12px] border border-veil/10 bg-veil/3 p-3.5 text-[12px] leading-[1.6] text-dim">
            <strong className="font-semibold text-soft">This one is only about reading.</strong>{" "}
            Your picks decide which topics and polls a catalog shows you first.
            They are never part of a breakdown, never shown to anyone else, and
            every category stays one tap away whatever you choose here.
            <span className="mt-1.5 block text-dim/80">
              You can change them any time from your dashboard.
            </span>
          </p>

          {error ? <ErrorLine>{error}</ErrorLine> : null}

          <div className="flex flex-col gap-2.5">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Saving…" : offering ? "Save and continue" : "Create account"}
            </PrimaryButton>
            {/* Only on the offer. During sign-up there is nothing to skip to —
                the account is already made and this is the last screen — but
                for somebody who signed in to do something else, a picker with
                no way past it is a wall in front of the thing they came for. */}
            {offering ? (
              <button
                type="button"
                onClick={() => void declineInterests()}
                disabled={busy}
                className="cursor-pointer text-center text-[12.5px] text-muted transition-colors hover:text-cream disabled:cursor-default disabled:text-dim/60"
              >
                Not now — show me everything
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {/* --------------------------------------- sign in, or step one of up */}
      {/* `!onInterests` is load-bearing, and it was missing.
          This block's condition is satisfied by `!signup` alone, and the
          interests offer runs in sign-in mode — so the whole sign-in form
          rendered *underneath* the picker, on the real path, for anybody who
          had just signed in. Two forms on one screen, the second one asking
          for credentials the person had already given. */}
      {!unfinished && !onInterests && (!signup || step === "account") ? (
        <form onSubmit={submitAccount} className="flex flex-col gap-5">
          <Heading
            title={
              signup ? (
                <>
                  Create your <em>account</em>
                </>
              ) : (
                <>
                  Sign in to <Brand />
                </>
              )
            }
            blurb={
              signup
                ? "One vote counts per account — which only means something if every account is a real person. Reading never needs one."
                : "Reading needs no account. Signing in lets you vote, reply and follow."
            }
          />

          {/* Rendered only where it leads somewhere. `signInWithOAuth` navigates
              before it can report an unconfigured provider, so a button shown
              regardless hands the visitor a page of JSON on another domain. */}
          {googleEnabled ? (
            <>
              <GoogleButton
                label={signup ? "Sign up with Google" : "Continue with Google"}
                onClick={withGoogle}
                disabled={busy}
              />
              <OrRule />
            </>
          ) : null}

          <div className="flex flex-col gap-4">
            {signup ? (
              <AuthField label="Display name" required>
                <input
                  ref={firstField}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How your opinions are signed"
                  autoComplete="name"
                  className={authInput}
                />
              </AuthField>
            ) : null}

            <IdentifierField
              value={identifier}
              onChange={setIdentifier}
              signup={signup}
              inputRef={signup ? undefined : firstField}
            />

            {/* Sign-in asks for the password here; sign-up sets one two steps
                later, once the address has actually been proved. */}
            {!signup ? (
              <PasswordField
                value={password}
                onChange={setPassword}
                signup={false}
                forgotHref={
                  // Resetting is the sign-up flow. Proving the address is what
                  // both actually are, and a second screen that emailed a
                  // second kind of code would be the same thing twice.
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      reset();
                      setError(
                        "Enter your address below and we will email a code. Verifying it lets you set a new password.",
                      );
                    }}
                    className="cursor-pointer text-[11.5px] text-dim underline decoration-veil/25 underline-offset-4 transition-colors hover:text-soft"
                  >
                    Forgot password?
                  </button>
                }
              />
            ) : null}

            {/* BOTH MODES, not just sign-up.
                Captcha is enabled on the project, which means Supabase requires
                a token on every auth endpoint — `signInWithPassword` included.
                Rendering the widget only on the sign-up side meant sign-in sent
                no token and was refused outright with "captcha protection:
                request disallowed", which reads as a broken password rather
                than a missing widget.

                It belongs here on the merits anyway: credential stuffing hits
                the sign-in endpoint, and that is the attack a captcha is most
                use against. */}
            <CaptchaBox
              onToken={setCaptchaToken}
              resetKey={captchaNonce}
              state={captcha}
              onChange={(nextState) => {
                setCaptcha(nextState);
                setError(null);
              }}
            />
          </div>

          {error ? <ErrorLine>{error}</ErrorLine> : null}

          <PrimaryButton type="submit" disabled={busy || captcha !== "passed"}>
            {busy
              ? signup
                ? "Sending…"
                : "Signing in…"
              : signup
                ? "Send verification code"
                : "Sign in"}
          </PrimaryButton>

          <p className="m-0 text-center text-[13px] text-muted">
            {signup ? "Already have an account?" : "New to OpinionHQ?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(signup ? "signin" : "signup");
                reset();
              }}
              className="cursor-pointer font-medium text-cream underline decoration-veil/30 underline-offset-4 transition-colors hover:decoration-veil/70"
            >
              {signup ? "Sign in" : "Create one"}
            </button>
          </p>
        </form>
      ) : null}

      <p className="m-0 border-t border-veil/8 pt-4 text-[11.5px] leading-[1.6] text-dim">
        Everything on this page is real: the bot check is verified by Cloudflare and
        again server-side, the code is emailed and verified by the auth service, and
        your password is stored hashed by it and never by this app.
      </p>
    </Shell>
  );
}

/* ------------------------------------------------------------------ parts */

function Heading({ title, blurb }: { title: React.ReactNode; blurb: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-display font-bold text-[clamp(1.7rem,3.2vw,2.3rem)] leading-[1.08] tracking-[-0.02em] text-cream-bright">
        {title}
      </h1>
      <p className="m-0 text-[13.5px] leading-[1.55] text-muted">{blurb}</p>
    </div>
  );
}

/** Where you are, and how much is left. Segments, not a percentage. */
function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-dim">
        Step {index} of {total}
      </span>
      <span aria-hidden className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${
              i < index ? "bg-positive" : "bg-veil/12"
            }`}
          />
        ))}
      </span>
    </div>
  );
}

function StrengthMeter({
  score,
  label,
  hints,
}: {
  score: number;
  label: string;
  hints: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
              i < score ? (BAR[score] ?? "bg-veil/12") : "bg-veil/12"
            }`}
          />
        ))}
      </span>
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[11.5px] text-muted">{label}</span>
        {hints[0] ? <span className="text-[11.5px] text-dim">{hints[0]}</span> : null}
      </span>
    </div>
  );
}

const BAR: Record<number, string> = {
  1: "bg-negative",
  2: "bg-[#f0a83c]",
  3: "bg-positive/70",
  4: "bg-positive",
};

function PrimaryButton({
  children,
  type = "button",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-full bg-positive px-6 py-3.5 text-[14.5px] font-semibold text-positive-ink transition-colors duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:bg-veil/10 disabled:text-dim"
    >
      {children}
    </button>
  );
}


function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="m-0 text-[12.5px] leading-[1.5] text-negative-light">
      {children}
    </p>
  );
}

/**
 * The frame.
 *
 * `items-start` with real padding rather than a centred full-height grid: the
 * five-step flow is much taller than a sign-in box, and centring it meant the
 * bottom of the tallest step fell off the screen. The argument on the left is
 * sticky so it stays in view while a long step scrolls, and it is dropped
 * entirely below `lg` where the form is the whole job.
 *
 * ── Two shapes, and the wide one is not a bigger version of the narrow one ──
 *
 * A 468px column is right for the screens that hold two or three controls. It
 * is wrong for the two that hold a form: the demographics are six fields and
 * the interests are fifteen toggles, and in a 468px column on a 1440px display
 * both become a tall stack of full-width boxes running past the fold with two
 * thirds of the page empty on either side. Somebody scrolls a settings screen
 * to fill in six answers they can see all of at once.
 *
 * So those two get their own frame: no sticky argument, one centred panel at
 * 900px, and the fields laid out across it. The argument on the left is worth
 * reading while you decide whether to make an account — it is not worth a third
 * of the screen while you are already filling one in.
 */
function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  if (wide) {
    return (
      <section
        className="mx-auto w-full max-w-[900px] px-4 py-[clamp(28px,5vw,64px)] sm:px-8"
        style={{ paddingTop: "calc(var(--ohq-nav-h) + clamp(28px,5vw,64px))" }}
      >
        <div className="ohq-panel flex w-full flex-col gap-6 p-6 sm:p-8">{children}</div>
      </section>
    );
  }

  return (
    // `paddingTop` clears the fixed nav, which is 78px of opaque bar over the
    // top of the page. Without it the "Sign in to OpinionHQ" heading rendered
    // underneath it — the vertical padding here is generous enough that it
    // looked fine on a desktop and cut the heading in half on a phone, where
    // the clamp bottoms out at 28px.
    <section
      className="mx-auto grid w-full max-w-[1120px] grid-cols-1 items-start gap-10 px-4 py-[clamp(28px,5vw,64px)] sm:px-8 lg:grid-cols-[minmax(0,1fr)_468px] lg:gap-14"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + clamp(28px,5vw,64px))" }}
    >
      <aside className="hidden flex-col gap-6 lg:sticky lg:top-[calc(var(--ohq-nav-h)+56px)] lg:flex">
        <h2 className="m-0 max-w-[13ch] font-display text-[clamp(2rem,3.2vw,2.9rem)] leading-[1.04] font-bold tracking-[-0.025em] text-balance text-cream-bright">
          An account is <em>one vote</em>.
        </h2>
        <p className="m-0 max-w-[42ch] text-[14.5px] leading-[1.6] font-light text-muted">
          Every number on <Brand /> is worth reading because it counts each person
          once. That is the only reason this page exists — not to gate the
          reading, which is open to everyone, but to make the counting mean
          something.
        </p>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {[
            ["Read everything without one", "Topics, polls and public questions are open."],
            ["One verified email, one account", "Which is what stops a poll being stuffed."],
            ["Your reason sits next to your vote", "Numbers without reasons explain nothing."],
          ].map(([title, body]) => (
            <li key={title} className="flex items-start gap-3">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[13.5px] font-medium text-cream">{title}</span>
                <span className="text-[12.5px] leading-[1.5] font-light text-dim">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="ohq-panel flex w-full max-w-[468px] flex-col gap-5 justify-self-center p-6 sm:p-7 lg:justify-self-end">
        {children}
      </div>
    </section>
  );
}
