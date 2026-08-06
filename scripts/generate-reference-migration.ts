/**
 * Emits the reference-data migration from the TypeScript vocabularies.
 *
 * WHY GENERATE IT. The places tree, the category taxonomy, the fallback question
 * sets and the kinds of proof already exist in `src/lib`, are already
 * type-checked, and are already what the UI renders. Hand-transcribing them into
 * SQL would create a second copy that drifts the first time somebody adds a city
 * — and the failure mode of that drift is a topic that cannot be filed, found
 * days later.
 *
 * WHY A MIGRATION AND NOT A SEED SCRIPT. A seed that runs separately means a
 * freshly-migrated database is not a working one, and the FK targets everything
 * else depends on would be missing until somebody remembered a second command.
 *
 * WHY A NEW FILE EACH TIME. Supabase records which migrations have been applied
 * by version. Rewriting an already-applied file would leave the change sitting
 * on disk, unapplied, looking done. Re-run this after changing a vocabulary and
 * it writes the next timestamped migration; the statements are idempotent
 * upserts, so applying it to a database that already has the rows is a no-op.
 *
 *   npm run db:gen-reference
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ASK_CATEGORIES } from "@/lib/ask/taxonomy";
import { PROOF_KINDS, PROOF_WEIGHT } from "@/lib/ask/verification";
import { OCCUPATION_OPTIONS } from "@/lib/demographics";
import { FACET_SETS } from "@/lib/facets";
import { PLACES, type Place } from "@/lib/places";
import { CATEGORIES } from "@/lib/taxonomy";

/** Single-quoted SQL literal, or NULL. Doubling is how Postgres escapes. */
const lit = (value: string | null | undefined): string =>
  value === null || value === undefined ? "null" : `'${value.replace(/'/g, "''")}'`;

const arr = (values: readonly string[]): string =>
  values.length === 0 ? "'{}'" : `array[${values.map(lit).join(", ")}]`;

const rows = (values: string[]): string => values.map((r) => `  (${r})`).join(",\n");

const sections: string[] = [];

/* ------------------------------------------------------------------ places */
//
// Ordered parents-first so the self-referencing foreign key is satisfiable in a
// single statement. `placeOptions()` already walks the tree depth-first, which
// is exactly that order — but it lives behind a function that returns picker
// shapes, so the walk is repeated here over the raw registry.
const ordered: Place[] = [];
const walk = (parent: string | undefined) => {
  for (const place of PLACES) {
    if (place.parent !== parent) continue;
    ordered.push(place);
    walk(place.id);
  }
};
walk(undefined);

sections.push(`-- ${ordered.length} places, parents first so the self-FK resolves in one statement.
insert into public.places (id, label, short, level, parent_id, sort_order) values
${rows(
  ordered.map(
    (p, i) =>
      `${lit(p.id)}, ${lit(p.label)}, ${lit(p.short)}, ${lit(p.level)}::public.place_level, ${lit(p.parent ?? null)}, ${i}`,
  ),
)}
on conflict (id) do update set
  label = excluded.label,
  short = excluded.short,
  level = excluded.level,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;`);

/* -------------------------------------------------------------- categories */
sections.push(`insert into public.categories (id, label, short, blurb, reserved, sort_order) values
${rows(
  CATEGORIES.map(
    (c, i) =>
      `${lit(c.id)}, ${lit(c.label)}, ${lit(c.short)}, ${lit(c.blurb)}, ${c.reserved ? "true" : "false"}, ${i}`,
  ),
)}
on conflict (id) do update set
  label = excluded.label,
  short = excluded.short,
  blurb = excluded.blurb,
  reserved = excluded.reserved,
  sort_order = excluded.sort_order;`);

/* ---------------------------------------------------------- ask categories */
sections.push(`insert into public.ask_categories (id, label, short, blurb, examples, sort_order) values
${rows(
  ASK_CATEGORIES.map(
    (c, i) =>
      `${lit(c.id)}::public.ask_category, ${lit(c.label)}, ${lit(c.short)}, ${lit(c.blurb)}, ${arr(c.examples)}, ${i}`,
  ),
)}
on conflict (id) do update set
  label = excluded.label,
  short = excluded.short,
  blurb = excluded.blurb,
  examples = excluded.examples,
  sort_order = excluded.sort_order;`);

