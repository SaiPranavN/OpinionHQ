/**
 * Bulk-imports seed subjects from CSV.
 *
 * Topics and polls are editorial content: an editor would otherwise type each
 * one into the composer, and fifteen categories of that is a week nobody has.
 * This writes exactly what the composer writes and nothing else.
 *
 * IT NEVER WRITES A VOTE, AN OPINION OR A COUNT. Every number on this platform
 * is counted from real people, and the aggregates are maintained by triggers
 * that no client can reach. Seeded subjects arrive with nothing in them, which
 * is correct — the empty states are already written for exactly that.
 *
 * DRAFTS BY DEFAULT. `published_at` stays null unless --publish is passed, so a
 * bad batch is invisible to everyone but an editor and costs nothing to delete.
 *
 * VALIDATE EVERYTHING, THEN WRITE. A hundred rows where row 87 has a typo'd
 * category must not leave 86 imported and no clear idea where it stopped, so
 * nothing is written until every row passes.
 *
 * A RE-RUN MUST NOT RESURRECT WHAT AN EDITOR DELETED. Skipping rows that are
 * already in the database is not enough: a subject that was imported, reviewed
 * and then deleted is *absent*, and absent looks identical to never-imported.
 * The first version of this script quietly recreated three polls that had been
 * thrown away between runs. `.imported.json` next to the CSVs records every
 * slug this file has written, so a slug in the manifest but missing from the
 * database is treated as a deliberate deletion and left alone unless
 * --recreate says otherwise.
 *
 *   node --env-file-if-exists=.env.local scripts/seed-subjects.mjs <dir> [--write] [--publish]
 *
 * Without --write it prints the plan and touches nothing.
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/** Category → facet-set, mirrored from src/lib/facets.ts. */
const DEFAULT_SET = {
  "entertainment": "film",
  "brands": "brand",
  "sports": "sports",
  "technology": "gadget",
  "events": "event",
  "national-politics": "national-politics",
  "policies": "policy",
  "politicians": "politician",
  "colleges": "college",
  "exams": "exam",
  "careers": "career",
  "food": "food",
  "places": "place",
  "other": "general",
  "controversies": "controversy",
};


