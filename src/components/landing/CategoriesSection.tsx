import Link from "next/link";

import { SectionPurpose } from "@/components/landing/SectionPurpose";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CATEGORIES } from "@/lib/taxonomy";

/**
 * What can actually be measured here. The taxonomy is the scope of the product,
 * so showing every type with live counts answers "is my thing on here?" faster
 * than any amount of prose.
 */
export function CategoriesSection({
  topicCounts,
  pollCounts,
}: {
  topicCounts: Map<string, number>;
  pollCounts: Map<string, number>;
}) {
  const topics = topicCounts;
  const polls = pollCounts;

  return (
    <section
      id="categories"
      className="relative border-t border-veil/5 px-5 py-[clamp(72px,11vw,140px)] sm:px-10 lg:px-20"
    >
      <div className="mx-auto max-w-[1200px]">
        <div data-reveal className="ohq-reveal mx-auto max-w-[720px] text-center">
          <span className="ohq-eyebrow">What we measure</span>
          <h2 className="mt-4 mb-5 font-display text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[1.02] font-bold tracking-[-0.025em] text-balance text-cream-bright">
            Thirteen kinds of <em>argument.</em>
          </h2>
          <p className="m-0 text-[16px] leading-[1.6] font-light text-pretty text-muted">
            Each type asks its own questions. A college is judged on placements and
            hostels; an exam on whether it was run cleanly; a politician on delivery
            rather than party. Nothing gets a generic five-star rating.
          </p>
          <div className="mt-5">
            <SectionPurpose
              problem="Opinion on most subjects is scattered across a dozen places"
              solution="One measured page per subject, open to read without an account"
            />
          </div>
        </div>

        <ul className="m-0 mt-[clamp(34px,5vw,58px)] grid list-none grid-cols-2 gap-[clamp(10px,1.4vw,16px)] p-0 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.filter((category) => {
            // Same rule as the catalog chips: the catch-all only shows up once
            // somebody has published into it.
            if (!category.reserved) return true;
            return (topics.get(category.id) ?? 0) + (polls.get(category.id) ?? 0) > 0;
          }).map((category, i) => {
            const e = topics.get(category.id) ?? 0;
            const p = polls.get(category.id) ?? 0;
            return (
              <li
                key={category.id}
                data-reveal
                className="ohq-reveal"
                style={{ transitionDelay: `${40 + (i % 4) * 60}ms` }}
              >
                <Link
                  href="/topics"
                  className="ohq-panel group flex h-full flex-col gap-2.5 p-4 transition-[border-color,transform] duration-300 ease-ohq outline-none hover:-translate-y-0.5 hover:border-veil/18 focus-visible:ring-2 focus-visible:ring-positive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:p-5"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-[9px] border border-veil/8 bg-veil/4 text-muted transition-colors duration-300 group-hover:border-positive/30 group-hover:text-positive-light"
                  >
                    <CategoryIcon category={category.id} size={16} />
                  </span>
                  <span className="text-[14px] leading-[1.25] font-semibold tracking-[-0.01em] text-pretty text-cream">
                    {category.label}
                  </span>
                  <span className="mt-auto font-mono text-[10px] tracking-[0.08em] uppercase text-dim">
                    {e} {e === 1 ? "topic" : "topics"}
                    {p > 0 ? ` · ${p} ${p === 1 ? "poll" : "polls"}` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
