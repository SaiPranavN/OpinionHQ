import { notFound } from "next/navigation";

import { DevSubjectMap } from "./DevSubjectMap";

/**
 * DEVELOPMENT ONLY. A subject map fed several hundred generated records, so
 * the layout, camera and level-of-detail system can be exercised at scale
 * without touching a single production row. The generator lives entirely
 * inside this route and is deterministic — the same 400 circles every run.
 *
 * `notFound()` in production: this page must not ship a catalogue of
 * fabricated subjects to anyone.
 */
export default function DevSubjectMapPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevSubjectMap />;
}