/* ------------------------------------------------------------------- csv */

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function readSheet(path, label, problems) {
  if (!existsSync(path)) return [];
  const rows = parseCsv(readFileSync(path, "utf8"));
  const [head, ...rest] = rows;
  // Ragged rows are an error, not something to pad. `Object.fromEntries` fills
  // a short row with "" and drops a long row's tail, so a ragged file validates
  // clean and imports wrong.
  rest.forEach((r, i) => {
    if (r.length !== head.length)
      problems.push(`${label} row ${i + 1}: ${r.length} columns, header has ${head.length}`);
  });
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

/* ------------------------------------------------------------------ slug */

const MAX_SLUG = 80;

/**
 * Apostrophes are dropped rather than hyphenated, so "India's" reads `indias`
 * and not `india-s`; anything over the column's 80-character constraint is cut
 * back to a word boundary rather than mid-word.
 */
function slugify(input) {
  const base = input
    .replace(/['‘’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  if (base.length <= MAX_SLUG) return base;
  const cut = base.slice(0, MAX_SLUG);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 40 ? cut.slice(0, lastDash) : cut).replace(/-$/, "");
}

/* -------------------------------------------------------------- the run */

const dir = process.argv[2];
const WRITE = process.argv.includes("--write");
const PUBLISH = process.argv.includes("--publish");
const RECREATE = process.argv.includes("--recreate");
if (!dir) { console.error("usage: seed-subjects.mjs <dir> [--write] [--publish]"); process.exit(1); }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY."); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const problems = [];
const topics = readSheet(`${dir}/topics.csv`, "topic", problems);
const polls = readSheet(`${dir}/polls.csv`, "poll", problems);
const aspects = readSheet(`${dir}/aspects.csv`, "aspect", problems);

/* Reference data comes from the database, not a copy of it in this file. */
const [{ data: cats }, { data: places }, { data: sets }] = await Promise.all([
  db.from("categories").select("id"),
  db.from("places").select("id"),
  db.from("facet_sets").select("id"),
]);
const CATEGORIES = new Set((cats ?? []).map((c) => c.id));
const PLACES = new Set((places ?? []).map((p) => p.id));
const SETS = new Set((sets ?? []).map((s) => s.id));
const STATUSES = new Set(["Proposed","Upcoming","Ongoing","Live","Announced","Under Investigation",
  "Disputed","Confirmed","Resolved","Completed","Cancelled","Delayed","Inactive"]);

const seen = new Map();
function common(row, i, kind, titleField, min, max) {
  const w = `${kind} row ${i + 1}`;
  const title = row[titleField] ?? "";
  if (title.length < min || title.length > max)
    problems.push(`${w}: ${titleField} is ${title.length} chars, must be ${min}–${max}`);
  if (!CATEGORIES.has(row.category)) problems.push(`${w}: unknown category "${row.category}"`);
  if (!PLACES.has(row.place)) problems.push(`${w}: unknown place "${row.place}"`);
  if (!STATUSES.has(row.status)) problems.push(`${w}: unknown status "${row.status}"`);
  if (!row.summary) problems.push(`${w}: summary is empty`);
  if (row.tags?.includes(",")) problems.push(`${w}: tags use a comma; must be semicolons`);
  const blob = `${title} ${row.summary} ${row.about}`;
  const pct = blob.match(/\d+(\.\d+)?\s*(%|per\s?cent|percent)/i);
  if (pct) problems.push(`${w}: contains a percentage — "${pct[0]}"`);
  const slug = slugify(title);
  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(slug)) problems.push(`${w}: slug "${slug}" fails the shape rule`);
  if (seen.has(slug)) problems.push(`${w}: slug "${slug}" collides with ${seen.get(slug)}`);
  else seen.set(slug, w);
  return slug;
}

topics.forEach((r, i) => { r._slug = common(r, i, "topic", "name", 2, 160); });
polls.forEach((r, i) => {
  r._slug = common(r, i, "poll", "question", 4, 240);
  r._options = ["a","b","c","d"]
    .map((s) => ({ slot: s, name: r[`option_${s}`], blurb: r[`option_${s}_blurb`] ?? "" }))
    .filter((o) => o.name);
  const filled = ["a","b","c","d"].map((s) => Boolean(r[`option_${s}`]));
  const gap = filled.indexOf(false);
  if (gap !== -1 && filled.slice(gap).some(Boolean))
    problems.push(`poll row ${i + 1}: option slots have a gap; fill a,b,c,d in order`);
  if (r._options.length < 2 || r._options.length > 4)
    problems.push(`poll row ${i + 1}: ${r._options.length} options, must be 2–4`);
});

const byTopic = new Map();
const names = new Set(topics.map((t) => t.name));
aspects.forEach((a, i) => {
  const w = `aspect row ${i + 1}`;
  if (!names.has(a.topic)) problems.push(`${w}: "${a.topic}" matches no topic in topics.csv`);
  for (const f of ["aspect","prompt","positive","neutral","negative"])
    if (!a[f]) problems.push(`${w}: ${f} is empty`);
  const list = byTopic.get(a.topic) ?? [];
  if (list.some((x) => slugify(x.aspect) === slugify(a.aspect)))
    problems.push(`${w}: duplicate aspect "${a.aspect}" on this topic`);
  list.push(a); byTopic.set(a.topic, list);
});

/* Existing slugs, so a re-run reports rather than collides. */
const [{ data: haveT }, { data: haveP }] = await Promise.all([
  db.from("topics").select("slug"),
  db.from("polls").select("slug"),
]);
const existing = new Set([...(haveT ?? []), ...(haveP ?? [])].map((r) => r.slug));

const manifestPath = `${dir}/.imported.json`;
const manifest = new Set(
  existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : [],
);
/** Written once, then deleted by hand. Not ours to bring back. */
const deleted = [...manifest].filter((slug) => !existing.has(slug));

const skipT = topics.filter((t) => existing.has(t._slug));
const skipP = polls.filter((p) => existing.has(p._slug));

console.log(`topics ${topics.length}   polls ${polls.length}   aspect rows ${aspects.length}`);
console.log(`already present, will skip: ${skipT.length + skipP.length}`);
if (deleted.length) {
  console.log(`\npreviously imported and since deleted: ${deleted.length}`);
  deleted.forEach((s) => console.log(`  · ${s}`));
  console.log(RECREATE
    ? "  --recreate given: these WILL be created again."
    : "  Left alone. Pass --recreate to bring them back.");
}
if (problems.length) {
  console.log(`\nBLOCKING (${problems.length}) — nothing written:`);
  problems.forEach((p) => console.log("  ✗ " + p));
  process.exit(1);
}
console.log("validation: clean");

if (!WRITE) {
  console.log("\nDRY RUN. Re-run with --write to import.");
  const why = (slug) =>
    existing.has(slug) ? "  (already there)"
    : manifest.has(slug) && !RECREATE ? "  (deleted by hand — left alone)"
    : "";
  for (const t of topics) console.log(`  topic  /topics/${t._slug}${why(t._slug)}`);
  for (const p of polls) console.log(`  poll   /polls/${p._slug}${why(p._slug)}  ${p._options.length} options`);
  process.exit(0);
}

/* --------------------------------------------------------------- writing */

const tags = (s) => (s ? s.split(";").map((t) => t.trim()).filter(Boolean) : []);
const stamp = PUBLISH ? new Date().toISOString() : null;
let madeT = 0, madeP = 0, madeA = 0, madeLib = 0;

const skip = (slug) =>
  existing.has(slug) || (!RECREATE && manifest.has(slug));

for (const t of topics) {
  if (skip(t._slug)) continue;
  const { data, error } = await db.from("topics").insert({
    slug: t._slug, name: t.name, category_id: t.category, place_id: t.place,
    status: t.status, summary: t.summary, about: t.about ?? "", tags: tags(t.tags),
    published_at: stamp,
  }).select("id").single();
  if (error) { console.error(`  ✗ ${t._slug}: ${error.message}`); continue; }
  madeT += 1;

  const custom = byTopic.get(t.name);
  if (custom?.length) {
    for (const [i, a] of custom.entries()) {
      const { data: asp, error: ae } = await db.from("topic_aspects").insert({
        topic_id: data.id, key: slugify(a.aspect), label: a.aspect, prompt: a.prompt, position: i,
      }).select("id").single();
      if (ae) { console.error(`  ✗ aspect "${a.aspect}": ${ae.message}`); continue; }
      // Exactly one option per tone — the shape every facet in the library has
      // and the shape the topic page's charts assume.
      const { error: oe } = await db.from("topic_aspect_options").insert([
        { aspect_id: asp.id, key: "pos", label: a.positive, tone: "Positive", position: 0 },
        { aspect_id: asp.id, key: "neu", label: a.neutral, tone: "Neutral", position: 1 },
        { aspect_id: asp.id, key: "neg", label: a.negative, tone: "Negative", position: 2 },
      ]);
      if (oe) console.error(`  ✗ options for "${a.aspect}": ${oe.message}`);
      else madeA += 1;
    }
  } else {
    // No custom aspects: take the category's library set, the same call the
    // composer makes. Idempotent, so a re-run cannot double the questions.
    const set = t.facet_set || DEFAULT_SET[t.category];
    if (set && SETS.has(set)) {
      const { error: fe } = await db.rpc("apply_facet_set", { target_topic: data.id, set_id: set });
      if (fe) console.error(`  ✗ facet set ${set} for ${t._slug}: ${fe.message}`);
      else madeLib += 1;
    }
  }
}

for (const p of polls) {
  if (skip(p._slug)) continue;
  const { data, error } = await db.from("polls").insert({
    slug: p._slug, question: p.question, category_id: p.category, place_id: p.place,
    status: p.status, summary: p.summary, about: p.about ?? "", tags: tags(p.tags),
    closes_at: p.closes_at || null, published_at: stamp,
  }).select("id").single();
  if (error) { console.error(`  ✗ ${p._slug}: ${error.message}`); continue; }
  const { error: oe } = await db.from("poll_options").insert(
    p._options.map((o) => ({ poll_id: data.id, slot: o.slot, name: o.name, blurb: o.blurb })),
  );
  if (oe) console.error(`  ✗ options for ${p._slug}: ${oe.message}`);
  else madeP += 1;
}

for (const r of [...topics, ...polls]) manifest.add(r._slug);
writeFileSync(manifestPath, JSON.stringify([...manifest].sort(), null, 2) + "\n");

console.log(`\nwrote: ${madeT} topics, ${madeP} polls, ${madeA} custom aspects, ${madeLib} from the library`);
console.log(`manifest: ${manifest.size} slugs recorded in ${manifestPath}`);
console.log(stamp ? "PUBLISHED — live now." : "Imported as DRAFTS. Publish from the editorial desk, or re-run with --publish.");

