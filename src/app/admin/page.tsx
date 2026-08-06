/**
 * The overview — what is on the desk right now.
 *
 * Counts read through the editor's own session, so what is reported is exactly
 * what they are allowed to act on. An admin sees the review queues; an editor
 * sees zero for them, which is honest rather than hidden.
 */

import Link from "next/link";

import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Editorial desk" };

/** `head: true` — the count comes back in a header and no rows travel. */
const HEAD = { count: "exact" as const, head: true };

export default async function AdminOverview() {
  const supabase = await supabaseServer();

  // Named rather than destructured from an array: `noUncheckedIndexedAccess`
  // makes every element of a destructured tuple `number | undefined`, and six
  // `?? 0` fallbacks would be noise standing in for a shape the code already
  // knows.
  const counts = await Promise.all([
    supabase.from("topics").select("*", HEAD).not("published_at", "is", null),
    supabase.from("topics").select("*", HEAD).is("published_at", null),
    supabase.from("profiles").select("*", HEAD),
    supabase.from("credentials").select("*", HEAD).eq("status", "pending"),
    supabase.from("topic_requests").select("*", HEAD).is("topic_id", null).is("declined_at", null),
    supabase.from("opinions").select("*", HEAD),
  ]).then(([a, b, c, d, e, f]) => ({
    published: a.count ?? 0,
    drafts: b.count ?? 0,
    accounts: c.count ?? 0,
    pendingProof: d.count ?? 0,
    openRequests: e.count ?? 0,
    opinions: f.count ?? 0,
  }));

  const { published, drafts, accounts, pendingProof, openRequests, opinions } = counts;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Published" value={published} href="/admin/topics" />
        <Stat label="Drafts" value={drafts} href="/admin/topics" />
        <Stat label="Opinions" value={opinions} />
        <Stat label="Accounts" value={accounts} href="/admin/accounts" />
        <Stat label="Proof to review" value={pendingProof} live={pendingProof > 0} />
        <Stat label="Topic requests" value={openRequests} live={openRequests > 0} />
      </section>

      {published === 0 && drafts === 0 ? (
        <section className="ohq-panel flex flex-col items-start gap-4 p-6">
          <h2 className="m-0 font-display text-[1.4rem] leading-[1.15] font-semibold tracking-[-0.015em] text-cream-bright">
            Nothing is published yet
          </h2>
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] font-light text-muted">
            The database starts genuinely empty — no seeded topics, no invented
            participation. Every number the site shows from here will be a real
            measurement, which is the whole reason it was left this way.
          </p>
          <Link
            href="/admin/topics/new"
            className="rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors duration-300 hover:bg-[#25CC61]"
          >
            Publish the first topic
          </Link>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2.5">
        <Action href="/admin/topics/new" primary>
          New topic
        </Action>
        <Action href="/admin/topics">Manage topics</Action>
        <Action href="/topics">View the public catalog</Action>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  live,
}: {
  label: string;
  value: number;
  href?: string;
  live?: boolean;
}) {
  const body = (
    <>
      <span
        className={`font-display text-[clamp(1.5rem,3vw,2rem)] leading-none font-bold tracking-[-0.02em] ${
          live ? "text-positive-light" : "text-cream-bright"
        }`}
      >
        {value.toLocaleString()}
      </span>
      <span className="text-[11.5px] leading-[1.3] text-muted">{label}</span>
    </>
  );
  const className =
    "ohq-panel flex flex-col gap-1.5 p-4 transition-colors duration-300" +
    (href ? " hover:border-veil/30" : "");
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Action({
  href,
  children,
  primary,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors duration-300 hover:bg-[#25CC61]"
          : "rounded-full border border-veil/16 px-5 py-2.5 text-[13.5px] font-medium text-cream transition-colors duration-300 hover:border-veil/40"
      }
    >
      {children}
    </Link>
  );
}
