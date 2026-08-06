/**
 * Runs before every render. Its only job is to keep the Supabase session fresh —
 * see `lib/supabase/middleware.ts` for why that cannot happen anywhere else.
 *
 * NO ROUTE GUARDS HERE, deliberately. Browsing is never gated on OpinionHQ: you
 * can read every topic, poll, public question and answer without an account, and
 * a middleware that redirected signed-out visitors would quietly undo that. What
 * an account changes is what you can *write*, and that is enforced by the row
 * policies rather than by a redirect.
 */

import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and images. Refreshing a session on a
     * request for a font costs a round trip to the auth server and refreshes
     * nothing the page will use.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
