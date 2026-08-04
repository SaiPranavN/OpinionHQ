import type { Metadata } from "next";

import { AskInbox } from "@/components/ask/AskInbox";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Footer } from "@/components/site/Footer";

/**
 * Personal surface: what is routed to *this* visitor. Nothing here is the same
 * for two people, so there is nothing worth indexing.
 */
export const metadata: Metadata = {
  title: "Answer questions",
  robots: { index: false, follow: false, nocache: true },
};

export default function AskAnswerPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <RevealOnScroll />
      <AskInbox />
      <Footer />
    </div>
  );
}
