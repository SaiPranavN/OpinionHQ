/**
 * Where this site lives, for anything that has to write an absolute URL.
 *
 * Canonical tags, Open Graph images, `robots.txt` and the sitemap all need a
 * full origin — a relative path is meaningless in an `og:image` or a
 * `<loc>`. Nothing else in the app does: every link a visitor follows is
 * relative, and auth callbacks are built from `window.location.origin`.
 *
 * HARDCODED ON PURPOSE, with the environment allowed to override. The obvious
 * alternative is to read NEXT_PUBLIC_SITE_URL and be done — but that variable
 * is not set on the host, and the failure mode is silent and bad: canonical
 * tags pointing at `http://localhost:3000` tell Google the real page is on a
 * machine it cannot reach, and it will drop the page rather than guess. A
 * default that is correct in production beats a variable that is correct only
 * where somebody remembered to set it.
 *
 * The override exists for preview deployments and for the day the domain
 * changes, so this file is not the thing standing in the way.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://theopinionhq.com"
).replace(/\/$/, "");

/** An absolute URL for `path`, which should start with a slash. */
export function absolute(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
