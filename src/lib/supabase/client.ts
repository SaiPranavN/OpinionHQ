"use client";

/**
 * The browser client.
 *
 * One per tab. `createBrowserClient` is a singleton by default, so calling this
 * from twenty components does not open twenty auth listeners — but the local
 * `cached` is kept anyway because the singleton is keyed on the arguments, and a
 * future caller passing options would quietly get a second client and a second
 * `onAuthStateChange` subscription fighting over the same cookie.
 *
 * WHAT THIS CLIENT IS ALLOWED TO DO is whatever the row policies say and nothing
 * more. It runs with the publishable key, which is public; every rule that
 * matters — who can read a private question, who can write a stats row — is
 * enforced in Postgres. Nothing here is a security boundary.
 */

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

type Client = ReturnType<typeof createBrowserClient<Database>>;

let cached: Client | undefined;

export function supabaseBrowser(): Client {
  if (!cached) {
    const { url, key } = supabaseEnv();
    cached = createBrowserClient<Database>(url, key);
  }
  return cached;
}
