/**
 * The shapes a page holds before its data arrives.
 *
 * WHY THESE EXIST AT ALL. Every detail route is `force-dynamic` and reads
 * Postgres, so a click used to hold the old page on screen for as long as the
 * query took — nothing moved, and the site read as broken rather than busy.
 * A `loading.tsx` gives Next a Suspense boundary, which does two things: the
 * shell paints the instant the link is clicked, and the router can prefetch
 * that shell on hover instead of waiting for the whole page.
 *
 * They are deliberately dumb grey blocks in roughly the right places. A
 * skeleton that tries to look like the real content ends up promising numbers
 * it does not have, and the swap when the data lands is more jarring, not
 * less.
 */

export function Bar({ className = "" }: { className?: string }) {
  return <span className={`block rounded-[6px] bg-veil/8 ${className}`} />;
}

export function Panel({ className = "" }: { className?: string }) {
  return <div className={`ohq-panel ${className}`} />;
}

/** Wraps a skeleton so the whole thing breathes at one rate. */
export function SkeletonPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="mx-auto flex max-w-[1320px] animate-pulse flex-col gap-[clamp(26px,3.4vw,44px)] px-4 pb-[clamp(70px,9vw,120px)] sm:px-8 lg:px-14"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + 18px)" }}
    >
      {children}
    </div>
  );
}
