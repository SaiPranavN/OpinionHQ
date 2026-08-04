import type { Metadata } from "next";

import { AskBrowse } from "@/components/ask/AskBrowse";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Footer } from "@/components/site/Footer";

/**
 * The browse screen is genuinely public now — questions default to public and
 * are readable signed out — so this page finally has something to show a
 * first-time visitor instead of an empty dashboard.
 *
 * It stays out of search regardless. Every question here is prototype fixture
 * data living in one browser's localStorage, so there is nothing real to index,
 * and a crawler following a link into `/ask/questions/[id]` would hit a route
 * that also serves private questions. When this is server-backed, the browse
 * page and public question pages become the two things worth indexing — and
 * the visibility flag is what that decision would key off.
 */
export const metadata: Metadata = {
  title: "Ask Verified — answers from people who proved it",
  description:
    "Career, college and exam questions answered one to one by people whose proof OpinionHQ has checked. Public by default; private when it needs to be.",
  robots: { index: false, follow: false, nocache: true },
};

export default function AskPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <RevealOnScroll />
      <AskBrowse />
      <Footer />
    </div>
  );
}
