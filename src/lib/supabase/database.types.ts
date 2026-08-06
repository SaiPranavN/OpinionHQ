/**
 * PLACEHOLDER — replaced by `npm run db:types` once the project is linked.
 *
 * That command reads the live schema and writes the real definitions over this
 * file, which is what makes a renamed column a compile error instead of a row of
 * `undefined` on a dashboard. Until then `Database` is permissive, so the app
 * builds on a checkout that has never talked to Supabase — and every query is
 * unchecked, which is exactly why this is a placeholder and not the design.
 *
 * The generated file is committed. It is derived, but so is a lockfile: a
 * teammate should get the same types from a clean clone without needing
 * database credentials first.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
