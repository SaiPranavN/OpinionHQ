"use client";

/**
 * The Pro page: what it is, whether you have it, and how to start or stop.
 *
 * THE OFFER IS READ FROM THE DATABASE, not written into this file. `pro_offer`
 * holds the deadline and the price, an admin can move both, and a date typed
 * into a component would go stale the first time they did — on the most-read
 * line of the page.
 *
 * There is no card field anywhere here and there is not meant to be. The launch
 * period is genuinely free: `start_pro()` writes a subscription whose period
 * ends when the offer does, and `is_pro()` stops returning true the moment it
 * passes. Nothing has to run on a schedule for that to happen, and nobody is
 * charged for something they forgot to cancel.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import {
  AnonIcon,
  ExportIcon,
  FollowIcon,
  FreedomIcon,
  ImageIcon,
  PlanCards,
  RankIcon,
  ReadIcon,
  SectionsIcon,
  SuggestIcon,
  VoteIcon,
  type Plan,
} from "@/components/pro/PlanCards";
import { SuggestForm } from "@/components/pro/SuggestForm";
import { Brand } from "@/components/ui/Brand";
import { FOUNDING, PRO_PLAN } from "@/lib/entitlements";
import { offerDeadline, offerRemaining, readProState, type ProState } from "@/lib/pro";

export function ProView() {
  const { signedIn, ready, pro, subscribePro, cancelPro, openAuth } = usePrototype();
  const [offer, setOffer] = useState<ProState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    readProState().then((s) => {
      if (live) setOffer(s);
    });
    return () => {
      live = false;
    };
  }, [pro]);

  const deadline = offerDeadline(offer?.freeUntil ?? null);
  const remaining = offerRemaining(offer?.freeUntil ?? null);
  const open = offer?.offerOpen ?? false;
  const price = offer?.priceInr ?? 99;

  /**
   * The Pro card's action, in whichever of its five states applies.
   *
   * It lives in the card rather than in the status strip above, because that is
   * where somebody deciding is looking. The strip keeps the *answer* — whether
   * Pro is on — and has no button of its own any more: two identical green
   * buttons on one screen is a page asking the same question twice.
   */
  const proAction = !ready ? (
    <span className="grid h-11 place-items-center rounded-full border border-veil/12 text-[13.5px] text-dim">
      Checking your account…
    </span>
  ) : !signedIn ? (
    <button
      type="button"
      onClick={() => openAuth("signin")}
      className="ohq-press h-11 cursor-pointer rounded-full bg-positive text-[14px] font-semibold text-positive-ink duration-300 ease-ohq outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light"
    >
      {open ? "Sign in and claim it" : "Sign in"}
    </button>
  ) : offer?.revoked ? (
    <span className="grid h-11 place-items-center rounded-full border border-veil/12 px-4 text-center text-[12.5px] text-dim">
      Not available on this account
    </span>
  ) : pro ? (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await cancelPro();
        setBusy(false);
      }}
      className="h-11 cursor-pointer rounded-full border border-veil/16 text-[13.5px] font-medium text-soft transition-colors duration-300 hover:border-veil/40 hover:text-cream-bright disabled:opacity-40"
    >
      Turn Pro off
    </button>
  ) : (
    <button
      type="button"
      disabled={busy || !open}
      onClick={async () => {
        setBusy(true);
        await subscribePro();
        setBusy(false);
      }}
      className="ohq-press h-11 cursor-pointer rounded-full bg-positive text-[14px] font-semibold text-positive-ink duration-300 ease-ohq outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light disabled:cursor-not-allowed disabled:opacity-40"
    >
      {open ? "Claim founding Pro" : "Payment is not open yet"}
    </button>
  );

  /**
   * Icons for the feature lines, by position.
   *
   * Keyed by index rather than by the string, because the strings live in
   * `entitlements.ts` where the wording is edited and a lookup table keyed on
   * prose would break silently the first time a comma moved. Anything past the
   * end of a list falls back to a tick, so adding a line degrades to the plain
   * bullet this page had before rather than to a gap.
   */
  const PRO_ICONS = [
    SectionsIcon,
    ImageIcon,
    AnonIcon,
    SuggestIcon,
    RankIcon,
    FreedomIcon,
  ];
  const FREE_ICONS = [ReadIcon, VoteIcon, FollowIcon, ExportIcon];

  const plans: Plan[] = [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      unit: "always, no account needed to read",
      blurb:
        "Everything the site measures, and every way of taking part in it. This is not a trial.",
      features: PRO_PLAN.freeForever.map((text, i) => ({
        text,
        icon: FREE_ICONS[i] ?? ReadIcon,
      })),
      action: (
        <span className="grid h-11 place-items-center rounded-full border border-veil/12 text-[13.5px] font-medium text-dim">
          {pro ? "Included in Pro" : "Your current plan"}
        </span>
      ),
    },
    {
      id: "pro",
      name: PRO_PLAN.name,
      price: open ? "₹0" : `₹${price}`,
      unit: open
        ? `for founding members until ${deadline} — then ₹${price} a month`
        : "per month",
      blurb:
        "For the people writing the long answers: more room to make a case, and the choice of whether your name is on it.",
      features: PRO_PLAN.includes.map((text, i) => ({
        text,
        icon: PRO_ICONS[i] ?? FreedomIcon,
      })),
      featured: true,
      badge: open ? FOUNDING.badge : undefined,
      action: proAction,
    },
  ];

  return (
    <div
      className="mx-auto flex max-w-[980px] flex-col gap-[clamp(26px,3.4vw,44px)] px-4 pb-[clamp(70px,9vw,120px)] sm:px-8"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + clamp(18px, 3vw, 34px))" }}
    >
      <header className="flex flex-col gap-4">
        <span className="ohq-eyebrow">{PRO_PLAN.name}</span>
        <h1 className="m-0 max-w-[18ch] font-display text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.04] font-bold tracking-[-0.025em] text-balance text-cream-bright">
          Better tools for the people doing the arguing.
        </h1>

        {open ? (
          <>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-positive/35 bg-positive/10 px-3 py-[5px] font-mono text-[10px] tracking-[0.14em] uppercase text-positive-light">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-positive" />
              {FOUNDING.badge}
            </span>
            <p className="m-0 max-w-[62ch] text-[15.5px] leading-[1.55] font-light text-pretty text-soft">
              <strong className="font-medium text-positive-light">
                Free for founding members until {deadline}
              </strong>
              {remaining ? <span className="text-dim"> · {remaining}</span> : null} — then ₹
              {price} a month. No card is asked for now, and nothing starts charging
              on its own when the window closes.
            </p>
          </>
        ) : (
          <p className="m-0 max-w-[62ch] text-[15.5px] leading-[1.55] font-light text-pretty text-soft">
            The founding window has closed. Pro is ₹{price} a month.
          </p>
        )}
      </header>

      {/* State first, sales second. Somebody who already subscribed should not
          have to read a pitch to find out where they stand. */}
      {ready && signedIn ? (
        <section className="ohq-panel-raised flex flex-wrap items-center gap-x-8 gap-y-4 p-5 sm:p-6">
          <span className="flex flex-col gap-1">
            <span className="ohq-eyebrow">Your account</span>
            <span className="text-[20px] font-semibold tracking-[-0.02em] text-cream-bright">
              {pro ? "Pro is on" : "Free"}
            </span>
            <span className="max-w-[46ch] text-[12.5px] leading-[1.55] text-dim">
              {offer?.revoked
                ? "Pro is not available on this account. Write to support@theopinionhq.com."
                : pro
                  ? open
                    ? `Founding member — free until ${deadline}. Nothing renews by itself.`
                    : "Active."
                  : open
                    ? "Turn it on whenever you like. It costs nothing until the founding window closes."
                    : `₹${price} a month.`}
            </span>
          </span>

          {/* No button here. The one that matters is in the Pro card below,
              which is where somebody deciding is already looking. */}
          <span
            aria-hidden
            className={`ml-auto grid h-10 w-10 place-items-center rounded-full border text-[15px] ${
              pro
                ? "border-positive/35 bg-positive/10 text-positive-light"
                : "border-veil/12 text-dim"
            }`}
          >
            {pro ? "✓" : "—"}
          </span>
        </section>
      ) : ready ? (
        <section className="ohq-panel flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <p className="m-0 max-w-[52ch] text-[14px] leading-[1.6] text-soft">
            Sign in to turn Pro on. It is free for founding members and there is
            no card field anywhere in it.
          </p>
        </section>
      ) : null}

      <PlanCards plans={plans} />

      {pro ? (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <span className="ohq-eyebrow">Suggest a subject</span>
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-muted">
            An editor reads every suggestion. If it runs, your name goes on the
            card — that is the point of it.
          </p>
          <SuggestForm />
        </section>
      ) : null}

      <p className="m-0 rounded-[12px] border border-veil/8 bg-veil/2 px-4 py-3.5 text-[12px] leading-[1.6] text-dim">
        <strong className="font-medium text-muted">On anonymity.</strong> Posting
        anonymously hides your name, initials and occupation from other readers.
        It does not make the post untraceable: your account still holds it, so it
        still counts as your one vote and you can still edit it. <Brand /> can
        identify the author of any post, and would if compelled to.{" "}
        <Link href="/topics" className="text-muted underline underline-offset-2 hover:text-cream">
          Back to topics
        </Link>
      </p>
    </div>
  );
}
