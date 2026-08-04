import type { Metadata } from "next";
import { Suspense } from "react";

import { AskForm } from "@/components/ask/AskForm";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Ask a question",
  robots: { index: false, follow: false, nocache: true },
};

export default function NewQuestionPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      {/* `useSearchParams` reads the pre-selected area from the landing cards. */}
      <Suspense fallback={null}>
        <AskForm />
      </Suspense>
      <Footer />
    </div>
  );
}
