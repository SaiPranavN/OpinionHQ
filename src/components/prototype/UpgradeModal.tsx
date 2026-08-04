"use client";

/**
 * The subscribe sheet.
 *
 * Opened when somebody reaches for a Pro feature, never on arrival and never on
 * a timer. A paywall that interrupts you before you have seen what it is for is
 * an advertisement; one that appears at the moment you wanted the thing is a
 * price. It always names which feature it is standing in front of.
 *
 * It also lists what stays free, in the same size type as what Pro adds. A
 * subscribe sheet that only tells you what you are missing is selling the fear
 * rather than the product — and this one has nothing to hide, because the free
 * tier really does cover reading, voting, replying and answering.
 *
 * NO PAYMENT IS TAKEN. There is no card field here and no payment processor
 * behind it. Pressing subscribe flips a flag in this browser, and the sheet
 * says so where you cannot miss it.
 */

import { useEffect } from "react";

import { Brand } from "@/components/ui/Brand";
import { FEATURE_COPY, PRO_PLAN, type ProFeature } from "@/lib/entitlements";

export function UpgradeModal({
  feature,
  onSubscribe,
  onCancel,
}: {
  feature: ProFeature | null;
  onSubscribe: () => void;
  onCancel: () => void;
}) {
  const open = feature !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onCancel]);

  if (!feature) return null;

  const copy = FEATURE_COPY[feature];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ohq-upgrade-title"
      className="fixed inset-0 z-90 flex items-start justify-center overflow-y-auto bg-[rgba(5,5,5,0.74)] p-4 py-10 backdrop-blur-[8px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="my-auto flex w-full max-w-[520px] flex-col gap-5 rounded-[22px] border border-veil/10 bg-surface p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] sm:p-8">
        <header className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-private-soft">
            {PRO_PLAN.name}
          </span>
          <h2
            id="ohq-upgrade-title"
            className="m-0 font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] tracking-[-0.02em] text-balance text-cream-bright"
          >
            {copy.title}
          </h2>
          <p className="m-0 text-[13.5px] leading-[1.6] text-muted">{copy.blurb}</p>
        </header>

        <div className="flex flex-wrap items-baseline gap-2 rounded-[14px] border border-private/28 bg-private/6 px-4 py-3.5">
          <span className="font-serif text-[28px] leading-none text-cream-bright">
            {PRO_PLAN.price}
          </span>
          <span className="text-[13px] text-muted">{PRO_PLAN.period}</span>
          <span className="ml-auto text-[12px] text-dim">Cancel any time</span>
        </div>

        <section className="flex flex-col gap-2.5">
          <span className="ohq-eyebrow">What Pro adds</span>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {PRO_PLAN.includes.map((line) => (
              <li key={line} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-soft">
                <span aria-hidden className="pt-px text-private-soft">
                  +
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* Same type size as the list above. A sheet that shrinks this is
            selling the fear rather than the product. */}
        <section className="flex flex-col gap-2.5 border-t border-line pt-4">
          <span className="ohq-eyebrow">Free, and staying free</span>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {PRO_PLAN.freeForever.map((line) => (
              <li key={line} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-soft">
                <span aria-hidden className="pt-px text-positive-light">
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={onSubscribe}
            className="cursor-pointer rounded-full bg-positive px-6 py-3 text-[14px] font-semibold text-positive-ink transition-[background,box-shadow] duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light"
          >
            Start Pro
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer text-[13.5px] text-muted transition-colors hover:text-cream"
          >
            Not now
          </button>
        </div>

        <p className="m-0 rounded-[12px] border border-veil/8 bg-veil/2 px-3.5 py-3 text-[11.5px] leading-[1.55] text-dim">
          <strong className="font-medium text-muted">Prototype.</strong> No payment is
          taken and no card details are asked for or stored. Pressing Start Pro flips a
          flag in this browser so the Pro flows can be walked. In production this is a
          checkout and a subscription record on the server — <Brand /> never sees a card
          number either way.
        </p>
      </div>
    </div>
  );
}
