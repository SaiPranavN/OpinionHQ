/**
 * Where to land after signing in.
 *
 * AN OPEN REDIRECT ON A SIGN-IN PAGE is the classic way to make a phishing link
 * look like it points at the real site: the host is genuinely yours, the visitor
 * genuinely signs in, and then they are handed to somebody else's page still
 * believing they are on it. `?next=` comes from the URL, so it is
 * attacker-controlled by definition.
 *
 * Only a same-site absolute path is honoured. Anything with a scheme, a host, or
 * a protocol-relative `//` prefix falls back to the catalog.
 *
 * IN ITS OWN MODULE for two reasons. It was duplicated — once in `SignInView`
 * and once in the OAuth callback route — and two copies of a security check is
 * one copy that gets fixed. And it is imported by a route handler, which means a
 * `"use client"` module cannot be the thing that owns it.
 */

const DEFAULT_NEXT = "/topics";

export function safeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  if (!raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_NEXT;
  return raw;
}

/**
 * The flag that tells the explore page a brand-new account just arrived.
 *
 * A query parameter rather than anything stored, because it has to survive
 * exactly one navigation and nothing longer. A flag in localStorage would fire
 * again on a later visit, and one in the session would need clearing from a
 * place that has no business knowing about a welcome modal.
 */
export const WELCOME_PARAM = "welcome";

/**
 * Marks a destination as "they just signed up".
 *
 * Appends rather than replaces, so a `next` that already carries a query — a
 * filtered catalog, say — arrives intact.
 */
export function withWelcome(path: string): string {
  const [base, hash] = path.split("#");
  const separator = (base ?? "").includes("?") ? "&" : "?";
  return `${base}${separator}${WELCOME_PARAM}=1${hash ? `#${hash}` : ""}`;
}
