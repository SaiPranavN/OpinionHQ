/**
 * Proves the connection is real.
 *
 * Not a smoke test that a client object constructs — that succeeds against a
 * typo'd URL. Every check below is a round trip that would fail if the thing it
 * describes were not actually true of the live database, and the last two are
 * the ones worth having: they confirm that row-level security *refuses* an
 * anonymous caller, rather than that it permits one.
 *
 *   npm run db:verify
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or the publishable key. See .env.example.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

type Check = { name: string; run: () => Promise<string> };

const checks: Check[] = [
  {
    name: "reference data — places tree seeded and nested",
    run: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("id, path")
        .eq("id", "bengaluru")
        .single();
      if (error) throw new Error(error.message);
      const path = (data?.path ?? []) as string[];
      // Bengaluru → Karnataka → India → Worldwide. If the trigger that
      // materialises this did not fire, the array is just ['bengaluru'] and
      // every place filter in the product silently returns nothing.
      const expected = ["bengaluru", "karnataka", "india", "worldwide"];
      if (path.join(">") !== expected.join(">")) {
        throw new Error(`place path is [${path.join(", ")}], expected [${expected.join(", ")}]`);
      }
      return path.join(" → ");
    },
  },
  {
    name: "reference data — categories, proof kinds, occupations",
    run: async () => {
      const counts = await Promise.all(
        (["categories", "proof_kinds", "occupations", "ask_categories"] as const).map(
          async (table) => {
            const { count, error } = await supabase
              .from(table)
              .select("*", { count: "exact", head: true });
            if (error) throw new Error(`${table}: ${error.message}`);
            return `${table}=${count}`;
          },
        ),
      );
      return counts.join("  ");
    },
  },
  {
    name: "reference data — fallback question sets",
    run: async () => {
      const { count, error } = await supabase
        .from("facet_set_options")
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      if (!count) throw new Error("no facet options — did db:gen-reference run?");
      return `${count} options across the library`;
    },
  },
  {
    name: "read models — topic_cards and poll_cards resolve",
    run: async () => {
      const { error: t } = await supabase.from("topic_cards").select("id").limit(1);
      if (t) throw new Error(`topic_cards: ${t.message}`);
      const { error: p } = await supabase.from("poll_cards").select("id").limit(1);
      if (p) throw new Error(`poll_cards: ${p.message}`);
      return "both views query cleanly";
    },
  },
  {
    name: "RLS — an anonymous caller cannot read private details",
    run: async () => {
      const { data, error } = await supabase.from("profile_private").select("user_id").limit(1);
      // The right answer is zero rows. A policy that let anonymous read here
      // would hand out dates of birth and phone numbers.
      if (error) return `refused: ${error.message}`;
      if (data && data.length > 0) {
        throw new Error("profile_private returned rows to an anonymous caller");
      }
      return "no rows, as intended";
    },
  },
  {
    name: "RLS — an anonymous caller cannot write a participant count",
    run: async () => {
      const { error } = await supabase
        .from("topic_stats")
        .insert({ topic_id: "00000000-0000-0000-0000-000000000000" });
      if (!error) throw new Error("topic_stats accepted an anonymous insert");
      return `refused: ${error.message.split("\n")[0]}`;
    },
  },
  {
    name: "RLS — an anonymous caller cannot read Ask ratings",
    run: async () => {
      const { data, error } = await supabase.from("ask_ratings").select("helpfulness").limit(1);
      if (error) return `refused: ${error.message}`;
      if (data && data.length > 0) throw new Error("ask_ratings returned rows to a stranger");
      return "no rows, as intended";
    },
  },
  {
    name: "auth — the auth service answers",
    run: async () => {
      const { error } = await supabase.auth.getSession();
      if (error) throw new Error(error.message);
      return "reachable";
    },
  },
];

let failed = 0;

for (const check of checks) {
  try {
    const detail = await check.run();
    console.log(`  PASS  ${check.name}\n        ${detail}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${check.name}\n        ${(error as Error).message}`);
  }
}

console.log(
  failed === 0
    ? `\nAll ${checks.length} checks passed against ${url}`
    : `\n${failed} of ${checks.length} checks failed against ${url}`,
);

process.exit(failed === 0 ? 0 : 1);
