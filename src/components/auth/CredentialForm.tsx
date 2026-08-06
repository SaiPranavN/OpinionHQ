"use client";

/**
 * The credential fields, shared by the sign-in page and the sign-in sheet.
 *
 * One implementation so the rules cannot differ between the two doors into the
 * same account. Everything about *what a credential is* lives here; everything
 * about layout lives in the two callers.
 *
 * THE PASSWORD NEVER TOUCHES APPLICATION STATE. It is held here, handed
 * straight to Supabase, and dropped. `AccountDetails` has no field it could
 * travel in and neither does `profiles` — the only thing that stores it is
 * `auth.users`, hashed, where this code cannot read it back.
 *
 * WHAT A CREDENTIAL IS now lives in `lib/auth/identifier.ts`, because the server
 * action that resolves a username to an address needs the same parser and cannot
 * import a `"use client"` module. Re-exported below so nothing else had to move.
 */

import { useState } from "react";

import {
  MIN_PASSWORD,
  checkPassword,
  nameFrom,
  readIdentifier,
  type Credentials,
} from "@/lib/auth/identifier";

export { MIN_PASSWORD, checkPassword, nameFrom, readIdentifier };
export type { Credentials };

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
