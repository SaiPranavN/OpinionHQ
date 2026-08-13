import type { Metadata } from "next";

import { ProView } from "@/components/pro/ProView";
import { Footer } from "@/components/site/Footer";
import { absolute } from "@/lib/site";

/**
 * The Pro page.
 *
 * Indexable, and it should be: "what does OpinionHQ Pro cost" is a question
 * people type into a search engine before they will type it into a site. The
 * price and the deadline in the description are the two facts they are looking
 * for.
 */
export const metadata: Metadata = {
  title: "Pro — rich contributions, images, anonymity",
  description:
    "OpinionHQ Pro adds structured contributions, images and GIFs, posting without your name, and subject suggestions credited on the card. Free for everyone during the launch period, then ₹99 a month.",
  alternates: { canonical: absolute("/pro") },
};

/**
 * Rendered per request rather than cached. The page states whether *this*
 * visitor is a member and how long the offer has left, and a shared cached copy
 * would tell the second reader what was true for the first.
 */
export const dynamic = "force-dynamic";

export default function ProPage() {
  return (
    <>
      <ProView />
      <Footer />
    </>
  );
}
