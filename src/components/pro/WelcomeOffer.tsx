"use client";

/**
 * What a brand-new account sees the moment it lands on the catalog.
 *
 * THE MECHANISM IS UNCHANGED. This does not grant anything a person could not
 * already get from the Pro page or from any upgrade sheet — it calls the same
 * `start_pro()`, which applies the same conditions and ends on the same date.
 * What is different is that they are told about it at the one moment they are
 * guaranteed to be paying attention, instead of finding it later or never.
 *
 * FRAMED AS FOUNDING MEMBERSHIP, NOT AS FREE STUFF. "Free Pro for everybody"
 * describes a discount, and a discount available to everybody is worth nothing
 * to anybody. This is the thing you get for turning up before the site was
 * finished, which is both a better story and a truer one.
 *
 * SHOWN ONCE, and only where it makes sense: it needs `?welcome=1`, which only
 * a completed signup sets, and it does not render for an account that already
 * has Pro. The parameter is stripped as it opens, so a reload or a back button
 * does not bring it back — and because the flag lives in the URL rather than in
 * storage, there is nothing left behind to clear later.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Brand } from "@/components/ui/Brand";
import { FOUNDING, PRO_PLAN } from "@/lib/entitlements";
import { WELCOME_PARAM } from "@/lib/auth/redirect";
import { offerDeadline, offerRemaining, readProState, type ProState } from "@/lib/pro";

export function WelcomeOffer() {
  const router = useRouter();
  const { ready, signedIn, pro, subscribePro } = usePrototype();
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState<ProState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !signedIn) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get(WELCOME_PARAM) !== "1") return;

    // Cleared before anything else, so a refresh mid-read does not reopen it.
    // `replaceState` rather than a router navigation: this is tidying the
    // address bar, not a change of page, and a navigation would remount the
    // catalog underneath the modal.
    url.searchParams.delete(WELCOME_PARAM);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);

    readProState().then((state) => {
      setOffer(state);
      // Nothing to offer somebody who already has it, or after the window shuts.
      if (!state.pro && state.offerOpen && !state.revoked) setOpen(true);
    });
  }, [ready, signedIn]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || pro) return null;

  const deadline = offerDeadline(offer?.freeUntil ?? null);
  const remaining = offerRemaining(offer?.freeUntil ?? null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ohq-welcome-title"
      className="fixed inset-0 z-90 flex items-start justify-center overflow-y-auto bg-[rgba(5,5,5,0.76)] p-4 py-10 backdrop-blur-[8px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="my-auto flex w-full max-w-[520px] flex-col gap-5 rounded-[22px] border border-positive/22 bg-surface p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] sm:p-8">
        <header className="flex flex-col gap-2.5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-positive/35 bg-positive/10 px-3 py-[5px] font-mono text-[10px] tracking-[0.14em] uppercase text-positive-light">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-positive" />
            {FOUNDING.badge}
          </span>

          <h2
            id="ohq-welcome-title"
            className="m-0 font-display text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] font-bold tracking-[-0.02em] text-balance text-cream-bright"
          >
            {FOUNDING.headline}
          </h2>

          <p className="m-0 text-[13.5px] leading-[1.6] text-muted">{FOUNDING.blurb}</p>
        </header>

        {deadline ? (
          <div className="flex flex-wrap items-baseline gap-2 rounded-[14px] border border-positive/25 bg-positive/6 px-4 py-3.5">
            <span className="font-display text-[26px] leading-none font-semibold tracking-[-0.02em] text-cream-bright">
              Free
            </span>
            <span className="text-[13px] text-muted">
              until {deadline}, then ₹{offer?.priceInr ?? 99} a month
            </span>
            {remaining ? (
              <span className="ml-auto font-mono text-[11px] tracking-[0.06em] text-positive-light">
                {remaining}
              </span>
            ) : null}
          </div>
        ) : null}

        <section className="flex flex-col gap-2.5">
          <span className="ohq-eyebrow">What it gives you</span>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {PRO_PLAN.includes.slice(0, 4).map((line) => (
              <li key={line} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-soft">
                <span aria-hidden className="pt-px text-positive-light">
                  +
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await subscribePro();
              setBusy(false);
              setOpen(false);
            }}
            className="ohq-press cursor-pointer rounded-full bg-positive px-6 py-3 text-[14px] font-semibold text-positive-ink transition-[background] duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light disabled:opacity-40"
          >
            {busy ? "Turning it on…" : "Claim it"}
          </button>
          {/* Dismissable without penalty, and it says where to find it again.
              A modal you can only accept is a modal people learn to distrust. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer text-[13.5px] text-muted transition-colors hover:text-cream"
          >
            Maybe later
          </button>
          <span className="ml-auto text-[12px] text-dim">
            Also on the{" "}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/pro");
              }}
              className="cursor-pointer underline underline-offset-2 hover:text-muted"
            >
              Pro page
            </button>
          </span>
        </div>

        <p className="m-0 rounded-[12px] border border-veil/8 bg-veil/2 px-3.5 py-3 text-[11.5px] leading-[1.55] text-dim">
          No card, and nothing to cancel. Your membership is a record on the
          server that simply expires when the founding window does — nothing
          starts charging on its own, and <Brand /> will ask before it ever does.
        </p>
      </div>
    </div>
  );
}
