import Link from "next/link";

import { Brand } from "@/components/ui/Brand";

/**
 * The site footer.
 *
 * NOTHING HERE POINTS AT A PAGE THAT DOES NOT EXIST. That sounds obvious and is
 * the usual failure of a footer: Terms, Privacy, About and Careers get linked
 * because footers have those, and every one is a 404 on a site this age. The
 * columns below list only routes that render. Legal pages are coming — they are
 * also a payment-gateway requirement — and they get linked when they are real.
 *
 * The methodology line survives from the old footer and is the most important
 * sentence on it: every figure on this site describes the people who took part,
 * not the public, and saying so under every page is the cheapest honesty
 * available.
 */

/**
 * Set this to the real profile and the icon appears.
 *
 * Left empty deliberately. A footer icon pointing at a handle nobody has
 * registered sends people to a stranger, and guessing `x.com/<brand>` is how
 * that happens.
 */
const X_URL = "";

const EXPLORE = [
  { href: "/topics", label: "Topics" },
  { href: "/polls", label: "Polls" },
];

const ABOUT = [
  { href: "/#how", label: "How it works" },
  { href: "/#facts", label: "Why it’s different" },
  { href: "/#modes", label: "The two modes" },
];

export function Footer() {
  return (
    <footer className="border-t border-veil/6 px-5 pt-[clamp(40px,6vw,64px)] pb-[clamp(28px,4vw,40px)] sm:px-8 lg:px-20">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-[clamp(32px,5vw,52px)]">
        <div className="flex flex-wrap justify-between gap-x-10 gap-y-9">
          <div className="flex min-w-[240px] max-w-[380px] flex-col gap-3">
            <span className="flex items-baseline gap-px text-[17px] font-semibold tracking-[-0.03em]">
              <Brand />
            </span>
            <p className="m-0 text-[13px] leading-[1.6] text-dim">
              Structured public opinion on the things being argued about. Measured
              from votes, one per account.
            </p>
            {X_URL ? (
              <a
                href={X_URL}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="OpinionHQ on X"
                className="mt-1 grid h-9 w-9 place-items-center rounded-full border border-veil/12 text-muted transition-[border-color,color] duration-300 hover:border-veil/34 hover:text-cream"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
                  <path d="M18.24 2.25h3.3l-7.2 8.23 8.47 11.27h-6.63l-5.2-6.8-5.94 6.8H1.73l7.7-8.8L1.3 2.25h6.8l4.7 6.21ZM17.08 19.77h1.83L7.01 4.13H5.05Z" />
                </svg>
              </a>
            ) : null}
          </div>

          <nav aria-label="Explore" className="flex min-w-[130px] flex-col gap-3">
            <span className="ohq-eyebrow">Explore</span>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {EXPLORE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13.5px] text-muted transition-colors duration-300 hover:text-cream"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="About" className="flex min-w-[130px] flex-col gap-3">
            <span className="ohq-eyebrow">About</span>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {ABOUT.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13.5px] text-muted transition-colors duration-300 hover:text-cream"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex min-w-[200px] flex-col gap-3">
            <span className="ohq-eyebrow">Support</span>
            <a
              href="mailto:support@theopinionhq.com"
              className="text-[13.5px] text-muted transition-colors duration-300 hover:text-cream"
            >
              support@theopinionhq.com
            </a>
            <p className="m-0 max-w-[240px] text-[12.5px] leading-[1.6] text-dim">
              Something wrong with a topic, a poll or your account — write to us and a
              person reads it.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-veil/6 pt-6 text-[12.5px] text-dim">
          <p className="m-0 max-w-[620px] leading-[1.55]">
            All figures describe participating <Brand /> users, not the general public.
            Verified updates are sourced; opinions belong to their authors.
          </p>
          <span className="font-mono text-[11px] tracking-[0.08em]">© 2026</span>
        </div>
      </div>
    </footer>
  );
}
