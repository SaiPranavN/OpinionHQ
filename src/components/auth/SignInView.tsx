"use client";

/**
 * `/signin` — the standalone sign-in page.
 *
 * Two panels. The left says what an account is for, because a login box with no
 * argument attached is asking for a commitment and offering nothing; the right
 * is the form, and on a phone it is the only thing on screen.
 *
 * The sheet in `AuthModal` still exists and is still the right thing when
 * somebody hits a wall mid-task — it keeps their held vote and puts them back
 * where they were. This page is for arriving deliberately, and both run the
 * same validation out of `CredentialForm`.
 *
 * NOTHING IS AUTHENTICATED. There is no identity provider behind either door,
 * which the page says plainly rather than implying a security it does not have.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  IdentifierField,
  MIN_PASSWORD,
  OrRule,
  PasswordField,
  authInput,
  AuthField,
  checkPassword,
  nameFrom,
  readIdentifier,
} from "@/components/auth/CredentialForm";
import { GoogleButton, type GoogleAccount } from "@/components/auth/GoogleSignIn";
import {
  ProfileFields,
  ProfilePrivacyNote,
  type ProfileDetails,
} from "@/components/auth/ProfileFields";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Brand } from "@/components/ui/Brand";

/** Where to land afterwards. Constrained to this app — see `safeNext`. */
const DEFAULT_NEXT = "/topics";

/**
 * An open redirect is an open redirect even in a prototype.
 *
 * `?next=` comes from the URL, so it is attacker-controlled by definition. Only
 * a same-site absolute path is honoured; anything with a scheme, a host, or a
 * protocol-relative `//` prefix falls back to the catalog.
 */
export function safeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  if (!raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_NEXT;
  return raw;
}

export function SignInView() {
  const router = useRouter();
  const params = useSearchParams();
  const { signedIn, ready, signInWith, displayName } = usePrototype();

  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  /**
   * Creating an account is two screens, not one.
   *
   * Credentials first, then the optional detail. Nine fields stacked in a
   * 460px panel is a wall people abandon, and burying the demographics under
   * a password field is how they get skipped without being read. Splitting
   * them also lets the second screen carry its own argument for why it is
   * worth answering — which is the only thing that actually gets it answered.
   */
  const [step, setStep] = useState<"credentials" | "details">("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<ProfileDetails>({ country: "India" });
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  const next = safeNext(params.get("next"));
  const signup = mode === "signup";

  useEffect(() => {
    firstField.current?.focus();
  }, [mode, step]);

  const finish = (details: Parameters<typeof signInWith>[0], created: boolean) => {
    // Cleared before navigating, not after: an unmount that races the reset
    // would leave the value in a state tree the router is still holding.
    setPassword("");
    signInWith(details, created);
    router.push(next);
  };

  /** Everything gathered so far, in the one shape the provider accepts. */
  const account = () => {
    const read = readIdentifier(identifier);
    if ("error" in read) return null;
    return {
      ...profile,
      name: name.trim() || nameFrom(read),
      email: read.email,
      username: read.username || undefined,
    };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const read = readIdentifier(identifier);
    if ("error" in read) {
      setError(read.error);
      return;
    }
    if (signup && !name.trim()) {
      setError("Add a display name — it is what signs your opinions.");
      return;
    }
    if (signup && !read.email) {
      setError("Creating an account needs an email address.");
      return;
    }
    const bad = checkPassword(password);
    if (bad) {
      setError(bad);
      return;
    }
    // The password stops here. It is checked for shape and then dropped.
    if (signup) {
      setError(null);
      setStep("details");
      return;
    }
    finish(
      {
        name: name.trim() || nameFrom(read),
        email: read.email,
        username: read.username || undefined,
      },
      signup,
    );
  };

  /**
   * Google gives a name and an address and nothing else.
   *
   * So in sign-up mode it lands on the detail step exactly like the form path
   * does, rather than creating a demographics-free account in one click. In
   * sign-in mode it is what it says it is and goes straight through.
   */
  const withGoogle = (account: GoogleAccount) => {
    if (signup) {
      setName(account.name);
      setIdentifier(account.email);
      setError(null);
      setStep("details");
      return;
    }
    finish({ name: account.name, email: account.email }, false);
  };

  const createAccount = () => {
    const details = account();
    if (!details) {
      // Only reachable if the credential step were bypassed; it re-opens
      // rather than failing silently or writing a half-formed account.
      setStep("credentials");
      return;
    }
    finish(details, true);
  };

  if (ready && signedIn) {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-4">
          <h1 className="m-0 font-serif text-[clamp(1.7rem,3.4vw,2.4rem)] leading-[1.08] text-cream-bright">
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
              Explore topics
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (signup && step === "details") {
    return (
      <Shell>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-dim">
              Step 2 of 2
            </span>
            <h1 className="m-0 font-serif text-[clamp(1.8rem,3.6vw,2.5rem)] leading-[1.06] tracking-[-0.02em] text-cream-bright">
              A little <em className="italic">about you</em>
            </h1>
            <p className="m-0 text-[13.5px] leading-[1.55] text-muted">
              Every field is optional — leave them blank and press Create
              account, or add them later from your dashboard.
            </p>
          </div>

          <ProfileFields value={profile} onChange={setProfile} columns={1} />

          <ProfilePrivacyNote />

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={createAccount}
              className="cursor-pointer rounded-full bg-positive px-6 py-3.5 text-[14.5px] font-semibold text-positive-ink transition-colors duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Create account
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setError(null);
            }}
            className="m-0 cursor-pointer text-center text-[13px] text-muted transition-colors hover:text-cream"
          >
            ← Back to your sign-in details
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          {signup ? (
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-dim">
              Step 1 of 2
            </span>
          ) : null}
          <h1 className="m-0 font-serif text-[clamp(1.8rem,3.6vw,2.5rem)] leading-[1.06] tracking-[-0.02em] text-cream-bright">
            {signup ? (
              <>
                Create your <em className="italic">account</em>
              </>
            ) : (
              <>
                Sign in to <Brand />
              </>
            )}
          </h1>
          <p className="m-0 text-[13.5px] leading-[1.55] text-muted">
            {signup
              ? "One vote counts per account. Reading never needs one."
              : "Reading needs no account. Signing in lets you vote, reply and follow."}
          </p>
        </div>

        <GoogleButton
          label={signup ? "Sign up with Google" : "Continue with Google"}
          onPick={withGoogle}
        />

        <OrRule />

        <div className="flex flex-col gap-3.5">
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

          <PasswordField
            value={password}
            onChange={setPassword}
            signup={signup}
            forgotHref={
              signup ? undefined : (
                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "There is no account store in this prototype, so there is nothing to reset. Any password of 8+ characters signs you in.",
                    )
                  }
                  className="cursor-pointer text-[11.5px] text-dim underline decoration-veil/25 underline-offset-4 transition-colors hover:text-soft"
                >
                  Forgot password?
                </button>
              )
            }
          />
        </div>

        {error ? (
          <p role="alert" className="m-0 text-[12.5px] leading-[1.5] text-negative-light">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="cursor-pointer rounded-full bg-positive px-6 py-3.5 text-[14.5px] font-semibold text-positive-ink transition-colors duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {signup ? "Continue" : "Sign in"}
        </button>

        <p className="m-0 text-center text-[13px] text-muted">
          {signup ? "Already have an account?" : "New to OpinionHQ?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(signup ? "signin" : "signup");
              setError(null);
            }}
            className="cursor-pointer font-medium text-cream underline decoration-veil/30 underline-offset-4 transition-colors hover:decoration-veil/70"
          >
            {signup ? "Sign in" : "Create one"}
          </button>
        </p>

        <p className="m-0 rounded-[12px] border border-veil/10 bg-veil/3 p-3.5 text-[11.5px] leading-[1.6] text-dim">
          <strong className="font-medium text-muted">Simulated sign-in.</strong> There is
          no identity provider behind this page, so any username or address and any
          password of {MIN_PASSWORD}+ characters is accepted. The password is checked for
          length and then discarded — it is never stored, and nothing entered here leaves
          this browser.
        </p>
      </form>
    </Shell>
  );
}

