"use client";

/**
 * "Suggest a topic" / "Suggest a poll", on the catalog where it belongs.
 *
 * It used to live only on the Pro page, which is the wrong place for it: the
 * moment somebody wants a subject that is not here is the moment they are
 * looking at the list and failing to find it. A form two navigations away is a
 * form nobody reaches from the feeling that prompts it.
 *
 * SHOWN TO EVERYONE, not only to members. A button you cannot see is a feature
 * you never choose, and pressing it without Pro opens the upgrade sheet naming
 * this specific feature — a better first encounter with the price than
 * discovering it after writing a paragraph. Signed out, it opens sign-in.
 *
 * The refusal that matters is not here anyway: `topic_requests` and
 * `poll_requests` both check `is_pro()` in their insert policy, so a request
 * shaped by hand is refused whatever this button did.
 */

import { useEffect, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { SuggestForm } from "@/components/pro/SuggestForm";

export function SuggestButton({ kind }: { kind: "topic" | "poll" }) {
  const { signedIn, ready, pro, openUpgrade, openAuth } = usePrototype();
  const [open, setOpen] = useState(false);

  // Escape closes, and the page behind stops scrolling while it is open.
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

  // Nothing until the session is known. Rendering "Suggest" and then swapping
  // it for a Pro badge a beat later is a flicker on the first thing in the row.
  if (!ready) return null;

  const label = kind === "topic" ? "Suggest a topic" : "Suggest a poll";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!signedIn) {
            openAuth("signin");
            return;
          }
          if (!pro) {
            openUpgrade("suggest");
            return;
          }
          setOpen(true);
        }}
        className={
          kind === "topic"
            ? "ohq-press cursor-pointer rounded-full border border-positive/40 bg-positive/12 px-4 py-[7px] text-[13px] font-medium whitespace-nowrap text-positive-light transition-colors duration-300 outline-none hover:bg-positive/18 focus-visible:ring-2 focus-visible:ring-positive/60"
            : "ohq-press cursor-pointer rounded-full border border-poll/45 bg-poll/12 px-4 py-[7px] text-[13px] font-medium whitespace-nowrap text-poll-soft transition-colors duration-300 outline-none hover:bg-poll/18 focus-visible:ring-2 focus-visible:ring-poll/60"
        }
      >
        + {label}
        {!pro ? (
          <span className="ml-2 font-mono text-[10px] tracking-[0.08em] text-dim">Pro</span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-90 flex items-start justify-center overflow-y-auto bg-[rgba(5,5,5,0.74)] p-4 py-10 backdrop-blur-[8px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="my-auto flex w-full max-w-[620px] flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 font-display text-[clamp(1.4rem,3vw,1.9rem)] leading-[1.1] font-bold tracking-[-0.02em] text-cream-bright">
                {label}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ml-auto cursor-pointer rounded-full border border-veil/14 px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:border-veil/34 hover:text-cream"
              >
                Close
              </button>
            </div>

            <p className="m-0 text-[13px] leading-[1.6] text-dim">
              An editor reads every suggestion. If it runs, your name sits on the
              card as the person who asked for it — that is the point of it.
            </p>

            <SuggestForm only={kind} onDone={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
