/**
 * Where Google sends people back to.
 *
 * OAuth here is PKCE: the provider returns a short-lived `code` on the query
 * string, and it has to be exchanged for a session by something that can write
 * cookies. A route handler can; a Server Component cannot, which is why this is
 * a route and not a page.
 *
 * `next` is validated rather than trusted. It arrives on a URL the visitor came
 * back from, so it is attacker-controlled by definition, and an open redirect on
 * the sign-in callback is the classic way to make a phishing link look like it
 * points at the real site. Only a same-site absolute path survives.
 */

import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/auth/redirect";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // The provider reports a refusal here rather than by failing the exchange —
  // somebody pressing "cancel" on Google's consent screen lands with this and
  // no code at all.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(providerError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent("That sign-in link was incomplete. Try again.")}`,
    );
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(error.message)}`);
  }

  // Where an unfinished account is sent next.
  //
  // THIS ROUTE IS NOT ONLY FOR GOOGLE, which is what the original version
  // assumed. Two other things land here with a live session:
  //
  //   the code email's "or open this link instead" — somebody mid-sign-up who
  //     clicked rather than typing the six digits. Sending them onward skipped
  //     the password screen entirely, leaving a working, signed-in account with
  //     no password anybody had chosen. That is the bug this fixes.
  //
  // NOTE ON WHAT IS *NOT* CHECKED. There is no "does this account have a
  // password" test, because the question cannot be asked: Supabase writes a
  // bcrypt hash of a generated secret for every account whether or not anyone
  // chose one, so `encrypted_password` is never null and every such check
  // returns true. An earlier version of this file relied on exactly that and
  // was silently a no-op. Sign-up completeness is used instead, because it is a
  // fact about our own tables rather than a guess about the auth schema.
  //
  // Resetting a forgotten password is not handled here. It runs through the
  // code flow on /signin, which proves the address and lands on the same
  // password screen — see the note on the "Forgot password?" button.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: details } = await supabase
      .from("profile_private")
      .select("dob, occupation, country, gender")
      .eq("user_id", user.id)
      .maybeSingle();

    const unfinished =
      !details?.dob || !details?.occupation || !details?.country || !details?.gender;

    if (unfinished) {
      // A Google account has no password to set and never will — asking would
      // be asking for a password to an account that does not use one. Everyone
      // else resumes at the password step, which flows into details after it.
      const viaGoogle = (user.app_metadata?.providers ?? []).includes("google");
      const step = viaGoogle ? "details" : "password";
      return NextResponse.redirect(
        `${origin}/signin?mode=signup&step=${step}&next=${encodeURIComponent(next)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
