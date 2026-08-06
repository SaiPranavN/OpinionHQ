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

  // A Google address arrives verified and there is no password to set, but
  // nothing in an OAuth profile says where somebody lives or what they do — and
  // those are the only inputs the cross-tabs have. So a first-time Google
  // account goes to the details step rather than straight to the catalog.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: details } = await supabase
      .from("profile_private")
      .select("dob, occupation, country")
      .eq("user_id", user.id)
      .maybeSingle();

    const incomplete = !details?.dob || !details?.occupation || !details?.country;
    if (incomplete) {
      return NextResponse.redirect(
        `${origin}/signin?mode=signup&step=details&next=${encodeURIComponent(next)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
