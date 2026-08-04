"use client";

/**
 * "Continue with Google" — simulated.
 *
 * There is no OAuth client, no redirect and no token. Pressing it opens a
 * chooser built out of this app's own components, listing two invented
 * accounts, and picking one signs you in locally.
 *
 * IT DELIBERATELY DOES NOT LOOK LIKE GOOGLE'S OWN SCREEN. A convincing replica
 * of somebody else's account chooser is a phishing page whatever it was built
 * for, and the fact that this one is harmless today would not survive a
 * screenshot. So the panel is OpinionHQ's own surface, in OpinionHQ's own
 * typography, and it says on its face that no Google account is contacted. The
 * button keeps the standard mark because that is the affordance people look
 * for; everything behind it is labelled for what it is.
 *
 * The real integration replaces `pick` with an OAuth redirect and nothing else
 * on this page changes.
 */

import { useEffect, useState } from "react";

export interface GoogleAccount {
  email: string;
  name: string;
  initials: string;
}

/** Invented, and named so nobody could mistake them for real addresses. */
const ACCOUNTS: GoogleAccount[] = [
  { email: "pranav.sai@gmail.com", name: "Pranav Sai", initials: "PS" },
  { email: "demo.reviewer@gmail.com", name: "Demo Reviewer", initials: "DR" },
];

export function GoogleButton({
  label,
  onPick,
}: {
  label: string;
  onPick: (account: GoogleAccount) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-veil/16 bg-surface-raised px-5 py-3.5 text-[14px] font-medium text-cream transition-colors duration-300 outline-none hover:border-veil/34 hover:bg-veil/4 focus-visible:ring-2 focus-visible:ring-positive/50"
      >
        <GoogleMark />
        {label}
      </button>

      {open ? (
        <>
          {/* Click-away. A dropdown that only closes on Escape traps a mouse
              user, and this one covers the form underneath it. */}
          <button
            type="button"
            aria-label="Close account chooser"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="dialog"
            aria-label="Choose a simulated Google account"
            className="ohq-suggestions absolute top-[calc(100%+8px)] right-0 left-0 z-50 flex flex-col gap-1 rounded-[18px] border border-veil/14 bg-surface-raised p-2 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.9)]"
          >
            <p className="m-0 px-2.5 pt-1.5 pb-1 text-[11.5px] leading-[1.5] text-dim">
              <strong className="font-medium text-muted">Simulated.</strong> No Google
              account is contacted and nothing leaves this browser — these two are made
              up, for walking the flow.
            </p>
            {ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(account);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-[13px] px-2.5 py-2.5 text-left transition-colors duration-200 outline-none hover:bg-veil/6 focus-visible:bg-veil/6"
              >
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-avatar font-mono text-[11px] text-soft"
                >
                  {account.initials}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13.5px] text-cream">{account.name}</span>
                  <span className="truncate text-[11.5px] text-dim">{account.email}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** The standard mark, so the button is recognisable as what it stands for. */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.4Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-2.9.7-4.3v-5.7H4.5A21.9 21.9 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.6Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.8 4.5 13.9l7.3 5.7c1.7-5.1 6.5-8.9 12.2-8.9Z"
      />
    </svg>
  );
}
