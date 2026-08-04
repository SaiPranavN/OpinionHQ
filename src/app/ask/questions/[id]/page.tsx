import type { Metadata } from "next";

import { QuestionView } from "@/components/ask/QuestionView";
import { Footer } from "@/components/site/Footer";

/**
 * Note what is missing: no `generateStaticParams`, and no `generateMetadata`
 * that reads the question. The topic and poll routes prerender every id and put
 * the subject in the page title — correct for public objects, and still wrong
 * here even though most questions are now public, because *this one route
 * serves both*. A prerendered private question is a private question sitting in
 * a build artefact, and a title built from one is its content leaking into a
 * browser tab, a bookmark and a share card. The title stays generic until the
 * server can decide per question.
 */
export const metadata: Metadata = {
  title: "Question",
  robots: { index: false, follow: false, nocache: true },
};

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <QuestionView id={id} />
      <Footer />
    </div>
  );
}
