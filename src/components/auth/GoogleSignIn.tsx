"use client";

/**
 * "Continue with Google" — real now.
 *
 * WHAT THIS FILE USED TO BE is worth recording, because the replacement is the
 * whole point. It opened a chooser listing two invented accounts and signed you
 * in locally. It deliberately did not imitate Google's own screen: a convincing
 * replica of somebody else's account chooser is a phishing page whatever it was
 * built for, and the fact that one is harmless today does not survive a
 * screenshot. So the panel was OpinionHQ's own surface and said on its face that
 * no Google account was contacted.
 *
 * All of that is gone. The button now hands off to Google's real consent screen
 * and comes back at `/auth/callback`. Nothing about the *look* changed — the
 * mark and the shape were always the affordance people look for, and only what
 * sat behind them was a stand-in.
 *
 * ONE PRECONDITION, and it is not in this repository. The provider has to be
 * switched on in the Supabase dashboard with a Google Cloud client ID behind it.
 * Until it is, the call returns "provider is not enabled" and the caller shows
 * that — which is a better failure than a button that appears to work.
 */

export function GoogleButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-veil/16 bg-surface-raised px-5 py-3.5 text-[14px] font-medium text-cream transition-colors duration-300 outline-none hover:border-veil/34 hover:bg-veil/4 focus-visible:ring-2 focus-visible:ring-positive/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleMark />
      {label}
    </button>
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
