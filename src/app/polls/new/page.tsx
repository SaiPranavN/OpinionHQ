import type { Metadata } from "next";

import { PollComposer } from "@/components/create/PollComposer";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Create a poll",
  description:
    "Publish a forced-choice poll: one question, two to four options, no middle ground.",
};

export default function CreatePollPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <PollComposer />
      <Footer />
    </div>
  );
}
