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
 * THE WIDGET IS RENDERED EXACTLY ONCE.
 *
 * This is the whole difficulty of the component and the first version got it
 * wrong. Turnstile renders into a DOM node it owns and runs its own challenge;
 * tearing that node down and re-rendering restarts the challenge from scratch.
 * The first version had the mount effect depend on the callback props, and the
 * parent passes `onChange` as an inline arrow — a new function identity on
 * every render. Every keystroke in the sign-in form therefore re-rendered the
 * parent, changed the identity, ran the cleanup, removed the widget and made a
 * new one. It looked like a captcha stuck in a loop, because it was: a fresh
 * challenge per character typed.
 *
 * So the callbacks live in refs that are kept current, and the mount effect
 * takes no dependencies at all. The widget's own callbacks read `.current`, so
 * they always call the latest handler without the effect ever needing to know
 * that the handler changed.
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

  // Kept current every render, read by the widget callbacks below. This is what
  // lets the mount effect have no dependencies — see the note at the top.
  const onChangeRef = useRef(onChange);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onChangeRef.current = onChange;
    onTokenRef.current = onToken;
  });

  /**
   * Renders the widget, once.
   *
   * `widgetId.current` is the guard rather than a piece of state: it survives
   * re-renders, and both the script's `onLoad` and the mount effect call this
   * without either needing to know whether the other got there first.
   */
  const mount = useCallback(() => {
    if (!SITE_KEY || !holder.current || !window.turnstile || widgetId.current) return;
    setReady(true);
    onChangeRef.current("checking");
    widgetId.current = window.turnstile.render(holder.current, {
      sitekey: SITE_KEY,
      theme: "auto",
      callback: (token) => {
        onTokenRef.current(token);
        onChangeRef.current("passed");
      },
      // A token is good for a few minutes. Somebody who leaves the form open
      // longer than that must not be allowed to submit a stale one — Supabase
      // would reject it, and the failure would look like a bug in the form.
      "expired-callback": () => {
        onTokenRef.current(null);
        onChangeRef.current("idle");
      },
      "error-callback": () => {
        onTokenRef.current(null);
        onChangeRef.current("idle");
        setFailed(true);
      },
    });
  }, []);

  // No dependencies, deliberately. This runs on mount and cleans up on unmount,
  // and nothing a parent re-render does can restart the challenge.
  useEffect(() => {
    mount();
    const id = widgetId.current;
    return () => {
      if (id && window.turnstile) window.turnstile.remove(id);
      widgetId.current = null;
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
        // `mount` is stable, so this cannot re-render the widget either.
        onLoad={mount}
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
