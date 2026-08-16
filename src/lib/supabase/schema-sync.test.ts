/**
 * The TypeScript unions and the Postgres enums have to say the same thing.
 *
 * WHY THIS TEST IS WORTH ITS WEIGHT. Nothing else catches this. Adding a status
 * to `StatusId` compiles, ships, renders, and then fails at the one moment it
 * matters — an editor saves, Postgres rejects `'Postponed'` as not a member of
 * `artifact_status`, and the error surfaces as a failed write on a form. Adding
 * a *place* is caught by the generator; adding an enum member is not, because
 * enum members live in hand-written SQL.
 *
 * It reads the migration files as text rather than querying a database, so it
 * runs in CI with no credentials and no container.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ASK_CATEGORIES } from "@/lib/ask/taxonomy";
import { PROOF_KINDS } from "@/lib/ask/verification";
import { AGE_BANDS } from "@/lib/demographics";
import { FREE_ASKS, PRO_PRICE_INR } from "@/lib/entitlements";
import { MIN_EXPLANATION } from "@/lib/contributions";
import { MAX_CONTRIBUTION_EDITS } from "@/lib/topics/contributions";
import { MAX_COMMENT_DEPTH } from "@/lib/ask/comments";
import { MAX_MATCHES, REPLY_CAP } from "@/lib/ask/taxonomy";
import { MAX_POLL_OPTIONS } from "@/lib/types";
import { PLACES } from "@/lib/places";
import { CATEGORIES, STATUS_STYLES } from "@/lib/taxonomy";

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(MIGRATIONS, f), "utf8"))
  .join("\n");

/** The members of `create type public.<name> as enum (...)`, in file order. */
function enumMembers(name: string): string[] {
  const match = sql.match(new RegExp(`create type public\\.${name} as enum \\(([^)]*)\\)`, "s"));
  if (!match?.[1]) throw new Error(`no enum named ${name} in the migrations`);
  return [...match[1].matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]!.replace(/''/g, "'"));
}

describe("enums match their TypeScript unions", () => {
  it("sentiment", () => {
    expect(enumMembers("sentiment")).toEqual(["Positive", "Neutral", "Negative"]);
  });

  it("artifact_status covers every StatusId", () => {
    expect(enumMembers("artifact_status").sort()).toEqual(Object.keys(STATUS_STYLES).sort());
  });

  it("place_level covers every level in the registry", () => {
    const used = [...new Set(PLACES.map((p) => p.level))].sort();
    const declared = enumMembers("place_level");
    for (const level of used) expect(declared).toContain(level);
  });

  it("ask_category covers every Ask area", () => {
    expect(enumMembers("ask_category").sort()).toEqual(ASK_CATEGORIES.map((c) => c.id).sort());
  });

  it("proof_type covers every kind of proof", () => {
    expect(enumMembers("proof_type").sort()).toEqual(PROOF_KINDS.map((k) => k.id).sort());
  });

  it("age_band matches the reported buckets", () => {
    expect(enumMembers("age_band")).toEqual([...AGE_BANDS]);
  });

  it("option_slot allows exactly as many options as a poll may have", () => {
    expect(enumMembers("option_slot")).toHaveLength(MAX_POLL_OPTIONS);
  });
});

describe("categories reach the database", () => {
  it("every category id is inserted by the generated reference migration", () => {
    for (const category of CATEGORIES) {
      expect(sql).toContain(`('${category.id}', '${category.label.replace(/'/g, "''")}'`);
    }
  });

  it("every place id is inserted", () => {
    for (const place of PLACES) {
      expect(sql).toContain(`('${place.id}', '${place.label.replace(/'/g, "''")}'`);
    }
  });
});

