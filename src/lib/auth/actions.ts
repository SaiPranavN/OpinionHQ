"use server";

/**
 * Sign-in, on the server.
 *
 * WHY NOT IN THE BROWSER, like every other auth call in this app. The field
 * accepts a username, and resolving one to an address means asking a question
 * that must not be askable from a browser: "does this username exist, and what
 * address is behind it?" `email_for_username` is locked to the service role for
 * that reason, and this is the only thing holding the key.
 *
 * THE TWO FAILURES RETURN THE SAME SENTENCE. A missing username and a wrong
 * password are indistinguishable in the response, deliberately — reporting them
 * separately would rebuild the enumeration oracle immediately above the function
 * that was locked to prevent it.
 */

import { readIdentifier } from "@/lib/auth/identifier";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type SignInResult = { ok: true } | { ok: false; message: string };

/** Said for a bad username, a bad address and a bad password alike. */
const REFUSED = "That email or password is not right.";

export async function signInWithIdentifier(
  identifier: string,
  password: string,
  captchaToken?: string,
): Promise<SignInResult> {
  const read = readIdentifier(identifier);
  if ("error" in read) return { ok: false, message: read.error };
  if (!password) return { ok: false, message: "Enter your password." };

  let email = read.email;

  if (!email) {
    const { data, error } = await supabaseAdmin().rpc("email_for_username", {
      handle: read.username,
    });
    // Both an error and an empty result end here, saying nothing about which.
    if (error || !data) return { ok: false, message: REFUSED };
    email = data as string;
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    // Supabase checks this against the project's captcha secret. Sign-in is
    // covered as well as sign-up: credential stuffing is the attack the check
    // is most useful against, and it targets the sign-in endpoint.
    ...(captchaToken ? { options: { captchaToken } } : {}),
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("email not confirmed")) {
      return {
        ok: false,
        message: "This address has not been confirmed yet. Finish creating your account first.",
      };
    }
    if (m.includes("captcha")) {
      return { ok: false, message: "The bot check did not pass. Reload the page and try again." };
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return { ok: false, message: "Too many attempts just now. Wait a minute and try again." };
    }
    return { ok: false, message: REFUSED };
  }

  return { ok: true };
}
