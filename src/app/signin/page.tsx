import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInView } from "@/components/auth/SignInView";
import { Footer } from "@/components/site/Footer";

/**
 * A sign-in page has nothing for a crawler and should never be a search
 * result — somebody looking for OpinionHQ wants the topics, not the door.
 */
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to OpinionHQ to vote, reply and follow topics.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <>
      {/* `useSearchParams` opts the subtree into client rendering, so the
          boundary is required for this route to prerender at all. */}
      <Suspense fallback={null}>
        <SignInView />
      </Suspense>
      <Footer />
    </>
  );
}