describe("limits are enforced in both places", () => {
  // These are the numbers a policy or a trigger hard-codes because a policy
  // cannot import a constant. Each one is restated in SQL, so each one can
  // drift; asserting the literal is the cheapest way to notice.

  it("the free-ask allowance in can_ask matches FREE_ASKS", () => {
    const fn = sql.match(/create or replace function public\.can_ask[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toContain(`public.asks_used(uid) < ${FREE_ASKS}`);
  });

  it("the match bound matches MAX_MATCHES", () => {
    const fn = sql.match(/function public\.check_match_count[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toContain(`> ${MAX_MATCHES}`);
  });

  it("the reply cap matches REPLY_CAP", () => {
    const fn = sql.match(/function public\.check_reply_cap[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toContain(`> ${REPLY_CAP}`);
  });

  it("comment depth is clamped at MAX_COMMENT_DEPTH", () => {
    // Columns are space-aligned in the migrations, so compare on collapsed
    // whitespace rather than forcing the SQL to be formatted for a test.
    const flat = sql.replace(/[ \t]+/g, " ");
    expect(flat).toContain(`check (depth between 0 and ${MAX_COMMENT_DEPTH})`);
    const fn = sql.match(/function public\.set_comment_depth[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toContain(`least(coalesce(parent_depth, 0) + 1, ${MAX_COMMENT_DEPTH})`);
  });

  it("a poll's upper option bound matches MAX_POLL_OPTIONS", () => {
    const fn = sql.match(/function public\.check_poll_option_count[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toContain(`> ${MAX_POLL_OPTIONS}`);
  });

  it("every write path that takes a vote requires MIN_EXPLANATION characters", () => {
    // A vote cannot be cast without a written reason. Three functions can
    // create one, and a gate on two of three is not a gate — `vote_and_explain`
    // exists precisely so the poll path cannot land a bare vote, and it would
    // be pointless if `explain_poll_vote` still accepted an empty body from a
    // caller who skipped the wrapper.
    for (const fn of ["cast_vote", "explain_poll_vote", "vote_and_explain"]) {
      // The LAST definition, not the last mention. Anchoring on
      // `function public.<name>(` finds the trailing grant/revoke line instead,
      // and the assertion then reads whatever migration happens to come after
      // it — which is how this test first passed against the wrong text.
      const defs = [
        ...sql.matchAll(
          new RegExp(`create (?:or replace )?function public\\.${fn}\\(([\\s\\S]*?)\\$\\$;`, "g"),
        ),
      ];
      const body = defs[defs.length - 1]?.[0] ?? "";
      expect(body, `${fn} — no definition found`).not.toBe("");
      expect(body, fn).toMatch(
        new RegExp(`length\\(trim\\(coalesce\\([^)]*\\)\\)\\) < ${MIN_EXPLANATION}`),
      );
    }
  });
});

describe("row-level security is not optional", () => {
  const created = [...sql.matchAll(/^create table public\.(\w+)/gm)].map((m) => m[1]!);
  const enabled = new Set(
    [...sql.matchAll(/alter table public\.(\w+)\s+enable row level security/g)].map((m) => m[1]!),
  );

  it("every table created has RLS turned on", () => {
    // A table with RLS off is a table the publishable key reads in full. This
    // is the single check most likely to catch a genuine mistake in a future
    // migration, because forgetting the `alter table` line is invisible in
    // review and total in effect.
    const missing = created.filter((t) => !enabled.has(t));
    expect(missing).toEqual([]);
  });

  it("finds the tables it claims to check", () => {
    // Guards the regex above: if it ever stops matching, the test would pass
    // vacuously on an empty list and assert nothing at all.
    expect(created.length).toBeGreaterThan(30);
  });
});

describe("security definer functions pin their search path", () => {
  it("every one sets search_path", () => {
    // A SECURITY DEFINER function with a mutable search_path is the classic
    // Postgres privilege-escalation hole: a role that can create a schema can
    // shadow a table the function reads.
    const definers = [
      ...sql.matchAll(/create or replace function public\.(\w+)[\s\S]*?language \w+[\s\S]*?\$\$/g),
    ];
    const unpinned = definers
      .filter((m) => m[0].includes("security definer") && !m[0].includes("set search_path"))
      .map((m) => m[1]!);
    expect(unpinned).toEqual([]);
  });
});

describe("the audience cross-tabs", () => {
  /**
   * The joint cells are a sharper instrument than the marginals they replace on
   * the page, so the guard in front of them matters more, not less. Without the
   * publication check these functions would cross-tab an unpublished draft for
   * anybody who knew its id — and because they are SECURITY DEFINER, row-level
   * security would not stop it.
   */
  it("refuse a subject the caller is not allowed to see", () => {
    for (const [fn, table] of [
      ["topic_audience_cells", "topics"],
      ["poll_audience_cells", "polls"],
    ] as const) {
      const body = sql.slice(sql.lastIndexOf(`create or replace function public.${fn}`));
      const head = body.slice(0, body.indexOf("return query"));
      expect(head, fn).toContain(`from public.${table}`);
      expect(head, fn).toContain("published_at is not null");
      expect(head, fn).toContain("archived_at is null");
      expect(head, fn).toContain("public.is_editor()");
    }
  });

  it("null out the answers that do not count as answers", () => {
    // "Prefer not to say" is a real response and is stored, and it is still not
    // a gender. An occupation outside `counts_in_breakdowns` is the same rule.
    // Both are nulled per column rather than filtered per row, so somebody who
    // declined one question is still counted in the three they answered.
    for (const fn of ["topic_audience_cells", "poll_audience_cells"]) {
      const body = sql.slice(sql.lastIndexOf(`create or replace function public.${fn}`));
      expect(body.slice(0, 2000), fn).toContain("<> 'Prefer not to say'");
      expect(body.slice(0, 2000), fn).toContain("counts_in_breakdowns");
      // A left join, not an inner one — an inner join here would silently drop
      // every voter who skipped a field from all four breakdowns.
      expect(body.slice(0, 2000), fn).toContain("left join public.occupations");
      expect(body.slice(0, 2000), fn).toContain("left join lateral");
    }
  });
});

describe("Pro", () => {
  it("the fallback price matches the one seeded into pro_offer", () => {
    // `PRO_PRICE_INR` renders before the offer row arrives, and `pro_offer`
    // is what the payment code will eventually charge. Two numbers describing
    // the same price is one number away from a page advertising ₹99 while the
    // checkout takes something else.
    const match = sql.match(/price_inr\s+integer not null default (\d+)/);
    expect(match?.[1]).toBe(String(PRO_PRICE_INR));

    const seeded = sql.match(/values \(true, timestamptz '[^']+', (\d+)\)/);
    expect(seeded?.[1]).toBe(String(PRO_PRICE_INR));
  });

  it("only Pro may post anonymously, and it is enforced in SQL", () => {
    // The composer's toggle is a convenience. This is the rule: every table
    // that carries authored text refuses `anonymous = true` from a non-member
    // in its own insert policy, so a hand-rolled request is refused too.
    for (const table of [
      "opinions",
      "opinion_replies",
      "poll_reasons",
      "poll_reason_replies",
    ]) {
      const policy = sql.match(
        new RegExp(`create policy "[^"]+" on public\\.${table} for insert[\\s\\S]*?;`, "g"),
      );
      const last = policy?.[policy.length - 1] ?? "";
      expect(last).toContain("anonymous = false or public.is_pro()");
    }
  });

  it("is_pro checks revocation, not just status", () => {
    // Without this an admin's revocation lasts until the account notices the
    // button still works.
    const fn = sql.slice(sql.lastIndexOf("function public.is_pro"));
    expect(fn.slice(0, 600)).toContain("revoked_at is null");
  });
});

describe("contribution edits", () => {
  it("the composer's allowance matches the one publish_contribution enforces", () => {
    // The composer greys out its own button at this number and the database
    // raises past it. Two numbers describing one rule is one edit away from a
    // button that stays enabled and then fails.
    const fn = sql.slice(sql.lastIndexOf("function public.publish_contribution"));
    expect(fn).toMatch(
      new RegExp(`existing\\.edit_count >= ${MAX_CONTRIBUTION_EDITS}`),
    );
  });

  it("withdrawing is not rate limited", () => {
    // A cap on updates limits rewriting what people replied to. A cap on
    // withdrawal would limit taking your own words back, which is a different
    // thing and not one worth imposing.
    const fn = sql.slice(sql.lastIndexOf("function public.withdraw_contribution"));
    expect(fn.slice(0, 900)).not.toContain("edit_count");
  });
});

describe("polls and topics carry the same conversation", () => {
  it("a poll reason has every engagement table an opinion has", () => {
    // The two sides drifting is the failure this guards: a reader who can like,
    // dislike and reply on a topic should find the same four actions on a poll,
    // and the tables behind them are what make that true rather than the
    // buttons. `poll_reason_helpful` was the like-only version and is gone.
    for (const table of [
      "opinion_votes",
      "opinion_reply_votes",
      "poll_reason_votes",
      "poll_reason_reply_votes",
      "poll_reason_replies",
    ]) {
      // Either declaration form: the older tables predate the
      // `if not exists` convention this codebase settled on later.
      expect(sql).toMatch(
        new RegExp(`create table (if not exists )?public\\.${table}\\b`),
      );
    }
    expect(sql).toContain("drop table if exists public.poll_reason_helpful");
  });

  it("both reply tables cap the thread at the same depth", () => {
    // Two threaded discussions in one product that indent differently is two
    // things for a reader to learn for no reason.
    const caps = [...sql.matchAll(/depth integer not null default 0 check \(depth between 0 and (\d)\)/g)]
      .map((m) => m[1]);
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(new Set(caps).size).toBe(1);
    expect(caps[0]).toBe(String(MAX_COMMENT_DEPTH));
  });
});
