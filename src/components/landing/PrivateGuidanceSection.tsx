import Link from "next/link";

import { LockIcon, ShieldIcon } from "@/components/ask/primitives";
import { SectionPurpose } from "@/components/landing/SectionPurpose";
import { Brand } from "@/components/ui/Brand";

/**
 * The third mode on the landing page.
 *
 * Placed immediately after the two public modes and styled against them rather
 * than alongside them: cooler, quieter, no charts. Topics and Polls are about
 * measuring a crowd. This section has to land the moment where a crowd is the
 * wrong instrument entirely — nobody wants forty strangers voting on whether to
 * take a job offer.
 *
 * Every example below was written for this page. Real questions are never used
 * as illustrations, however anonymised.
 */
export function PrivateGuidanceSection() {
  return (
    <section
      id="ask"
      className="relative overflow-hidden border-t border-veil/5 px-5 py-[clamp(72px,11vw,140px)] sm:px-10 lg:px-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] top-[-30%] h-[130%]"
        style={{
          background:
            "radial-gradient(42% 34% at 26% 34%, rgba(143,168,196,0.11), transparent 72%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px]">
        <div data-reveal className="ohq-reveal mx-auto max-w-[760px] text-center">
          <span className="ohq-eyebrow">The third mode</span>
          <h2 className="mt-4 mb-5 font-display text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[1.02] font-bold tracking-[-0.025em] text-balance text-cream-bright">
            Some questions need an <em className="italic">expert,</em> not a crowd.
          </h2>
          <p className="m-0 text-[16px] leading-[1.6] font-light text-pretty text-muted">
            A crowd is the right instrument for &ldquo;was the exam run cleanly?&rdquo; and
            the wrong one for &ldquo;should I take this offer?&rdquo;. Ask Verified answers
            the second kind: people whose relevant credentials <Brand /> has checked
            score your options one by one. Most questions stay readable, because the
            next person facing the same decision needs the same answer — and the ones
            that should not be are private in a click.
          </p>
          <div className="mt-5">
            <SectionPurpose
              problem="Career and college advice comes from whoever answers loudest"
              solution="Answers only from people whose credentials were checked"
            />
          </div>
        </div>

        <div className="mt-[clamp(38px,6vw,68px)] grid grid-cols-1 gap-[clamp(16px,2vw,24px)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* The pitch. */}
          <article
            data-reveal
            className="ohq-reveal flex flex-col gap-6 rounded-[20px] border p-6 delay-[80ms] sm:p-9"
            style={{
              borderColor: "rgba(143,168,196,0.26)",
              background: "linear-gradient(180deg, rgba(143,168,196,0.08), rgba(20,20,20,0.4))",
            }}
          >
            <header className="flex flex-col gap-3">
              <span className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.14em] uppercase text-private-soft">
                <LockIcon size={13} />
                Ask Verified
              </span>
              <h3 className="m-0 font-display text-[clamp(1.7rem,2.6vw,2.4rem)] leading-[1.06] font-bold tracking-[-0.02em] text-cream-bright">
                Answers from people with{" "}
                <em className="italic">verified, relevant experience.</em>
              </h3>
              <p className="m-0 text-[14.5px] leading-[1.6] font-light text-muted">
                Careers, colleges and exams. You describe the decision and the options
                you are weighing; matched people score each option and tell you which
                one they would take, then discuss it with you one to one. No votes, no
                score, no pile-on.
              </p>
            </header>

            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13.5px] text-soft">
              {[
                "Labels that state exactly what was checked — not a generic tick",
                "Multiple independent assessments, side by side, never merged",
                "A private thread with each contributor, capped at five follow-ups",
                "Public by default so the answers outlive the question — private in a click",
                "Your name is never shown, whichever you choose",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span aria-hidden className="pt-px text-positive">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            <footer className="mt-auto flex flex-wrap items-center gap-4 border-t border-veil/8 pt-5">
              <Link
                href="/ask"
                className="inline-flex items-center gap-2 rounded-full bg-positive px-6 py-3 text-[14.5px] font-semibold text-positive-ink transition-[background,box-shadow] duration-500 ease-ohq hover:bg-[#25CC61] hover:shadow-[0_12px_36px_-10px_rgba(29,185,84,0.5)]"
              >
                <ShieldIcon size={14} />
                Ask someone verified
              </Link>
              <Link
                href="/ask/verify"
                className="text-[13px] text-muted underline-offset-4 transition-colors hover:text-cream hover:underline"
              >
                or apply to answer
              </Link>
            </footer>
          </article>

          {/* A response, in miniature. */}
          <article
            data-reveal
            className="ohq-reveal ohq-panel-raised flex flex-col gap-5 p-6 delay-[160ms] sm:p-8"
          >
            <span className="ohq-eyebrow">What a response looks like</span>
            <ResponseMini />
            <p className="m-0 border-t border-line pt-4 text-[12px] leading-[1.6] text-dim">
              Illustration written for this page — not a real question, a real
              contributor, or a real assessment.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

/** Miniature of one professional response: credentials, then a structured read. */
function ResponseMini() {
  const readings = [
    { label: "Overall assessment", value: "Good choice", position: 4, color: "#63C57E" },
    { label: "Profile fit", value: "Strong fit", position: 4, color: "#63C57E" },
    { label: "Risk level", value: "Moderate", position: 3, color: "#A1A1A1" },
  ];

  return (
    <figure
      aria-label="Illustration of a private professional response: overall assessment good choice, profile fit strong, risk moderate"
      className="m-0 flex flex-col gap-4 rounded-[16px] border border-veil/8 bg-surface-sunken p-5"
    >
      <figcaption className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[12px] font-semibold"
          style={{
            borderColor: "rgba(90,169,240,0.4)",
            background: "rgba(90,169,240,0.12)",
            color: "#5AA9F0",
          }}
        >
          AM
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13.5px] font-semibold text-cream">Aarav Mehta</span>
          <span className="text-[11.5px] text-dim">Senior Software Engineer</span>
        </span>
      </figcaption>

      <span className="flex flex-wrap gap-1.5">
        {[
          "Current employment verified",
          "5 years of experience verified",
          "GitHub profile matched",
        ].map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-[4px] text-[11px] font-medium"
            style={{
              borderColor: "rgba(29,185,84,0.3)",
              background: "rgba(29,185,84,0.07)",
              color: "#7BD99B",
            }}
          >
            <ShieldIcon size={10} />
            {label}
          </span>
        ))}
      </span>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        {readings.map((reading, i) => (
          <div key={reading.label} className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] text-muted">{reading.label}</span>
              <span
                className="text-[13px] font-semibold"
                style={{ color: reading.color }}
              >
                {reading.value}
              </span>
            </span>
            <span className="flex gap-[3px]">
              {Array.from({ length: 5 }, (_, j) => (
                <span
                  key={j}
                  className="h-[5px] flex-1 origin-left animate-grow-x rounded-full"
                  style={{
                    background:
                      j < reading.position ? reading.color : "color-mix(in oklab, var(--color-veil) 8%, transparent)",
                    animationDelay: `${220 + i * 110}ms`,
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>

      <p className="m-0 border-t border-line pt-4 text-[12.5px] leading-[1.6] text-soft">
        &ldquo;Worth taking, but expect the first six months to feel like a step back.
        The level in the letter is the thing I would not sign without.&rdquo;
      </p>

      <span className="flex items-center gap-2 text-[11.5px] text-private-soft">
        <LockIcon size={12} />
        Private thread open · 2 follow-ups used of 5
      </span>
    </figure>
  );
}
