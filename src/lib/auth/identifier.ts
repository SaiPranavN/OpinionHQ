/**
 * What a credential *is*, with no React attached.
 *
 * Lifted out of `components/auth/CredentialForm.tsx` because the server needs
 * these now. Sign-in accepts a username, Supabase authenticates by address only,
 * so something on the server has to parse the field and resolve the one to the
 * other — and it cannot import a `"use client"` module to do it.
 *
 * `CredentialForm` re-exports everything here, so nothing that already imported
 * from it had to change.
 */

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
    if (!EMAIL_RE.test(identifier)) {
      return { error: "That does not look like a valid email address." };
    }
    return { identifier, email: identifier.toLowerCase(), username: "" };
  }

  if (identifier.length < MIN_USERNAME) {
    return { error: `Usernames are at least ${MIN_USERNAME} characters.` };
  }
  if (!USERNAME_RE.test(identifier)) {
    return { error: "Usernames use letters, numbers, dots, dashes and underscores." };
  }
  return { identifier, email: "", username: identifier.toLowerCase() };
}

export function checkPassword(password: string): string | null {
  return password.length < MIN_PASSWORD
    ? `Passwords are at least ${MIN_PASSWORD} characters.`
    : null;
}

/**
 * A display name for somebody who has just signed in.
 *
 * Used when an account arrives without one — an OAuth profile with no name set,
 * or the fallback in `handle_new_user`. Derived from what they typed and tidied.
 * Only ever a label on their own opinions, and editable later.
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
