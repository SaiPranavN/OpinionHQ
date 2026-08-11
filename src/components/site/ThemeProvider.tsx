"use client";

/**
 * Light/dark theming.
 *
 * The theme lives in one place — a `data-theme` attribute on `<html>` — and
 * every colour in the product is a CSS custom property that reads off it (see
 * globals.css). Nothing here re-styles a component; flipping the attribute is
 * the whole mechanism, which is why there is not a single `dark:` variant in
 * the markup.
 *
 * Dark is the default and the design's home. Light is opt-in and remembered.
 * The system preference is deliberately *not* consulted: a visitor on a
 * light-set laptop would otherwise land on the theme the product was not
 * designed in, having never asked for it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "opinionhq.theme";

/**
 * Runs before first paint, from a blocking script in <head>.
 *
 * Applying the stored theme in an effect instead would paint the default first
 * and then correct it — a white flash on every navigation for anyone who chose
 * light, which is exactly the audience that would notice.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`;

interface ThemeValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing — the choice still applies for this session.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts dark to match what the server rendered. The boot script has already
  // set the real value on <html>; the effect below reads it back rather than
  // guessing, so the two never disagree.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    setThemeState(attr === "light" ? "light" : "dark");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    apply(next);
  }, []);

  // Reads `theme` rather than using a functional update: `apply` writes to the
  // DOM and to localStorage, and a state updater has to be pure — React invokes
  // it twice under StrictMode to prove it, which would apply the flip twice.
  const toggle = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  const value = useMemo<ThemeValue>(
    () => ({ theme, setTheme, toggle }),
    [theme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
