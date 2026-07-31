import Link from "next/link";

import { Brand } from "@/components/ui/Brand";
import { ParticleField } from "@/components/motion/ParticleField";
import { formatNumber } from "@/lib/derive";
import { TOTAL_TOPICS, TOTAL_VOTES } from "@/lib/topics";
import { TOTAL_POLLS } from "@/lib/polls";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-svh flex-col items-center justify-center px-5 pt-35 pb-22 text-center sm:px-10 lg:px-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] top-[-20%] bottom-auto z-0 h-[120%] animate-drift"
        style={{
          background:
            "radial-gradient(58% 46% at 50% 34%, rgba(29,185,84,0.16), transparent 70%), radial-gradient(40% 36% at 78% 62%, rgba(29,185,84,0.07), transparent 72%), radial-gradient(50% 40% at 14% 70%, rgba(120,130,255,0.05), transparent 74%)",
        }}
      />
      <ParticleField />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-auto bottom-0 z-1 h-[280px]"
        style={{
          background: "linear-gradient(180deg, rgba(10,10,10,0), #0A0A0A 78%)",
        }}
      />

      <div className="relative z-2 flex max-w-[1120px] flex-col items-center gap-[clamp(22px,3vw,34px)]">
        <div
          data-reveal
          className="ohq-reveal flex items-center gap-[10px] rounded-full border border-white/10 bg-white/2 py-[7px] pr-[14px] pl-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted"
        >
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-positive" />
          Opinion intelligence
        </div>

        <h1
          data-reveal
          className="ohq-reveal m-0 font-serif text-[clamp(2.9rem,7.4vw,6.6rem)] leading-[0.96] font-normal tracking-[-0.026em] text-balance text-cream-bright delay-[80ms] duration-[1150ms]"
        >
          What does everyone <em className="italic text-positive">really</em> think?
        </h1>

        <p
          data-reveal
          className="ohq-reveal m-0 max-w-[660px] text-[clamp(15px,1.35vw,19px)] leading-[1.55] font-light tracking-[-0.01em] text-pretty text-muted delay-[160ms] duration-[1100ms]"
        >
          Public opinion already exists — scattered across replies and group chats
          where nobody can read it. <Brand /> turns it into one measurement you can
          actually look at — and keeps the writing underneath it, so you get the
          reasons as well as the result.
        </p>

        {/* The two calls to action sit centred on their own row; the jump link
            goes underneath so it never pulls the pair off centre. */}
        <div
          data-reveal
          className="ohq-reveal mt-1.5 flex flex-wrap items-center justify-center gap-[18px] delay-[240ms] duration-[1100ms]"
        >
          <Link
            href="/topics"
            className="rounded-full bg-positive px-[34px] py-[16px] text-[16px] font-semibold tracking-[-0.01em] text-positive-ink transition-[background,box-shadow] duration-500 ease-ohq hover:bg-[#25CC61] hover:shadow-[0_12px_44px_-8px_rgba(29,185,84,0.55)]"
          >
            Explore topics
          </Link>
          <Link
            href="/polls"
            className="rounded-full border border-[#A78BFA]/45 bg-[#A78BFA]/10 px-[30px] py-[16px] text-[16px] font-semibold tracking-[-0.01em] text-[#C4B5FD] transition-[background,border-color] duration-500 ease-ohq hover:border-[#A78BFA]/70 hover:bg-[#A78BFA]/18"
          >
            Pick a side in a poll
          </Link>
        </div>

        <a
          data-reveal
          href="#how"
          className="ohq-reveal inline-flex items-center gap-2 text-[14.5px] text-muted transition-colors delay-[300ms] duration-[1100ms] hover:text-cream"
        >
          How it works
          <span aria-hidden className="font-mono">
            ↓
          </span>
        </a>

        <div
          data-reveal
          className="ohq-reveal mt-[clamp(30px,5vw,62px)] flex flex-wrap justify-center gap-[clamp(20px,4vw,52px)] font-mono text-[11.5px] tracking-[0.1em] uppercase text-dim delay-[340ms] duration-[1100ms]"
        >
          <span>{TOTAL_TOPICS} live topics</span>
          <span className="text-[#3A3A3A]">/</span>
          <span>{TOTAL_POLLS} open polls</span>
          <span className="text-[#3A3A3A]">/</span>
          <span>{formatNumber(TOTAL_VOTES)} votes cast</span>
        </div>
      </div>
    </section>
  );
}
