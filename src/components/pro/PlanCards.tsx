"use client";

/**
 * The two plans, side by side.
 *
 * Replaces two stacked bulleted lists — "What Pro adds" and "Free, and staying
 * free" — which stated the same facts and made them impossible to weigh against
 * each other. A comparison is the question a pricing page is actually being
 * asked, and two lists a screen apart is the one shape that refuses to answer
 * it.
 *
 * ── The free card is not a decoy ────────────────────────────────────────────
 *
 * It is drawn at the same size, with the same type, in the same panel. The
 * standard trick on a page like this is a free tier rendered small and grey so
 * the paid one looks inevitable, and it is beneath a site whose whole claim is
 * that it does not put a thumb on the scale. The Pro card is tinted and carries
 * the badge because it is the one with a decision in it, not because the free
 * one is meant to look sad.
 *
 * ── And there is no price theatre ───────────────────────────────────────────
 *
 * No struck-through "was", no fake discount, no countdown ticking down to a
 * deadline an admin can move. The founding window is free and it is stated as
 * free; the price after it is stated as the price. Both come from `pro_offer`
 * in the database — see ProView.
 */

import { type ReactNode } from "react";

export interface Plan {
  id: "free" | "pro";
  name: string;
  /** "₹0" or "₹99". Rendered at display size. */
  price: string;
  /** The small print beside the figure. */
  unit: string;
  blurb: string;
  features: { text: string; icon: ReactNode }[];
  /** Rendered in the card's action slot. Owned by the caller — see ProView. */
  action: ReactNode;
  /** Tints the card and shows the badge. */
  featured?: boolean;
  /** Sits top-right of a featured card. */
  badge?: string;
}

export function PlanCards({ plans }: { plans: Plan[] }) {
  return (
    <div className="grid grid-cols-1 gap-[clamp(14px,2vw,20px)] lg:grid-cols-2">
      {plans.map((plan) => (
        <article
          key={plan.id}
          className={`relative flex flex-col gap-5 rounded-[20px] border p-6 sm:p-7 ${
            plan.featured
              ? "border-positive/32 bg-linear-to-b from-positive/8 to-positive/2"
              : "border-veil/10 bg-surface-raised"
          }`}
        >
          {plan.featured && plan.badge ? (
            <span className="absolute top-6 right-6 rounded-full border border-positive/35 bg-positive/12 px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] whitespace-nowrap uppercase text-positive-light sm:top-7 sm:right-7">
              {plan.badge}
            </span>
          ) : null}

          <header className="flex flex-col gap-3">
            <h2 className="font-display m-0 text-[clamp(1.5rem,2.4vw,1.95rem)] leading-[1.1] font-bold tracking-[-0.02em] text-cream-bright">
              {plan.name}
            </h2>

            {/* The figure at display size and the unit beside it, not under it.
                A price that needs a second line to be understood is a price
                somebody has to do arithmetic on. */}
            <p className="m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="font-display text-[clamp(2.2rem,4vw,3rem)] leading-[1] font-bold tracking-[-0.03em] text-cream-bright">
                {plan.price}
              </span>
              <span className="text-[12.5px] leading-[1.4] text-dim">{plan.unit}</span>
            </p>

            <p className="m-0 max-w-[40ch] text-[14px] leading-[1.6] font-light text-muted">
              {plan.blurb}
            </p>
          </header>

          {/* The action sits above the list, as it does on the reference: the
              decision is the point of the card and the features are the case
              for it, not a preamble to reach past. */}
          <div className="flex flex-col">{plan.action}</div>

          <ul className="m-0 flex list-none flex-col gap-3 border-t border-line p-0 pt-5">
            {plan.features.map((feature) => (
              <li
                key={feature.text}
                className="flex gap-3 text-[13.5px] leading-[1.55] text-soft"
              >
                <span
                  aria-hidden
                  className={`mt-px shrink-0 ${
                    plan.featured ? "text-positive-light" : "text-private-soft"
                  }`}
                >
                  {feature.icon}
                </span>
                <span className="min-w-0">{feature.text}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- icons */

/**
 * House style throughout: 24-unit box, 1.7 stroke, round caps, no fill.
 *
 * Written here rather than pulled from a library because there are nine of
 * them, they are used in one place, and a dependency for nine paths is a
 * dependency to keep updated forever.
 */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Structured sections — a block with ruled parts. */
export const SectionsIcon = (
  <Glyph>
    <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="2.6" />
    <path d="M3.2 9.4h17.6M9.6 9.4v10.4" />
  </Glyph>
);

/** An image. */
export const ImageIcon = (
  <Glyph>
    <rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.6" />
    <circle cx="8.6" cy="9.6" r="1.5" />
    <path d="m4.4 17.2 4.6-4.4 3.3 3.1 2.9-2.5 4.4 3.8" />
  </Glyph>
);

/** Anonymity — an eye with a line through it. */
export const AnonIcon = (
  <Glyph>
    <path d="M3 12s3.4-5.6 9-5.6c1.4 0 2.7.35 3.8.9M21 12s-3.4 5.6-9 5.6c-1.5 0-2.8-.4-4-1" />
    <path d="M4 4l16 16" />
  </Glyph>
);

/** Suggesting a subject. */
export const SuggestIcon = (
  <Glyph>
    <path d="M9.4 18.2h5.2M10.2 21h3.6" />
    <path d="M12 3.2a5.9 5.9 0 0 0-3.5 10.6c.6.45.95 1.1.95 1.8h5.1c0-.7.35-1.35.95-1.8A5.9 5.9 0 0 0 12 3.2Z" />
  </Glyph>
);

/** Ranking above. */
export const RankIcon = (
  <Glyph>
    <path d="M12 19.5V5.2M6.3 10.9 12 5.2l5.7 5.7" />
  </Glyph>
);

/** Cancel freely — an open door rather than a lock. */
export const FreedomIcon = (
  <Glyph>
    <path d="M14.2 3.6H6.4a1.8 1.8 0 0 0-1.8 1.8v13.2a1.8 1.8 0 0 0 1.8 1.8h7.8" />
    <path d="M18.6 12H10m0 0 3.2-3.2M10 12l3.2 3.2" />
  </Glyph>
);

/** Reading. */
export const ReadIcon = (
  <Glyph>
    <path d="M3 12s3.4-5.6 9-5.6 9 5.6 9 5.6-3.4 5.6-9 5.6S3 12 3 12Z" />
    <circle cx="12" cy="12" r="2.3" />
  </Glyph>
);

/** Voting — the product's own bars. */
export const VoteIcon = (
  <Glyph>
    <path d="M6 20v-5.5M12 20V4.5M18 20v-9" />
  </Glyph>
);

/** Following. */
export const FollowIcon = (
  <Glyph>
    <path d="M6.4 4.2h11.2a1 1 0 0 1 1 1v15L12 16.4 5.4 20.2v-15a1 1 0 0 1 1-1Z" />
  </Glyph>
);

/** Exporting. */
export const ExportIcon = (
  <Glyph>
    <path d="M12 3.6v10.8M8 10.6l4 3.8 4-3.8" />
    <path d="M4.4 16.4v2.2a1.8 1.8 0 0 0 1.8 1.8h11.6a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
  </Glyph>
);
