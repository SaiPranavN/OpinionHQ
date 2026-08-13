import Link from "next/link";

import { Brand } from "@/components/ui/Brand";
import { categoryOf } from "@/lib/taxonomy";
import { placeContext, type PlaceId } from "@/lib/places";
import type { SubjectPreview } from "@/lib/preview";
import type { CategoryId } from "@/lib/types";

/**
 * What a signed-out visitor gets instead of the dashboard.
 *
 * The subject is stated in full — name, what it is, category, place, tags —
 * because that is what makes the page worth arriving at and what a search
 * engine indexes. Everything measured is absent, and absent from the HTML
 * rather than hidden by CSS: see lib/preview.ts.
 *
 * WRITTEN AS AN INVITATION, NOT A WALL. It says what is behind it in
 * specifics — the distribution, who voted, what they wrote — because a gate
 * that only says "sign in to continue" is asking for a decision with no
 * information. The `next` parameter carries the visitor back here afterwards,
 * so signing in does not cost them the page they were looking at.
 */
export function SubjectGate({
  preview,
  kind,
  behind,
}: {
  preview: SubjectPreview;
  kind: "topic" | "poll";
  /** The specific things an account unlocks here, in plain words. */
  behind: string[];
}) {
  const category = categoryOf(preview.categoryId as CategoryId);
  const where = placeContext(preview.placeId as PlaceId);
  const next = encodeURIComponent(`/${kind === "topic" ? "topics" : "polls"}/${preview.slug}`);

  return (
    <div
      className="mx-auto flex max-w-[1320px] flex-col gap-[clamp(26px,3.4vw,44px)] px-4 pb-[clamp(70px,9vw,120px)] sm:px-8 lg:px-14"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + 18px)" }}
    >
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-dim">
            {category.label}
          </span>
          <span aria-hidden className="text-veil/20">
            ·
          </span>
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-dim">
            {where}
          </span>
        </div>

        <h1 className="m-0 max-w-[20ch] font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.03] font-bold tracking-[-0.025em] text-balance text-cream-bright">
          {preview.title}
        </h1>

        <div className="flex max-w-[720px] flex-col gap-2">
          {preview.summary ? (
            <p className="m-0 text-[15.5px] leading-[1.55] font-light text-pretty text-soft">
              {preview.summary}
            </p>
          ) : null}
          {preview.about ? (
            <p className="m-0 text-[13.5px] leading-[1.65] font-light text-pretty text-muted">
              {preview.about}
            </p>
          ) : null}
        </div>

        {/* A poll's options are part of the question. The split is not. */}
        {preview.options && preview.options.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {preview.options.map((name) => (
              <li
                key={name}
                className="rounded-full border border-poll/35 bg-poll/8 px-3.5 py-1.5 text-[13px] font-medium text-poll-soft"
              >
                {name}
              </li>
            ))}
          </ul>
        ) : null}

        {preview.tags.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {preview.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-veil/8 px-2.5 py-[3px] text-[11px] text-dim"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <section className="ohq-panel flex flex-col items-center gap-6 px-5 py-[clamp(40px,7vw,72px)] text-center">
        <span className="ohq-eyebrow">Results are for members</span>

        <h2 className="m-0 max-w-[18ch] font-display text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.06] font-bold tracking-[-0.02em] text-balance text-cream-bright">
          Sign in to see what people think.
        </h2>

        <ul className="m-0 flex max-w-[560px] list-none flex-col gap-2.5 p-0 text-left text-[14px] text-soft">
          {behind.map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden className="pt-px text-positive">
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/signin?next=${next}`}
            className="ohq-press rounded-full bg-positive px-7 py-3.5 text-[15px] font-semibold text-positive-ink transition-[background,box-shadow] duration-300 ease-ohq hover:bg-[#25CC61] hover:shadow-[0_12px_36px_-10px_rgba(29,185,84,0.5)]"
          >
            Sign in
          </Link>
          <Link
            href={`/signin?mode=signup&next=${next}`}
            className="rounded-full border border-veil/16 px-6 py-3.5 text-[14.5px] font-medium text-soft transition-[border-color,color] duration-300 hover:border-veil/40 hover:text-cream-bright"
          >
            Create an account
          </Link>
        </div>

        <p className="m-0 max-w-[520px] text-[12.5px] leading-[1.6] text-dim">
          Free, and it takes a minute. <Brand /> counts one vote per account —
          which is the only reason the numbers on the other side of this mean
          anything.
        </p>
      </section>
    </div>
  );
}
