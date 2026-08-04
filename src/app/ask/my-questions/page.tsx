import type { Metadata } from "next";

import { AskMyQuestions } from "@/components/ask/AskMyQuestions";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "My questions",
  robots: { index: false, follow: false, nocache: true },
};

export default function AskMyQuestionsPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <RevealOnScroll />
      <AskMyQuestions />
      <Footer />
    </div>
  );
}
