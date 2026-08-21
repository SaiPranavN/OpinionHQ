import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/site/Footer";
import { Brand } from "@/components/ui/Brand";
import { absolute } from "@/lib/site";

/**
 * The contribute page.
 *
 * ── What this page is careful not to do ─────────────────────────────────────
 *
 * It does not sell anything. There is no tier, no perk, no name-in-lights, and
 * no figure — not a target, not a running total, not a suggested amount. Every
 * one of those turns a voluntary contribution into a transaction, and a
 * transaction is a thing the reader can be disappointed by. It also keeps the
 * page honest under the same rule the rest of the site runs on: no number
 * appears anywhere on OpinionHQ that was not counted from something real, and
 * "₹4,300 raised of ₹20,000" would be neither.
 *
 * It also does not gate anything. Saying so out loud, on the page, is the
 * difference between an ask and a soft wall.
 */
export const metadata: Metadata = {
  title: "Contribute",
  description:
    "OpinionHQ is free to read and free to take part in. If it has been useful to you, you can chip in over UPI — entirely optional, and nothing on the site is behind it.",
  alternates: { canonical: absolute("/contribute") },
};

export default function ContributePage() {
  return (
    <>
      <div
        className="relative mx-auto flex max-w-[1000px] flex-col gap-[clamp(28px,4vw,52px)] px-4 pb-[clamp(70px,9vw,120px)] sm:px-8"
        style={{ paddingTop: "calc(var(--ohq-nav-h) + clamp(22px, 4vw, 46px))" }}
      >
        {/* The one warm bloom on the site, behind the one warm page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-20%] top-0 -z-1 h-[520px]"
          style={{
            background:
              "radial-gradient(48% 46% at 50% 0%, color-mix(in oklab, var(--color-warm) 13%, transparent), transparent 72%)",
          }}
        />

        <header className="flex flex-col items-center gap-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-warm/35 bg-warm/10 px-3.5 py-[6px] font-mono text-[10px] tracking-[0.14em] uppercase text-warm-soft">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warm" />
            Entirely optional
          </span>

          <h1 className="m-0 max-w-[16ch] font-display text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.04] font-bold tracking-[-0.028em] text-balance text-cream-bright">
            If it has been useful, chip in.
          </h1>

          <p className="m-0 max-w-[54ch] text-[clamp(15px,1.3vw,17px)] leading-[1.6] font-light text-pretty text-muted">
            <Brand /> is free to read and free to take part in. It stays that way
            whether or not you do this. If the site has been worth something to
            you, this is the way to say so.
          </p>
        </header>

        {/* ------------------------------------------------------------ the QR */}
        <section className="flex flex-col items-center gap-6">
          <div className="ohq-panel-raised relative flex w-full max-w-[420px] flex-col items-center gap-5 p-6 sm:p-8">
            <span className="ohq-eyebrow text-warm-soft">Scan to contribute</span>

            {/*
              A white mat under the code, and it is not decoration.

              The QR is white-on-black, which is the inverse of what the format
              specifies. Most phone cameras cope; not all do, and the quiet zone
              a scanner looks for has to contrast with the modules. The card
              gives it a real border of light around a dark field, which is the
              arrangement scanners are built to find.
            */}
            <div className="rounded-[18px] bg-white p-3 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)]">
              <Image
                src="/contribute-upi-qr.jpg"
                alt="UPI QR code for contributing to OpinionHQ. Scan it with any UPI app."
                width={841}
                height={844}
                priority
                className="h-auto w-[min(248px,60vw)] rounded-[10px]"
              />
            </div>

            <p className="m-0 text-center text-[13.5px] leading-[1.6] text-soft">
              Open any UPI app — PhonePe, Google Pay, Paytm, your bank&rsquo;s —
              and point it at this. Any amount, once, whenever.
            </p>

            <p className="m-0 border-t border-line pt-4 text-center text-[11.5px] leading-[1.6] text-dim">
              Contributions are a gift, not a purchase. They buy no feature, no
              badge and no say in what runs on the site.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------- the honest */}
        <section className="grid grid-cols-1 gap-[clamp(12px,1.6vw,18px)] sm:grid-cols-3">
          <Fact title="Nothing is behind it">
            Every topic, poll and result is readable without an account, and voting
            only needs a free one. This page is not a wall you have found.
          </Fact>
          <Fact title="No tiers, no targets">
            There is no amount that unlocks anything and no total being counted
            towards. You will not be shown a progress bar built out of your money.
          </Fact>
          <Fact title="You will not hear from it">
            No receipt, no follow-up, no list. UPI tells the person on the other
            end that something arrived, and that is the whole of it.
          </Fact>
        </section>

        {/* ------------------------------------------------------- other ways */}
        <section className="ohq-panel flex flex-col gap-4 p-5 sm:p-7">
          <span className="ohq-eyebrow">Or, for nothing at all</span>
          <p className="m-0 max-w-[60ch] text-[14.5px] leading-[1.6] text-soft">
            Money is the least interesting way to help a site whose entire point
            is what people think. Casting a vote, writing one honest paragraph, or
            sending a subject worth arguing about is worth more to it than this
            page is.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/topics"
              className="ohq-press rounded-full bg-positive px-5 py-2.5 text-[14px] font-semibold text-positive-ink duration-500 ease-ohq hover:bg-[#25CC61]"
            >
              Give an opinion
            </Link>
            <Link
              href="/polls"
              className="ohq-press rounded-full border border-poll/45 bg-poll/10 px-5 py-2.5 text-[14px] font-semibold text-poll-soft duration-500 ease-ohq hover:bg-poll/18"
            >
              Pick a side
            </Link>
            <a
              href="mailto:support@theopinionhq.com"
              className="ohq-press rounded-full border border-veil/16 px-5 py-2.5 text-[14px] font-medium text-soft duration-500 ease-ohq hover:border-veil/40 hover:text-cream-bright"
            >
              Tell us what is broken
            </a>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

function Fact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ohq-panel flex flex-col gap-2 p-5">
      <h2 className="font-display m-0 text-[15px] leading-[1.3] font-semibold tracking-[-0.015em] text-cream-bright">
        {title}
      </h2>
      <p className="m-0 text-[13px] leading-[1.6] text-dim">{children}</p>
    </div>
  );
}
