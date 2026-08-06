/**
 * The Supabase environment, read once and checked.
 *
 * WHY THIS FILE EXISTS RATHER THAN `process.env` AT THE CALL SITE. A missing key
 * in a `createClient` call fails at the first query, in a component, as a
 * "Failed to fetch" — which is indistinguishable from the network being down and
 * sends you looking in the wrong place. Read here, it fails at import with the
 * name of the variable you forgot.
 *
 * THE REFERENCES ARE LITERAL ON PURPOSE. Next.js inlines `NEXT_PUBLIC_*` at
 * build time by static analysis, so `process.env[someVariable]` resolves to
 * `undefined` in the browser bundle no matter what the shell had. Every read
 * below spells the name out.
 *
 * TWO NAMES FOR EACH KEY. Supabase's newer projects issue `sb_publishable_…`
 * and `sb_secret_…` in place of the older `anon` and `service_role` JWTs. Both
 * work; the fallbacks mean a project on either scheme runs without editing code.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in from ` +
        `your Supabase project's API settings.`,
    );
  }
  return value;
}

/**
 * The project URL and the key that is *meant* to be public.
 *
 * The publishable key ships in the browser bundle and always has. It is not a
 * secret and treating it as one leads people to reach for the service key to
 * "be safe", which is the actual mistake. What protects the data is the row
 * policies in `supabase/migrations`, not the obscurity of this string.
 */
export function supabaseEnv(): { url: string; key: string } {
  return {
    url: required(url, "NEXT_PUBLIC_SUPABASE_URL"),
    key: required(publishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

/** True when the app has enough configuration to talk to Supabase at all. */
export const isSupabaseConfigured = Boolean(url && publishableKey);
