"use client";

import { useTheme } from "@/components/site/ThemeProvider";

/**
 * The theme switch in the nav.
 *
 * Shows the icon of the theme it will switch *to*, not the one you are in —
 * a control that pictures the current state reads as a status light and gets
 * clicked by accident. The label says which, so the icon is never the only
 * signal.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const goingTo = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${goingTo} theme`}
      title={`Switch to ${goingTo} theme`}
      className="grid h-[34px] w-[34px] shrink-0 cursor-pointer place-items-center rounded-full border border-veil/16 text-soft transition-[border-color,color,background] duration-300 ease-ohq outline-none hover:border-veil/40 hover:text-cream-bright focus-visible:ring-2 focus-visible:ring-positive/60"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden
      >
        {goingTo === "light" ? (
          /* Sun. */
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
          </>
        ) : (
          /* Crescent. */
          <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z" />
        )}
      </svg>
    </button>
  );
}
