"use client";

/**
 * The bot check. Cloudflare Turnstile.
 *
 * THIS FILE IS NOT THE ENFORCEMENT AND MUST NOT BE MISTAKEN FOR IT. All it does
 * is obtain a token from Cloudflare and hand it upward. The token is then
 * attached to the Supabase auth call, and SUPABASE VERIFIES IT SERVER-SIDE
 * against the secret key held in the project config. That server check is the
 * gate. A captcha validated only in the browser stops nobody, because a bot
 * never runs the browser code — it posts to the auth endpoint directly.
 *
 * Which is also why a missing sitekey is not a reason to let somebody through.
 * If the widget cannot run, no token is produced; if the project has captcha
 * enabled, Supabase refuses the request and says so. The two halves fail
 * together, which is the correct direction to fail in.
 *
 * Turnstile over hCaptcha: free at any volume, no image puzzles for the person
 * signing up, and it does not need a cookie banner. Supabase supports both.
 */

import Script from "next/script";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type CaptchaState = "idle" | "checking" | "passed";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** The slice of the Turnstile API this file uses. */
interface Turnstile {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export function CaptchaBox({
  state,
  onChange,
  onToken,
}: {
  state: CaptchaState;
  onChange: (next: CaptchaState) => void;
  /** The token to attach to the auth call. Null once it expires. */
  onToken: (token: string | null) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallbackId = useId();

  const mount = useCallback(() => {
    if (!SITE_KEY || !holder.current || !window.turnstile || widgetId.current) return;
    onChange("checking");
    widgetId.current = window.turnstile.render(holder.current, {
      sitekey: SITE_KEY,
      theme: "auto",
      callback: (token) => {
        onToken(token);
        onChange("passed");
      },
      // A token is good for a few minutes. Somebody who leaves the form open
      // longer than that must not be allowed to submit a stale one — Supabase
      // would reject it, and the failure would look like a bug in the form.
      "expired-callback": () => {
        onToken(null);
        onChange("idle");
      },
      "error-callback": () => {
        onToken(null);
        onChange("idle");
        setFailed(true);
      },
    });
  }, [onChange, onToken]);

  useEffect(() => {
    if (window.turnstile) {
      setReady(true);
      mount();
    }
    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [mount]);

  // Nothing to render a widget with. Said plainly rather than passing silently:
  // a sign-up form that looks unprotected and is unprotected is better than one
  // that looks protected and is not.
  if (!SITE_KEY) {
    return (
      <div
        id={fallbackId}
        role="status"
        className="flex flex-col gap-1.5 rounded-[12px] border border-caution/30 bg-caution/8 px-4 py-3"
      >
        <span className="text-[12.5px] font-medium text-cream">
          Bot protection is not configured
        </span>
        <span className="text-[11.5px] leading-[1.5] text-dim">
          NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set. If this project has captcha
          enabled, the server will refuse this sign-up.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          setReady(true);
          mount();
        }}
      />
      <div ref={holder} className="min-h-[65px]" />
      {!ready ? (
        <span className="text-[11.5px] text-dim">Loading the bot check…</span>
      ) : null}
      {failed ? (
        <span role="alert" className="text-[11.5px] text-negative-light">
          That check did not complete. Reload the page and try again.
        </span>
      ) : null}
      {state === "passed" ? (
        <span className="text-[11.5px] text-positive-light">Verified.</span>
      ) : null}
    </div>
  );
}
