"use client";

/**
 * The sign-in sheet — opened when somebody hits a wall mid-task.
 *
 * Its whole job is to not lose what you were doing: a vote submitted while
 * signed out is held, shown back, and applied the moment you are in. That is
 * why it exists rather than a redirect.
 *
 * IT ONLY SIGNS PEOPLE IN. Creating an account now means a bot check, a
 * verified email, a password set against a proved address and a required set of
 * demographics — four steps that do not belong in a sheet floating over a
 * half-finished vote, and more to the point a second sign-up path here would be
 * a way to get an account without any of it. So "Create an account" leaves for
 * `/signin?mode=signup` and carries a `next` back to where you were. The held
 * vote survives the trip because it lives in the provider, above the router.
 *
 * THE PASSWORD IS NEVER STORED. It is held in component state for the length of
 * one request, handed to the server action, and cleared — whether that request
 * succeeded or failed. Nothing this component hands to `onComplete` has a field
 * it could travel in, which is the enforcement rather than a promise.
 */

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  IdentifierField,
  OrRule,
  PasswordField,
  checkPassword,
  readIdentifier,
} from "@/components/auth/CredentialForm";
import { GoogleButton } from "@/components/auth/GoogleSignIn";
import { useSession } from "@/components/auth/SessionProvider";
import { Brand } from "@/components/ui/Brand";
import { startGoogle } from "@/lib/auth/account";
import { signInWithIdentifier } from "@/lib/auth/actions";
import type { Sentiment } from "@/lib/types";

interface AuthModalProps {
  mode: "signin" | "signup" | null;
  heldVote: Sentiment | null;
  heldNote: string;
  onCancel: () => void;
  /** Called after Supabase has authenticated somebody, not to do it. */
  onComplete: (created: boolean) => void;
}

export function AuthModal({
  mode,
  heldVote,
  heldNote,
  onCancel,
  onComplete,
}: AuthModalProps) {
  const pathname = usePathname();
  const { googleEnabled } = useSession();
  const [identifier, setIdentifier] = useState("");
  /**
   * Held here and nowhere else.
   *
   * Deliberately outside any object handed to `onComplete`, so it cannot be
   * spread into one by a future edit that adds a field and forgets this.
   */
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const open = mode !== null;

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  /**
   * Signs in through the server action, then hands off.
   *
   * THE SERVER, not the browser, because the field accepts a username and
   * resolving one to an address is a question a browser must not be able to ask
   * — see `lib/auth/actions.ts`. The password is cleared on the way out of this
   * function whatever the outcome; it lives in this component's state for the
   * length of one request and has nowhere else to go.
   */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const read = readIdentifier(identifier);
    if ("error" in read) {
      setError(read.error);
      return;
    }
    const bad = checkPassword(password);
    if (bad) {
      setError(bad);
      return;
    }

    setBusy(true);
    setError(null);
    const result = await signInWithIdentifier(identifier, password);
    setPassword("");
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onComplete(false);
  };

  /**
   * Leaves the page entirely, so nothing after the call runs.
   *
   * Which is why the held vote cannot survive this route the way it survives a
   * password sign-in — the round trip through Google discards everything in
   * memory. Saying so is better than silently losing somebody's draft.
   */
  const withGoogle = async () => {
    setBusy(true);
    setError(null);
    const result = await startGoogle(pathname || "/topics");
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
    }
  };

  const signupHref = `/signin?mode=signup&next=${encodeURIComponent(pathname || "/topics")}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ohq-auth-title"
      className="fixed inset-0 z-90 flex items-start justify-center overflow-y-auto bg-[rgba(5,5,5,0.74)] p-4 py-10 backdrop-blur-[8px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={submit}
        className="my-auto flex w-full max-w-[440px] flex-col gap-5 rounded-[22px] border border-veil/10 bg-surface p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] sm:p-7"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="ohq-auth-title"
            className="m-0 font-display font-semibold text-[clamp(1.45rem,3vw,1.9rem)] leading-[1.1] tracking-[-0.02em] text-cream-bright"
          >
            {heldVote ? (
              <>
                Almost there — <em>sign in</em> to record your opinion.
              </>
            ) : (
              <>
                Sign in to <Brand />
              </>
            )}
          </h2>
          <p className="m-0 text-[13px] leading-[1.55] text-dim">
            Browsing needs no account — signing in lets you vote, reply and follow topics.
          </p>
        </div>

        {heldVote ? (
          <div className="flex flex-col gap-2 rounded-[14px] border border-positive/30 bg-positive/5 p-4">
            <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-positive-light">
              Held for you
            </span>
            <span className="text-[14px] font-semibold text-cream-bright">Vote: {heldVote}</span>
            <span className="text-[13px] leading-[1.55] text-muted">
              {heldNote
                ? `“${heldNote}”`
                : "No written explanation yet — you can add one after signing in."}
            </span>
          </div>
        ) : null}

        {/* Only where it leads somewhere — see the note in `SignInView`. */}
        {googleEnabled ? (
          <>
            <GoogleButton label="Continue with Google" onClick={withGoogle} disabled={busy} />
            <OrRule />
          </>
        ) : null}

        <div className="flex flex-col gap-4">
          <IdentifierField
            value={identifier}
            onChange={setIdentifier}
            signup={false}
            inputRef={firstFieldRef}
          />
          <PasswordField value={password} onChange={setPassword} signup={false} />
        </div>

        {error ? (
          <p role="alert" className="m-0 text-[12.5px] text-negative-light">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2.5">
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-full bg-positive px-6 py-3.5 text-[14.5px] font-semibold text-positive-ink transition-colors duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:bg-veil/10 disabled:text-dim"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {/* A link, not a mode switch. Creating an account is a verified,
              four-step flow and it lives on its own page — a second sign-up
              path in here would be a way around every one of those steps. */}
          <a
            href={signupHref}
            className="rounded-full border border-veil/16 px-6 py-3.5 text-center text-[13.5px] font-medium text-cream transition-colors duration-300 outline-none hover:border-veil/40 focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Create an account
          </a>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <span className="text-[11.5px] leading-[1.5] text-dim">
            One vote per account. You can update it later.
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer text-[13px] whitespace-nowrap text-muted transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
