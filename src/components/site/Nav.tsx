"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useSession } from "@/components/auth/SessionProvider";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { ThemeToggle } from "@/components/site/ThemeToggle";

/**
 * The five destinations, in one list.
 *
 * Declared once and rendered twice — inline on a wide screen, stacked in the
 * sheet on a narrow one. When it was written out twice, the wide row quietly
 * hid two of them below `lg` and the narrow row scrolled sideways with no
 * affordance, so a phone was shown three links and a clipped word. A single
 * list is the only way "the menu has everything in it" stays true.
 */
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/topics", label: "Topics" },
  { href: "/polls", label: "Polls" },
  { href: "/#how", label: "How it works" },
  { href: "/#facts", label: "Why it’s different" },
] as const;

export function Nav() {
  const { signedIn, displayName, signOut } = usePrototype();
  const { isEditor } = useSession();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigating closes it. Without this, tapping a link on a phone leaves the
  // sheet covering the page you just asked for.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    // The fade is cut from the page colour rather than a literal near-black,
    // so the bar still dissolves into the page after a theme switch.
    <nav className="fixed inset-x-0 top-0 z-60 border-b border-veil/5 bg-linear-to-b from-ink/86 to-ink/28 backdrop-blur-[14px]">
      <div className="flex items-center justify-between gap-3 px-4 py-[18px] sm:gap-6 sm:px-8 lg:px-14">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-px text-[19px] font-semibold tracking-[-0.03em] text-cream"
        >
          Opinion<span className="text-positive">HQ</span>
        </Link>

        {/* Wide screens only. Below `sm` these live in the sheet instead of
            scrolling off the edge of a 390px viewport. */}
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-6 text-[14px] tracking-[-0.01em] sm:flex lg:gap-[28px]">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 whitespace-nowrap text-muted transition-colors hover:text-cream"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
                className="hidden cursor-pointer rounded-full border border-veil/16 px-4 py-[9px] text-[13.5px] font-medium whitespace-nowrap text-soft transition-[border-color,color] duration-300 ease-ohq hover:border-veil/40 hover:text-cream-bright sm:inline-block sm:px-5"
              >
                Sign out
              </button>
            </>
          ) : (
            // Arriving deliberately gets the page; the sheet is for hitting a
            // wall mid-task, where it keeps a held vote and returns you to it.
            //
            // This stays out of the menu at every width. Signing in is the one
            // thing a visitor should never have to open something to find.
            <Link
              href="/signin"
              className="shrink-0 rounded-full border border-veil/16 px-3.5 py-[9px] text-[13.5px] font-medium whitespace-nowrap text-soft transition-[border-color,color] duration-300 ease-ohq outline-none hover:border-veil/40 hover:text-cream-bright focus-visible:ring-2 focus-visible:ring-positive/60 sm:px-5"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="ohq-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-veil/16 text-soft transition-[border-color,color] duration-300 outline-none hover:border-veil/40 hover:text-cream-bright focus-visible:ring-2 focus-visible:ring-positive/60 sm:hidden"
          >
            <MenuGlyph open={open} />
          </button>
        </div>
      </div>

      {/* The sheet. Rendered under the bar rather than over the whole screen:
          it holds five links and at most three account rows, so a full-screen
          takeover would be a lot of ceremony for a short list — and leaving the
          page visible behind it keeps the place you were reading in view. */}
      {open ? (
        <div
          id="ohq-mobile-menu"
          className="max-h-[calc(100svh-var(--ohq-nav-h))] overflow-y-auto border-t border-veil/8 bg-surface-sunken/98 px-4 pt-2 pb-4 backdrop-blur-[14px] sm:hidden"
        >
          <ul className="m-0 flex list-none flex-col p-0">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-[10px] px-3 text-[15px] text-soft transition-colors duration-300 outline-none hover:bg-veil/6 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {signedIn ? (
            <div className="mt-2 flex flex-col gap-1 border-t border-veil/8 pt-2">
              {isEditor ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-[10px] px-3 text-[15px] text-positive-light transition-colors duration-300 outline-none hover:bg-positive/8 focus-visible:ring-2 focus-visible:ring-positive/60"
                >
                  Desk
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-[10px] px-3 text-[15px] text-soft transition-colors duration-300 outline-none hover:bg-veil/6 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
              >
                {displayName || "Your account"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex min-h-11 cursor-pointer items-center rounded-[10px] px-3 text-left text-[15px] text-muted transition-colors duration-300 outline-none hover:bg-veil/6 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}

/** Three bars that fold into a cross. No icon library, and no layout shift. */
function MenuGlyph({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M3.5 7h17" />
          <path d="M3.5 12h17" />
          <path d="M3.5 17h17" />
        </>
      )}
    </svg>
  );
}
