"use client";

/**
 * Sign in / create account (brief §5.2, §16, §24.4).
 *
 * Two modes in one sheet. Opened from the nav directly, or automatically when
 * a vote is submitted while signed out — in which case the held vote and draft
 * are shown back so it is obvious nothing was lost.
 *
 * THE PASSWORD IS NEVER STORED. There is no identity provider behind this
 * sheet and nothing to check a password against, so the field is held in
 * component state, validated for length, and dropped when the sheet closes. It
 * is not written to `localStorage`, not put on the profile, and not passed to
 * `onComplete` — `AccountDetails` has no field it could travel in, which is the
 * enforcement rather than a promise. Anybody wiring a real backend to this has
 * to add that field deliberately, and will see this comment when they do.
 *
 * The demographic fields feed the aggregate breakdowns on topic dashboards and
 * are optional; nothing entered here leaves the browser.
 */

import { useEffect, useRef, useState } from "react";

import {
  IdentifierField,
  MIN_PASSWORD,
  OrRule,
  PasswordField,
  checkPassword,
  nameFrom,
  readIdentifier,
} from "@/components/auth/CredentialForm";
import { GoogleButton, type GoogleAccount } from "@/components/auth/GoogleSignIn";
import { Brand } from "@/components/ui/Brand";
import type { Sentiment } from "@/lib/types";

export interface AccountDetails {
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

const OCCUPATIONS = [
  "Student",
  "Working professional",
  "Self-employed or business owner",
  "Parent or guardian",
  "Educator",
  "Retired",
  "Prefer not to say",
];

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Canada",
  "Australia",
  "Singapore",
  "Other",
];

interface AuthModalProps {
  mode: "signin" | "signup" | null;
  heldVote: Sentiment | null;
  heldNote: string;
  onModeChange: (mode: "signin" | "signup") => void;
  onCancel: () => void;
  onComplete: (details: AccountDetails, created: boolean) => void;
}

