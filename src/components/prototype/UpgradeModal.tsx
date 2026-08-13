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

import { useEffect, useState } from "react";

import { Brand } from "@/components/ui/Brand";
import { FEATURE_COPY, PRO_PLAN, type ProFeature } from "@/lib/entitlements";
import { offerDeadline, offerRemaining, readProState, type ProState } from "@/lib/pro";

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

  /**
   * The deadline and the price, from `pro_offer`.
   *
   * Fetched when the sheet opens rather than at mount, because most sessions
   * never open it and this is the panel's only network call.
   */
  const [offer, setOffer] = useState<ProState | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    readProState().then((s) => {
      if (live) setOffer(s);
    });
    return () => {
      live = false;
    };
  }, [open]);

  const remaining = offerRemaining(offer?.freeUntil ?? null);

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
            className="m-0 font-display font-bold text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] tracking-[-0.02em] text-balance text-cream-bright"
          >
            {copy.title}
          </h2>
          <p className="m-0 text-[13.5px] leading-[1.6] text-muted">{copy.blurb}</p>
        </header>

        {/* The free window is the headline while it is open, and the price is
            the small print. Once it closes the two swap round on their own,
            because both come from `pro_offer` rather than from this file. */}
        <div className="flex flex-wrap items-baseline gap-2 rounded-[14px] border border-private/28 bg-private/6 px-4 py-3.5">
          {open && offer?.offerOpen ? (
            <>
              <span className="font-display font-semibold text-[28px] leading-none tracking-[-0.02em] text-cream-bright">
                Free
              </span>
              <span className="text-[13px] text-muted">
                until {offerDeadline(offer.freeUntil)}, then ₹{offer.priceInr} a month
              </span>
              {remaining ? (
                <span className="ml-auto font-mono text-[11px] tracking-[0.06em] text-positive-light">
                  {remaining}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="font-display font-semibold text-[28px] leading-none tracking-[-0.02em] text-cream-bright">
                ₹{offer?.priceInr ?? 99}
              </span>
              <span className="text-[13px] text-muted">per month</span>
              <span className="ml-auto text-[12px] text-dim">Cancel any time</span>
            </>
          )}
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
            {offer?.offerOpen === false ? "Start Pro" : "Start Pro — free"}
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
          <strong className="font-medium text-muted">No card, and nothing to cancel.</strong>{" "}
          The launch period is free for everyone, so there is no payment to take
          and no details to store. Your membership is a record on the server that
          simply expires when the offer does — nothing starts charging on its own,
          and <Brand /> will ask before it ever does.
        </p>
      </div>
    </div>
  );
}
