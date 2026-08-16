/**
 * Stands in for the `server-only` package under Vitest.
 *
 * `server-only` is a module that throws the moment it is loaded outside a
 * server component. That is exactly what it is for, and it is why importing
 * `lib/polls/rows.ts` from a test file fails before a single assertion runs —
 * the test runner is neither a server component nor a client one, and the
 * package has no way to tell the difference.
 *
 * Aliased in vitest.config.ts, and NOWHERE ELSE. The guard that actually
 * protects the bundle is the Next compiler's, which never sees this file: a
 * client component importing a server-only module still fails the build. All
 * this buys is the ability to unit-test pure functions that happen to live in a
 * server-only file, which is the case worth having.
 */

export {};
