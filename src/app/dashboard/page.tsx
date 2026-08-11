import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { Footer } from "@/components/site/Footer";
import { listTopics } from "@/lib/topics/queries";

/**
 * Somebody's own activity. Everything on it is read from this browser, so there
 * is nothing here for a crawler to find — but `noindex` is set anyway, because
 * a page whose whole content is one person's record should never be a search
 * result under any circumstances.
 */
export const metadata: Metadata = {
  title: "Your activity",
  description: "Opinions you shared, polls you took a side in, and your Ask Verified activity.",
  robots: { index: false, follow: false },
};

/** Somebody's own record. Never cached, and never a build artifact. */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Passed down so the client can resolve the slugs its votes are keyed by
  // without a request per row.
  const topics = await listTopics();

  return (
    <>
      <DashboardView topics={topics} />
      <Footer />
    </>
  );
}
