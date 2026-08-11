import "server-only";

/**
 * The server client — one per request, never shared.
 *
 * A client carries the caller's session, so caching one across requests would
 * serve one person's data to the next. `cookies()` is per-request in Next's App
 * Router and this function is deliberately cheap, so calling it in every server
 * component that needs it is the correct usage rather than a thing to optimise.
 *
 * WHY `setAll` SWALLOWS ITS ERROR. Server Components cannot write cookies — Next
 * throws if you try. That is fine here because the middleware in
 * `src/middleware.ts` refreshes the session on every request and writes the
 * rotated tokens back. Without that middleware this catch would silently drop
 * refreshed tokens and log people out at random, which is exactly the bug the
 * Supabase docs warn about; the two pieces only work as a pair.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

export async function supabaseServer() {
  const { url, key } = supabaseEnv();
  const store = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            store.set(name, value, options);
          }
        } catch {
          // Called from a Server Component. The middleware has already written
          // these to the response; see the note above.
        }
      },
    },
  });
}

/**
 * Who is making this request, or null.
 *
 * ALWAYS `getUser`, NEVER `getSession`, on the server. `getSession` reads the
 * cookie and believes it; `getUser` asks the auth server to verify the token.
 * The cookie is attacker-controllable, so on any path where the answer decides
 * what somebody may see, only the verified one will do.
 */
export async function currentUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