/**
 * The frame. The left panel is decoration in the useful sense — it is the only
 * place on this page that says what the account is *for* — and it is dropped
 * entirely below `lg`, where the form is the whole job.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    // `section`, not `main`. The root layout already renders the page's one
    // `main`, and nesting a second inside it is invalid — React then leaves the
    // streamed Suspense content stranded in its staging container instead of
    // adopting it, so the whole page renders twice.
    <section className="mx-auto grid min-h-[calc(100dvh-var(--ohq-nav-h))] w-full max-w-[1240px] grid-cols-1 items-center gap-10 px-4 py-[clamp(32px,6vw,72px)] sm:px-8 lg:grid-cols-[1.05fr_460px] lg:gap-16">
      <aside className="hidden flex-col gap-7 lg:flex">
        <h2 className="m-0 max-w-[15ch] font-serif text-[clamp(2.2rem,3.6vw,3.2rem)] leading-[1.04] font-normal tracking-[-0.025em] text-balance text-cream-bright">
          An account is <em className="italic">one vote</em>.
        </h2>
        <p className="m-0 max-w-[46ch] text-[15px] leading-[1.65] font-light text-muted">
          Every number on <Brand /> is worth reading because it counts each person
          once. That is the only reason this page exists — not to gate the
          reading, which is open to everyone, but to make the counting mean
          something.
        </p>
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {[
            ["Read everything without one", "Topics, polls and public questions are open."],
            ["Vote and explain yourself", "Your reason sits next to your vote."],
            ["Ask people who proved it", "Two questions free, then Pro."],
          ].map(([title, body]) => (
            <li key={title} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-positive"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium text-cream">{title}</span>
                <span className="text-[13px] leading-[1.5] font-light text-dim">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="ohq-panel w-full max-w-[460px] justify-self-center p-6 sm:p-8 lg:justify-self-end">
        {children}
      </div>
    </section>
  );
}
