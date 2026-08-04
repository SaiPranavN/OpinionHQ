"use client";

/**
 * The bot check — a placeholder with a real gate behind it.
 *
 * IT VERIFIES NOTHING. There is no provider, no sitekey and no token: pressing
 * it waits a moment and reports success. What it does do is sit in the flow as
 * a real precondition — the button that sends a verification code stays
 * disabled until this passes — so the shape of the screen, the timing and the
 * failure states are all exercised, and dropping in a real widget later changes
 * this file and nothing else.
 *
 * DELIBERATELY NOT DRESSED AS SOMEBODY ELSE'S WIDGET. It carries OpinionHQ's
 * own styling and says on its face that it is a placeholder. A pixel-accurate
 * copy of a well-known challenge box would teach every reviewer that the check
 * is real, and that is exactly the wrong thing to be convincing about.
 *
 * For production the shortlist is Cloudflare Turnstile (free, no puzzles, good
 * privacy posture) or hCaptcha. Both are a script tag plus a server-side
 * verification call, and the server call is the part that matters: a captcha
 * validated only in the browser stops nobody, because a bot never runs the
 * browser code.
 */

import { useEffect, useRef, useState } from "react";

export type CaptchaState = "idle" | "checking" | "passed";

export function CaptchaBox({
  state,
  onChange,
}: {
  state: CaptchaState;
  onChange: (next: CaptchaState) => void;
}) {
  const [dots, setDots] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const running = timers.current;
    return () => running.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    if (state !== "checking") return;
    const tick = window.setInterval(() => setDots((d) => (d + 1) % 4), 320);
    return () => window.clearInterval(tick);
  }, [state]);

  const run = () => {
    if (state !== "idle") return;
    onChange("checking");
    // The pause is the point: a check that resolves instantly reads as fake,
    // and the button it gates needs a disabled state somebody actually sees.
    timers.current.push(window.setTimeout(() => onChange("passed"), 900));
  };

  const passed = state === "passed";

  return (
    <div
      className={`flex items-center gap-3.5 rounded-[14px] border p-3.5 transition-colors duration-300 ${
        passed ? "border-positive/35 bg-positive/6" : "border-veil/12 bg-veil/3"
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={passed}
        aria-label="Confirm you are not a robot"
        disabled={state === "checking"}
        onClick={run}
        className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-positive/50 ${
          passed
            ? "border-positive bg-positive"
            : state === "checking"
              ? "cursor-wait border-veil/20"
              : "cursor-pointer border-veil/25 hover:border-veil/50"
        }`}
      >
        {passed ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M2.5 7.5L5.5 10.5 11.5 3.5"
              stroke="var(--color-positive-ink)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : state === "checking" ? (
          <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-veil/25 border-t-positive" />
        ) : null}
      </button>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13.5px] leading-[1.35] text-cream">
          {passed
            ? "Verified — you are not a robot"
            : state === "checking"
              ? `Checking${".".repeat(dots)}`
              : "I am not a robot"}
        </span>
        <span className="text-[11px] leading-[1.4] text-dim">
          Placeholder — a real Turnstile or hCaptcha widget drops in here, checked
          again on the server.
        </span>
      </span>

      <span
        aria-hidden
        className="ml-auto hidden shrink-0 font-mono text-[9px] leading-[1.3] tracking-[0.1em] text-dim/70 uppercase sm:block"
      >
        Bot
        <br />
        check
      </span>
    </div>
  );
}
