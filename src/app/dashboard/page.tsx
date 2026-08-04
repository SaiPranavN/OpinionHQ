import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { Footer } from "@/components/site/Footer";

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

export default function DashboardPage() {
  return (
    <>
      <DashboardView />
      <Footer />
    </>
  );
}
