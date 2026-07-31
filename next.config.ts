import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps deployment host-agnostic (see docs/OpinionHQ-Technical-Roadmap.md §4).
  output: "standalone",
  reactStrictMode: true,
  // Pin the trace root to this repo; a lockfile further up the tree would
  // otherwise be inferred as the workspace root.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
};

export default nextConfig;
