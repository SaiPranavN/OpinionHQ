import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * The nearest ancestor a back control should target.
 *
 * The last crumb carrying an `href`, ignoring the current page. Derived from
 * the trail rather than from the URL because a page already had to declare
 * where it sits — `/ask/questions/q-offer` has no `/ask/questions` to strip
 * back to, and every route shaped like that would need a special case.
 *
 * Exported and pure so the rule can be tested without rendering anything.
 */
export function parentCrumb(trail: Crumb[]): Crumb | null {
  for (let i = trail.length - 2; i >= 0; i--) {
    const crumb = trail[i];
    if (crumb?.href) return crumb;
  }
  return null;
}

/**
 * Breadcrumb, led by an explicit back button.
 *
 * The trail alone was navigable but not obviously *actionable* — 10px uppercase
 * links read as a location, not a control. The button restates the parent at a
 * size and weight that says "press me", and it lands in the same place on every
 * screen, so going back never means hunting for the way.
 *
 * It is a `Link` to a known parent, deliberately not `router.back()`. History
 * is not the page hierarchy: somebody who arrived from a shared link would be
 * thrown off the site entirely, and somebody who got here through three filter
 * changes would be sent back to the page they are already on.
 */
export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  const parent = parentCrumb(trail);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {parent ? (
        <Link
          href={parent.href!}
          className="ohq-press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-veil/12 py-[5px] pr-3.5 pl-2.5 text-[12.5px] text-soft transition-[border-color,color,background] duration-300 ease-ohq outline-none hover:border-veil/28 hover:bg-veil/4 hover:text-cream-bright focus-visible:ring-2 focus-visible:ring-positive/60"
        >
          <span aria-hidden className="text-[13px] leading-none">
            ←
          </span>
          {/* The destination is named, not implied. "Back" on its own makes a
              visitor press it to find out where it goes. */}
          Back to {parent.label}
        </Link>
      ) : null}

      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 font-mono text-[10.5px] tracking-[0.12em] uppercase text-dim">
          {trail.map((crumb, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={crumb.label} className="flex items-center gap-1.5">
                {i > 0 ? (
                  <span aria-hidden className="text-veil/20">
                    /
                  </span>
                ) : null}
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="text-dim transition-colors duration-300 hover:text-cream"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className="text-soft">
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
