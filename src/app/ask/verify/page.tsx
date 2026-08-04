import type { Metadata } from "next";

import { VerifyForm } from "@/components/ask/VerifyForm";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Verify your proof",
  robots: { index: false, follow: false, nocache: true },
};

export default function VerifyPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <VerifyForm />
      <Footer />
    </div>
  );
}
