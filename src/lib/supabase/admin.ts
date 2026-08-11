import "server-only";

/**
 * The service-role client. RLS DOES NOT APPLY TO IT.
 *
 * Every policy in `supabase/migrations` — who may read a private question,
 * whose rating stays private, who may write a participant count — is bypassed
 * here. That is the point, and it is also the danger: this key in a browser
 * bundle is a full database compromise, so `server-only` above turns any import
 * from a client component into a build error rather than a leak.
 *
 * WHAT IT IS ACTUALLY FOR, and nothing else belongs on this list:
 *
 *   - Routing a question to professionals. `ask_matches` has no insert policy
 *     at all, because a client that could write it could route a question to
 *     itself.
 *   - Recomputing aggregates: trending scores, daily snapshots, poll history.
 *   - A professional's helpful percentage, which is an aggregate over ratings
 *     no reader is ever allowed to see individually.
 *   - Billing webhooks writing `subscriptions`.
 *
 * If you are reaching for this to make a query work, the query is being made by
 * the wrong client or a policy is missing. Fix that instead.
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  if (!secret) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. It is only needed for jobs and webhooks; " +
        "ordinary reads and writes should use supabaseServer().",
    );
  }

  return createClient<Database>(url, secret, {
    auth: {
      // No session, no refresh, no storage. This client is not a person and
      // must never pick one up from a cookie jar it happened to share.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
