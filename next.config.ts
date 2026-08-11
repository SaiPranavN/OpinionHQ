import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone output keeps deployment host-agnostic (roadmap §4) — but only
   * where a host actually needs it.
   *
   * It bundles a server this repo can run anywhere, which is the whole point
   * for a container. Vercel does not use it: the platform compiles its own
   * output format, so on Vercel this is at best ignored and at worst a build
   * path almost nobody exercises. `next start` refuses it outright — "next
   * start does not work with output: standalone" — which is a fair warning that
   * it is not a mode to switch on by default and hope.
   *
   * Turned off on Vercel, where VERCEL=1 is set during the build. Self-hosting
   * keeps exactly what it had.
   *
   * WHAT THIS IS ACTUALLY FOR. The first production deploy threw React #418 —
   * "hydration failed … this tree will be regenerated on the client" — on every
   * page, and only on Vercel. The server HTML was byte-identical to a local
   * production build (50,398 bytes both), the client chunk hashes matched, and
   * the same build hydrated cleanly on localhost. Nothing was injected into the
   * page. This flag is the one remaining difference between how Vercel builds
   * this app and how it builds a stock Next one, so it is the first suspect
   * rather than a proven cause — if #418 survives the next deploy, this was not
   * it, and the note stays as one eliminated possibility.
   */
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  /**
   * Where the build lands. `.next` unless told otherwise.
   *
   * `npm run build` overrides it to `.next-build`, and the reason is a failure
   * that looks like a broken app rather than what it is. A production build and
   * a running dev server both write `.next`; the build replaces the dev server's
   * chunks while it is still serving them, and the next page load dies on
   * `ENOENT: .next/server/pages/_document.js`. Nothing in that message suggests
   * "you ran a build", so the reflex is to go looking in the code that was last
   * edited.
   *
   * Two directories means the two commands stop colliding. `npm start` reads the
   * same override, so serving a production build locally still works.
   *
   * THE HOST MUST NOT INHERIT THIS. Vercel runs `npm run build` by default,
   * which would set NEXT_DIST_DIR and leave the output in `.next-build` while
   * the platform went looking in `.next`. `vercel.json` pins the build command
   * to a plain `next build` for exactly that reason — the override is a local
   * convenience and has no business travelling to a deployment.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Pin the trace root to this repo; a lockfile further up the tree would
  // otherwise be inferred as the workspace root.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
};

export default nextConfig;
