"use client";

/**
 * The credential fields, shared by the sign-in page and the sign-in sheet.
 *
 * One implementation so the rules cannot differ between the two doors into the
 * same account. Everything about *what a credential is* lives here; everything
 * about layout lives in the two callers.
 *
 * THE PASSWORD IS NEVER STORED, and the enforcement is structural rather than
 * a promise: it is held in state here, checked for length, and dropped.
 * `AccountDetails` has no field it could travel in, so no caller can persist it
 * by accident — anybody wiring a real backend has to add that field
 * deliberately, and will read this comment when they do.
 */

import { useState } from "react";

export interface Credentials {
  /** What they typed to identify themselves: an address or a username. */
  identifier: string;
  /** Set only when the identifier was an address. */
  email: string;
  /** Set only when the identifier was not an address. */
  username: string;
}

export const MIN_PASSWORD = 8;
const MIN_USERNAME = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;

/**
 * Accepts an address or a username in one field.
 *
 * One field rather than two, because a person signing in knows which of theirs
 * they are typing and does not need to be asked. The `@` decides — a rule the
 * reader can predict, which is the only kind worth having in a login box.
 */
export function readIdentifier(raw: string): Credentials | { error: string } {
  const identifier = raw.trim();
  if (!identifier) return { error: "Enter your username or email address." };

  if (identifier.includes("@")) {
    if (!EMAIL_RE.test(identifier)) return { error: "That does not look like a valid email address." };
    return { identifier, email: identifier, username: "" };
  }

  if (identifier.length < MIN_USERNAME) {
    return { error: `Usernames are at least ${MIN_USERNAME} characters.` };
  }
  if (!USERNAME_RE.test(identifier)) {
    return { error: "Usernames use letters, numbers, dots, dashes and underscores." };
  }
  return { identifier, email: "", username: identifier };
}

export function checkPassword(password: string): string | null {
  return password.length < MIN_PASSWORD
    ? `Passwords are at least ${MIN_PASSWORD} characters.`
    : null;
}

/**
 * A display name for somebody who has just signed in.
 *
 * There is no account record to look one up in, so it is derived from what
 * they typed and tidied. Editable later, and only ever a label on their own
 * opinions.
 */
export function nameFrom(credentials: Credentials): string {
  const source = credentials.username || credentials.email.split("@")[0] || "";
  const cleaned = source.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "You";
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* ------------------------------------------------------------------ fields */

export function IdentifierField({
  value,
  onChange,
  signup,
  inputRef,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  signup: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
}) {
  return (
    <AuthField
      label={signup ? "Email" : "Username or email"}
      required
      className={className}
    >
      <input
        ref={inputRef}
        // `text`, not `email`: the field legitimately accepts a username on
        // sign-in, and the browser's built-in email validation would reject
        // one before this component ever saw it.
        type={signup ? "email" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={signup ? "you@gmail.com" : "yourname or you@gmail.com"}
        autoComplete={signup ? "email" : "username"}
        autoCapitalize="none"
        spellCheck={false}
        className={authInput}
      />
    </AuthField>
  );
}

export function PasswordField({
  value,
  onChange,
  signup,
  className = "",
  forgotHref,
  minLength = MIN_PASSWORD,
}: {
  value: string;
  onChange: (next: string) => void;
  signup: boolean;
  className?: string;
  forgotHref?: React.ReactNode;
  /**
   * Sign-in and sign-up have different floors on purpose — sign-in has to
   * accept a password set under an older rule, sign-up enforces the current
   * one. The caller passes its own so the placeholder and the strength meter
   * cannot show two different numbers, which is exactly what they did.
   */
  minLength?: number;
}) {
  const [shown, setShown] = useState(false);
  return (
    <AuthField
      label="Password"
      required
      className={className}
      trailing={forgotHref}
      hint={signup ? `At least ${minLength} characters` : undefined}
    >
      <span className="relative flex">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`At least ${minLength} characters`}
          autoComplete={signup ? "new-password" : "current-password"}
          className={`${authInput} pr-[64px]`}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 cursor-pointer px-3 text-[11.5px] font-medium text-dim transition-colors hover:text-soft"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </span>
    </AuthField>
  );
}

export const authInput =
  "w-full rounded-[11px] border border-veil/12 bg-surface-sunken px-3.5 py-3 text-[14px] text-cream outline-none transition-colors duration-300 focus:border-positive/50";

/**
 * One labelled field.
 *
 * Renders a `<label>` when it wraps a real form control and a `<div>` when the
 * control is a custom listbox — wrapping a `<button>` in a label makes clicking
 * the label toggle the popup open and straight back shut, so `htmlFor` points
 * at the button instead.
 *
 * The error sits under the field rather than in a summary at the top, because
 * a message that is not next to the box it is about makes somebody hunt for
 * which of six fields it means.
 */
export function AuthField({
  label,
  hint,
  required,
  error,
  trailing,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  trailing?: React.ReactNode;
  /** Set when the control is not a native input — renders a div, not a label. */
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const Wrapper = htmlFor ? "div" : "label";
  return (
    <Wrapper className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-baseline justify-between gap-3">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-[12.5px] text-muted">
            {label}
            {required ? (
              <span aria-hidden className="text-positive-light">
                *
              </span>
            ) : null}
            {hint ? <span className="text-[10.5px] text-dim">{hint}</span> : null}
          </label>
        ) : (
          <span className="flex items-baseline gap-1.5 text-[12.5px] text-muted">
            {label}
            {required ? (
              <span aria-hidden className="text-positive-light">
                *
              </span>
            ) : null}
            {hint ? <span className="text-[10.5px] text-dim">{hint}</span> : null}
          </span>
        )}
        {trailing}
      </span>
      {children}
      {error ? (
        <span className="text-[11.5px] leading-[1.4] text-negative-light">{error}</span>
      ) : null}
    </Wrapper>
  );
}

/** "or" with a rule either side. Used between the Google button and the form. */
export function OrRule() {
  return (
    <span className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-veil/10" />
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-dim">or</span>
      <span className="h-px flex-1 bg-veil/10" />
    </span>
  );
}
