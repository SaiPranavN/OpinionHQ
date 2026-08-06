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
 * CREATING AN ACCOUNT IS FOUR STEPS, in this order for a reason:
 *
 *   1. Name, address, and a bot check.
 *   2. Prove the address before anything is built on it.
 *   3. Set a password, twice.
 *   4. The demographics the product's charts are made of.
 *
 * Verifying before the password means a mistyped address fails while nobody has
 * invested anything, and — the part that matters on a product whose claim is
 * "one account, one vote" — no account can exist against an address its owner
 * never confirmed. An unverified account is a vote somebody manufactured.
 *
 * Google skips steps 2 and 3: an OAuth address arrives verified and there is no
 * password to set. It does not skip step 4, because nothing in an OAuth profile
 * says where somebody lives or what they do — so it comes back from
 * `/auth/callback` at `?step=details` rather than at the catalog.
 *
 * IT IS REAL NOW, and the order above survived the change. The obvious mapping
 * onto Supabase — `signUp({ email, password })` — would have forced the password
 * a step earlier and reordered the screens. `signInWithOtp` does not: it creates
 * the account from the address alone and leaves the password to `updateUser`
 * afterwards, so the four steps map one to one. See `lib/auth/account.ts`.
 *
 * WHAT IS STILL A PLACEHOLDER, and only this: the bot check. It has no provider
 * behind it and says so on screen. Everything else on this page now talks to a
 * real auth service — the code is emailed and verified server-side, the password
 * is set against a proved address, and the demographics land in Postgres.
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
  resendSignUpCode,
  saveAccountDetails,
  setPassword as setAccountPassword,
  startGoogle,
  startSignUp,
} from "@/lib/auth/account";
import { signInWithIdentifier } from "@/lib/auth/actions";
import { safeNext } from "@/lib/auth/redirect";
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
  // `?step=details` is how `/auth/callback` sends a first-time Google account
  // here: verified address, no password to set, and none of the demographics
  // the cross-tabs are built from.
  const [step, setStep] = useState<SignupStep>(
    params.get("step") === "details" ? "details" : "account",
  );
  const [viaGoogle, setViaGoogle] = useState(params.get("step") === "details");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [profile, setProfile] = useState<ProfileDetails>({ country: "India" });

  const [captcha, setCaptcha] = useState<CaptchaState>("idle");
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
    setCaptcha("idle");
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
    router.push(next);
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
      const result = await signInWithIdentifier(identifier, password);
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
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
    const result = await startSignUp(read.email, name);
    setBusy(false);
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
    const result = await resendSignUpCode(identifier);
    setBusy(false);
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
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
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
    const result = await saveAccountDetails({ ...profile, displayName: name.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await finish(true);
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
   * Signed in, but not finished.
   *
   * An account can exist with no date of birth, occupation or country — abandon
   * the flow at step four, or arrive through Google, and that is exactly where
   * you are. Showing the "nothing to do here" panel to somebody in that state
   * would be a dead end in front of the only screen that can fix it, so the
   * details step wins over it.
   */
  const unfinished = ready && signedIn && needsDetails;

  if (ready && signedIn && !unfinished) {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-4">
          <h1 className="m-0 font-display font-bold text-[clamp(1.7rem,3.4vw,2.3rem)] tracking-[-0.02em] leading-[1.08] text-cream-bright">
            You are signed in as <em className="italic">{displayName || "you"}</em>.
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
  const onDetails = unfinished || (signup && step === "details");
  const position = stepPosition(step, viaGoogle);

  return (
    <Shell>
      {signup && !unfinished ? <Progress index={position.index} total={position.total} /> : null}

      {/* ---------------------------------------------------- verify email */}
      {!unfinished && signup && step === "verify" ? (
        <div className="flex flex-col gap-5">
          <Heading
            title={
              <>
                Check your <em className="italic">email</em>
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
                Set a <em className="italic">password</em>
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
                A little <em className="italic">about you</em>
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
            columns={1}
          />

          <ProfilePrivacyNote />

          {error ? <ErrorLine>{error}</ErrorLine> : null}

          <div className="flex flex-col gap-2.5">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </PrimaryButton>
          </div>
        </form>
      ) : null}

      {/* --------------------------------------- sign in, or step one of up */}
      {!unfinished && (!signup || step === "account") ? (
        <form onSubmit={submitAccount} className="flex flex-col gap-5">
          <Heading
            title={
              signup ? (
                <>
                  Create your <em className="italic">account</em>
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
            ) : (
              <CaptchaBox
                state={captcha}
                onChange={(nextState) => {
                  setCaptcha(nextState);
                  setError(null);
                }}
              />
            )}
          </div>

          {error ? <ErrorLine>{error}</ErrorLine> : null}

          <PrimaryButton type="submit" disabled={busy || (signup && captcha !== "passed")}>
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
        <strong className="font-medium text-muted">The bot check is still a placeholder.</strong>{" "}
        Everything else on this page is real: the code is emailed and verified server-side, and your
        password is stored hashed by the auth service and never by this app.
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
 * four-step flow is much taller than a sign-in box, and centring it meant the
 * bottom of the tallest step fell off the screen. The argument on the left is
 * sticky so it stays in view while a long step scrolls, and it is dropped
 * entirely below `lg` where the form is the whole job.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto grid w-full max-w-[1120px] grid-cols-1 items-start gap-10 px-4 py-[clamp(28px,5vw,64px)] sm:px-8 lg:grid-cols-[minmax(0,1fr)_468px] lg:gap-14">
      <aside className="hidden flex-col gap-6 lg:sticky lg:top-[calc(var(--ohq-nav-h)+56px)] lg:flex">
        <h2 className="m-0 max-w-[13ch] font-display text-[clamp(2rem,3.2vw,2.9rem)] leading-[1.04] font-bold tracking-[-0.025em] text-balance text-cream-bright">
          An account is <em className="italic">one vote</em>.
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