export function AuthModal({
  mode,
  heldVote,
  heldNote,
  onModeChange,
  onCancel,
  onComplete,
}: AuthModalProps) {
  const [form, setForm] = useState<AccountDetails>({
    name: "",
    email: "",
    country: "India",
  });
  /** An address or a username — `readIdentifier` decides which. */
  const [identifier, setIdentifier] = useState("");
  /**
   * Held here and nowhere else.
   *
   * Deliberately outside `form`, so it cannot be spread into the object handed
   * to `onComplete` by a future edit that adds a field and forgets this one.
   */
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
  }, [open, mode, onCancel]);

  if (!open) return null;

  const signup = mode === "signup";
  const set = <K extends keyof AccountDetails>(key: K, value: AccountDetails[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signup && !form.name.trim()) {
      setError("Add a display name — it is what signs your opinions.");
      return;
    }
    const read = readIdentifier(identifier);
    if ("error" in read) {
      setError(read.error);
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
    // The password stops here. It is checked for shape and then goes nowhere:
    // `AccountDetails` has no field for it, so it cannot be persisted by
    // accident. On sign-in the display name is derived from what they typed,
    // since there is no account record to look one up in.
    setPassword("");
    onComplete(
      {
        ...form,
        name: form.name.trim() || nameFrom(read),
        email: read.email,
        username: read.username || undefined,
      },
      signup,
    );
  };

  const withGoogle = (account: GoogleAccount) => {
    setPassword("");
    onComplete({ ...form, name: account.name, email: account.email }, false);
  };

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
        className="my-auto flex w-full max-w-[520px] flex-col gap-5 rounded-[22px] border border-veil/10 bg-surface p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] sm:p-8"
      >
        <div>
          <h2
            id="ohq-auth-title"
            className="m-0 mb-2 font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] tracking-[-0.02em] text-cream-bright"
          >
            {signup ? (
              <>
                Create your <em className="italic">account</em>
              </>
            ) : heldVote ? (
              <>
                Almost there — <em className="italic">sign in</em> to record your opinion.
              </>
            ) : (
              <>
                Sign in to <Brand />
              </>
            )}
          </h2>
          <p className="m-0 text-[13px] leading-[1.55] text-dim">
            {signup
              ? "One vote counts per account. The demographic fields are optional and only ever shown as aggregate percentages."
              : "Browsing needs no account — signing in lets you vote, reply and follow topics."}
          </p>
          <p className="m-0 mt-2.5 rounded-[10px] border border-veil/8 bg-veil/2 px-3 py-2 text-[11.5px] leading-[1.5] text-dim">
            <strong className="font-medium text-muted">Simulated sign-in.</strong> Any
            username or address and any password of {MIN_PASSWORD}+ characters is accepted
            — there is no identity provider behind this, and the Google button opens a
            made-up chooser rather than contacting Google. The password is checked for
            length and then discarded; it is never stored, and nothing entered here leaves
            this browser.
          </p>
        </div>

        {heldVote ? (
          <div className="flex flex-col gap-2 rounded-[14px] border border-positive/30 bg-positive/5 p-4">
            <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-positive-light">
              Held for you
            </span>
            <span className="text-[14px] font-semibold text-cream-bright">
              Vote: {heldVote}
            </span>
            <span className="text-[13px] leading-[1.55] text-muted">
              {heldNote
                ? `“${heldNote}”`
                : "No written explanation yet — you can add one after signing in."}
            </span>
          </div>
        ) : null}

        <GoogleButton
          label={signup ? "Sign up with Google" : "Continue with Google"}
          onPick={withGoogle}
        />

        <OrRule />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Signing in asks for a credential and nothing else. A name field on
              this side would be asking somebody who already has an account to
              tell us who they are. */}
          {signup ? (
            <Field label="Name" required className="sm:col-span-2">
              <input
                ref={firstFieldRef}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="How your opinions are signed"
                autoComplete="name"
                className={inputClass}
              />
            </Field>
          ) : null}

          <IdentifierField
            value={identifier}
            onChange={setIdentifier}
            signup={signup}
            inputRef={signup ? undefined : firstFieldRef}
            className="sm:col-span-2"
          />

          <PasswordField
            value={password}
            onChange={setPassword}
            signup={signup}
            className="sm:col-span-2"
          />

          {signup ? (
            <>
              <Field label="Date of birth" hint="Optional">
                <input
                  type="date"
                  value={form.dob ?? ""}
                  onChange={(e) => set("dob", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Mobile number" hint="Optional">
                <input
                  type="tel"
                  inputMode="tel"
                  value={form.mobile ?? ""}
                  onChange={(e) => set("mobile", e.target.value)}
                  placeholder="+91 ·········"
                  autoComplete="tel"
                  className={inputClass}
                />
              </Field>

              <Field label="Occupation" hint="Optional">
                <select
                  value={form.occupation ?? ""}
                  onChange={(e) => set("occupation", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {OCCUPATIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Country" hint="Optional">
                <select
                  value={form.country ?? ""}
                  onChange={(e) => set("country", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="State" hint="Optional">
                <input
                  value={form.state ?? ""}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="e.g. Karnataka"
                  autoComplete="address-level1"
                  className={inputClass}
                />
              </Field>

              <Field label="City" hint="Optional">
                <input
                  value={form.city ?? ""}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="e.g. Bengaluru"
                  autoComplete="address-level2"
                  className={inputClass}
                />
              </Field>
            </>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="m-0 text-[12.5px] text-negative-light">
            {error}
          </p>
        ) : null}

        <p className="m-0 rounded-[12px] border border-veil/8 bg-veil/3 p-3.5 text-[12px] leading-[1.6] text-dim">
          <strong className="font-semibold text-soft">Your privacy is protected.</strong>{" "}
          Your name is the only thing shown next to an opinion. Age, occupation and
          location are never displayed individually — they appear only inside aggregate
          percentages, and only when enough people have shared them. Your email and
          mobile number are never shown to anyone and are never sold or shared. You can
          delete your account and everything attached to it at any time.
          <span className="mt-1.5 block text-dim/80">
            In this prototype nothing is transmitted anywhere: details stay in this
            browser&rsquo;s local storage until you clear it.
          </span>
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="submit"
            className="cursor-pointer rounded-full bg-positive px-6 py-3.5 text-[14.5px] font-semibold text-positive-ink transition-colors duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {signup ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => onModeChange(signup ? "signin" : "signup")}
            className="cursor-pointer rounded-full border border-veil/16 px-6 py-3.5 text-[13.5px] font-medium text-cream transition-colors duration-300 outline-none hover:border-veil/40 focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            {signup ? "I already have an account" : "Create an account"}
          </button>
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

const inputClass =
  "w-full rounded-[10px] border border-veil/10 bg-surface-sunken px-3 py-2.5 text-[13.5px] text-cream outline-none transition-colors duration-300 focus:border-positive/50";

function Field({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-baseline gap-1.5 text-[12px] text-muted">
        {label}
        {required ? (
          <span aria-hidden className="text-positive-light">
            *
          </span>
        ) : null}
        {hint ? <span className="text-[10.5px] text-dim">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
