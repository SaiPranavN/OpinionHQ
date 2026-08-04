import Link from "next/link";

import { CategoriesSection } from "@/components/landing/CategoriesSection";
import { Hero } from "@/components/landing/Hero";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { IntegritySection } from "@/components/landing/IntegritySection";
import { MovementSection } from "@/components/landing/MovementSection";
import { PrivateGuidanceSection } from "@/components/landing/PrivateGuidanceSection";
import { StructureSection } from "@/components/landing/StructureSection";
import { TwoModesSection } from "@/components/landing/TwoModesSection";
import { VoicesSection } from "@/components/landing/VoicesSection";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Footer } from "@/components/site/Footer";
import { TOTAL_TOPICS } from "@/lib/topics";
import { TOTAL_POLLS } from "@/lib/polls";

export default function LandingPage() {
  return (
    <>
      <RevealOnScroll />
      <Hero />

      {/* What the product is, before how it works. The two public modes first,
          then the private one — the contrast is the explanation. */}
      <TwoModesSection />
      <PrivateGuidanceSection />
      <HowItWorksSection />

      {/* The written half, before the sections that are all about charts. */}
      <VoicesSection />

      {/* Then the three things that make the numbers worth reading. */}
      <StructureSection />
      <IntegritySection />
      <MovementSection />

      {/* Scope, then out. */}
      <CategoriesSection />

      <section
        id="catalog-preview"
        className="relative overflow-hidden border-t border-veil/5 px-5 pt-[clamp(90px,14vh,170px)] pb-[clamp(80px,10vh,130px)] text-center sm:px-10 lg:px-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-10%] top-auto -bottom-[60%] h-[120%]"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 100%, rgba(29,185,84,0.14), transparent 70%)",
          }}
        />
        <div
          data-reveal
          className="ohq-reveal relative mx-auto flex max-w-[840px] flex-col items-center gap-7"
        >
          <h2 className="m-0 font-serif text-[clamp(2.6rem,6vw,5.4rem)] leading-[0.98] font-normal tracking-[-0.028em] text-cream-bright">
            {TOTAL_TOPICS} topics and {TOTAL_POLLS} polls are{" "}
            <em className="italic">already moving.</em>
          </h2>
          <p className="m-0 max-w-[560px] text-[16px] leading-[1.6] font-light text-muted">
            Exams, colleges, policies, films, brands, politics and career paths. No
            account needed to look — only to vote.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/topics"
              className="rounded-full bg-positive px-[34px] py-[16px] text-[16px] font-semibold tracking-[-0.01em] text-positive-ink transition-[background,box-shadow] duration-500 ease-ohq hover:bg-[#25CC61] hover:shadow-[0_12px_44px_-8px_rgba(29,185,84,0.55)]"
            >
              Explore topics
            </Link>
            <Link
              href="/polls"
              className="rounded-full border border-poll/45 bg-poll/10 px-[30px] py-[16px] text-[16px] font-semibold tracking-[-0.01em] text-poll-soft transition-[background,border-color] duration-500 ease-ohq hover:border-poll/70 hover:bg-poll/18"
            >
              Vote in a poll
            </Link>
          </div>
          {/* Ask Verified has no count to advertise, and that is the point: a
              private-guidance service with a public question counter would be
              counting private questions in an aggregate. */}
          <Link
            href="/ask"
            className="inline-flex items-center gap-2 text-[14.5px] text-private-soft underline-offset-4 transition-colors duration-300 hover:text-cream hover:underline"
          >
            Need private guidance? Ask someone verified
            <span aria-hidden className="font-mono">
              →
            </span>
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
