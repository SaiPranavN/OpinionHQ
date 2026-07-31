import type { Metadata } from "next";

import { TopicComposer } from "@/components/create/TopicComposer";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Create a topic",
  description:
    "Publish a subject for public opinion and write the aspects participants will be asked about it.",
};

export default function CreateTopicPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <TopicComposer />
      <Footer />
    </div>
  );
}
