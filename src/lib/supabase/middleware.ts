/**
 * Session refresh, on every request.
 *
 * Supabase access tokens are short-lived and rotate. Server Components cannot
 * write cookies, so if nothing refreshed the session before rendering, a token
 * would expire mid-visit and the visitor would be signed out at a moment that
 * looks random. This is the one place in a Next.js app that can both read the
 * request's cookies and write the response's, which is why the refresh lives
 * here and not in a layout.
 *
 * THE ORDER OF THE THREE STEPS BELOW IS LEAD, NOT PREFERENCE:
 *
 *   1. Build the response from the request.
 *   2. Create the client, writing any rotated cookies to BOTH the request (so
 *      the render that follows sees them) and the response (so the browser
 *      keeps them).
 *   3. Call `getUser()`. Nothing between creating the client and this call —
 *      an early return in that gap ships a response with a stale session.
 *
 * `getUser`, not `getSession`: the cookie is attacker-controllable and only the
 * auth server can say whether the token in it is real.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Nothing to refresh before the project is wired up. Returning early keeps
  // `npm run dev` working on a checkout with no .env.local rather than throwing
  // on every route.
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet, headers) {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
          // A response that sets auth cookies must never be cached by a CDN or
          // a reverse proxy — one visitor's token served to another is the
          // worst bug this file could have. The library hands us the headers
          // that say so.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}
