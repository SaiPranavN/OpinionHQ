import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps deployment host-agnostic (see docs/OpinionHQ-Technical-Roadmap.md §4).
  output: "standalone",
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
