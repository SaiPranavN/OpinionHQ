"use client";

import Link from "next/link";

import { useSession } from "@/components/auth/SessionProvider";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { ThemeToggle } from "@/components/site/ThemeToggle";

export function Nav() {
  const { signedIn, displayName, signOut } = usePrototype();
  const { isEditor } = useSession();

  return (
    // The fade is cut from the page colour rather than a literal near-black,
    // so the bar still dissolves into the page after a theme switch.
    <nav className="fixed inset-x-0 top-0 z-60 flex items-center justify-between gap-3 border-b border-veil/5 bg-linear-to-b from-ink/86 to-ink/28 px-4 py-[18px] backdrop-blur-[14px] sm:gap-6 sm:px-8 lg:px-14">
      <Link
        href="/"
        className="flex shrink-0 items-baseline gap-px text-[19px] font-semibold tracking-[-0.03em] text-cream"
      >
        Opinion<span className="text-positive">HQ</span>
      </Link>

      {/*
        The three product modes plus the two things a first-time visitor
        actually asks: what is this, and why should I believe the numbers.

        Ask Verified carries the same weight as Topics and Polls — same colour,
        same size, no badge. It is a third mode, not a promotion, and styling it
        as a highlight would make a private-guidance service look like an upsell.

        A fourth link no longer fits a 375px viewport, so the row scrolls rather
        than shrinking: dropping "Ask Verified" to a smaller size on mobile would
        undo the equal weight, and letting it push Sign in off the edge — which
        it did — makes signing in impossible on a phone.
      */}
      <div className="ohq-scroll-x flex min-w-0 flex-1 items-center gap-[15px] overflow-x-auto text-[14px] tracking-[-0.01em] sm:justify-center sm:gap-6 lg:gap-[28px]">
        <Link
          href="/"
          className="shrink-0 text-muted transition-colors hover:text-cream"
        >
          Home
        </Link>
        <Link
          href="/topics"
          className="shrink-0 text-muted transition-colors hover:text-cream"
        >
          Topics
        </Link>
        <Link
          href="/polls"
          className="shrink-0 text-muted transition-colors hover:text-cream"
        >
          Polls
        </Link>
        <Link
          href="/ask"
          className="shrink-0 whitespace-nowrap text-muted transition-colors hover:text-cream"
        >
          Ask Verified
        </Link>
        <Link
          href="/#how"
          className="hidden shrink-0 whitespace-nowrap text-muted transition-colors hover:text-cream sm:inline"
        >
          How it works
        </Link>
        <Link
          href="/#facts"
          className="hidden shrink-0 whitespace-nowrap text-muted transition-colors hover:text-cream lg:inline"
        >
          Why it&rsquo;s different
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <ThemeToggle />
        {signedIn ? (
          <>
            {/* Only for the people it belongs to. Not a security boundary —
                the route guards itself and every table refuses a member — but
                a link most visitors would only ever bounce off is clutter. */}
            {isEditor ? (
              <Link
                href="/admin"
                className="hidden shrink-0 rounded-full border border-positive/34 px-3.5 py-[7px] text-[12.5px] font-medium whitespace-nowrap text-positive-light transition-colors duration-300 outline-none hover:border-positive/60 focus-visible:ring-2 focus-visible:ring-positive/60 sm:inline-block"
              >
                Desk
              </Link>
            ) : null}
            {/* The name is the way in to your own account. It was a label;
                a signed-in person looking for what they wrote has to be able
                to press something, and their own name is the thing they
                reach for. */}
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1.5 text-[13px] text-muted transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
            >
              <span
                aria-hidden
                className="grid h-[26px] w-[26px] place-items-center rounded-full bg-avatar text-[10.5px] font-semibold text-soft"
              >
                {(displayName || "You").slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{displayName || "Signed in"}</span>
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="cursor-pointer rounded-full border border-veil/16 px-4 py-[9px] text-[13.5px] font-medium whitespace-nowrap text-soft transition-[border-color,color] duration-300 ease-ohq hover:border-veil/40 hover:text-cream-bright sm:px-5"
            >
              Sign out
            </button>
          </>
        ) : (
          // Arriving deliberately gets the page; the sheet is for hitting a
          // wall mid-task, where it keeps a held vote and returns you to it.
          <Link
            href="/signin"
            className="shrink-0 rounded-full border border-veil/16 px-4 py-[9px] text-[13.5px] font-medium whitespace-nowrap text-soft transition-[border-color,color] duration-300 ease-ohq outline-none hover:border-veil/40 hover:text-cream-bright focus-visible:ring-2 focus-visible:ring-positive/60 sm:px-5"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