/* ------------------------------------------------------------- proof kinds */
sections.push(`-- The evidence itself is never stored on a credential. These rows describe what
-- may be offered and what the resulting badge is allowed to claim.
insert into public.proof_kinds (id, category, evidence_label, evidence_category, public_label, not_verified, weight) values
${rows(
  PROOF_KINDS.map(
    (k) =>
      `${lit(k.id)}::public.proof_type, ${lit(k.category)}::public.ask_category, ${lit(k.evidenceLabel)}, ` +
      `${lit(k.evidenceCategory)}, ${lit(k.publicLabel)}, ${lit(k.notVerified)}, ${PROOF_WEIGHT[k.id]}`,
  ),
)}
on conflict (id) do update set
  category = excluded.category,
  evidence_label = excluded.evidence_label,
  evidence_category = excluded.evidence_category,
  public_label = excluded.public_label,
  not_verified = excluded.not_verified,
  weight = excluded.weight;`);

/* ------------------------------------------------------------- occupations */
sections.push(`insert into public.occupations (label, counts_in_breakdowns, sort_order) values
${rows(
  OCCUPATION_OPTIONS.map(
    (o, i) => `${lit(o.label)}, ${o.countsInBreakdowns ? "true" : "false"}, ${i}`,
  ),
)}
on conflict (label) do update set
  counts_in_breakdowns = excluded.counts_in_breakdowns,
  sort_order = excluded.sort_order;`);

/* ----------------------------------------------------------- facet library */
const setIds = Object.keys(FACET_SETS);

sections.push(`insert into public.facet_sets (id, label) values
${rows(setIds.map((id) => `${lit(id)}, ${lit(id)}`))}
on conflict (id) do update set label = excluded.label;`);

const facetRows: string[] = [];
const optionRows: string[] = [];

for (const [setId, facets] of Object.entries(FACET_SETS)) {
  facets.forEach((facet, fi) => {
    facetRows.push(
      `${lit(setId)}, ${lit(facet.id)}, ${lit(facet.label)}, ${lit(facet.prompt)}, ${fi}`,
    );
    facet.options.forEach((option, oi) => {
      optionRows.push(
        `${lit(setId)}, ${lit(facet.id)}, ${lit(option.id)}, ${lit(option.label)}, ` +
          `${lit(option.tone)}::public.sentiment, ${oi}`,
      );
    });
  });
}

sections.push(`-- The category-level fallback question sets. A topic gets a *copy* of one of
-- these (see public.apply_facet_set), so editing the library later never
-- rewrites a question people have already answered.
insert into public.facet_set_facets (set_id, key, label, prompt, position) values
${rows(facetRows)}
on conflict (set_id, key) do update set
  label = excluded.label,
  prompt = excluded.prompt,
  position = excluded.position;`);

sections.push(`insert into public.facet_set_options (facet_id, key, label, tone, position)
select f.id, v.key, v.label, v.tone, v.position
from (values
${rows(optionRows)}
) as v(set_id, facet_key, key, label, tone, position)
join public.facet_set_facets f on f.set_id = v.set_id and f.key = v.facet_key
on conflict (facet_id, key) do update set
  label = excluded.label,
  tone = excluded.tone,
  position = excluded.position;`);

/* ------------------------------------------------------------------- write */

const stamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .slice(0, 14);

const header = `-- =============================================================================
-- Reference data — GENERATED. Do not edit by hand.
--
-- Written by \`npm run db:gen-reference\` from:
--   src/lib/places.ts        the places tree
--   src/lib/taxonomy.ts      the topic categories
--   src/lib/ask/taxonomy.ts  the three Ask areas
--   src/lib/ask/verification.ts  the kinds of proof
--   src/lib/demographics.ts  the occupation vocabulary
--   src/lib/facets.ts        the fallback question sets
--
-- Change the TypeScript, re-run the command, commit the new migration. Editing
-- this file instead means the next regeneration silently reverts you.
--
-- Contains no users, no votes, no opinions and no engagement figures: these are
-- facts about the product, not about people (AGENTS.md §7).
-- =============================================================================

`;

const dir = join(process.cwd(), "supabase", "migrations");
mkdirSync(dir, { recursive: true });

const file = join(dir, `${stamp}_reference_data.sql`);
writeFileSync(file, header + sections.join("\n\n") + "\n", "utf8");

const counts = {
  places: ordered.length,
  categories: CATEGORIES.length,
  askCategories: ASK_CATEGORIES.length,
  proofKinds: PROOF_KINDS.length,
  occupations: OCCUPATION_OPTIONS.length,
  facetSets: setIds.length,
  facets: facetRows.length,
  facetOptions: optionRows.length,
};

console.log(`Wrote ${file}`);
console.table(counts);
