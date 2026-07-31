"use client";

import Link from "next/link";

import { usePrototype } from "@/components/prototype/PrototypeProvider";

export function Nav() {
  const { signedIn, displayName, signOut, openAuth } = usePrototype();

  return (
    <nav className="fixed inset-x-0 top-0 z-60 flex items-center justify-between gap-6 border-b border-white/5 bg-linear-to-b from-[rgba(10,10,10,0.86)] to-[rgba(10,10,10,0.28)] px-5 py-[18px] backdrop-blur-[14px] sm:px-8 lg:px-14">
      <Link
        href="/"
        className="flex items-baseline gap-px text-[19px] font-semibold tracking-[-0.03em] text-cream"
      >
        Opinion<span className="text-positive">HQ</span>
      </Link>

      {/*
        The two product modes plus the two things a first-time visitor actually
        asks: what is this, and why should I believe the numbers. "Explore" and
        "Categories" used to point at the same page as the hero's own button.
      */}
      <div className="flex items-center gap-[14px] text-[14px] tracking-[-0.01em] sm:gap-6 lg:gap-[28px]">
        <Link href="/" className="text-muted transition-colors hover:text-cream">
          Home
        </Link>
        <Link href="/topics" className="text-muted transition-colors hover:text-cream">
          Topics
        </Link>
        <Link href="/polls" className="text-muted transition-colors hover:text-cream">
          Polls
        </Link>
        <Link
          href="/#how"
          className="hidden text-muted transition-colors hover:text-cream sm:inline"
        >
          How it works
        </Link>
        <Link
          href="/#facts"
          className="hidden text-muted transition-colors hover:text-cream lg:inline"
        >
          Why it&rsquo;s different
        </Link>
      </div>

      {signedIn ? (
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline">
            {displayName || "Signed in"}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer rounded-full border border-white/16 px-5 py-[9px] text-[13.5px] font-medium text-soft transition-[border-color,color] duration-300 ease-ohq hover:border-white/40 hover:text-white"
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openAuth("signin", "/topics")}
          className="cursor-pointer rounded-full border border-white/16 px-5 py-[9px] text-[13.5px] font-medium text-soft transition-[border-color,color] duration-300 ease-ohq outline-none hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-positive/60"
        >
          Sign in
        </button>
      )}
    </nav>
  );
}
