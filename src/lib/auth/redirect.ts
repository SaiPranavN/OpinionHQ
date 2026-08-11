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
