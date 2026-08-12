import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * A server client with no session and no cookies.
 *
 * `supabaseServer()` reads `cookies()`, which is right for anything that
 * depends on who is asking — and fatal for anything that does not. Touching
 * `cookies()` opts the whole route out of static rendering in Next's App
 * Router, so a `revalidate` on that route is silently ignored and every
 * request runs the query again.
 *
 * That is what it did to the sitemap: `revalidate = 3600` looked right and
 * did nothing, the route was marked dynamic, and Vercel answered every crawler
 * fetch with `x-vercel-cache: MISS` and a live Postgres round trip behind it —
 * up to two seconds. Googlebot fetching a sitemap has no cookies and no
 * session, so the whole cost bought nothing.
 *
 * This client is for reads whose answer is the same for everybody: the
 * sitemap, and anything else public and cacheable. It uses the publishable
 * key, so row-level security still applies exactly as it does in the browser —
 * an unpublished topic is as invisible here as it is to any visitor. It is not
 * a way around the policies and must never become one; `supabaseAdmin()` is
 * the audited exception and stays the only one.
 */
export function supabasePublic() {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
