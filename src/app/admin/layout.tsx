/**
 * The admin area, and the door to it.
 *
 * THE CHECK IS HERE AND IT IS NOT THE SECURITY. Every table these pages touch
 * already refuses a member through its row policies, and the audited functions
 * refuse them again — so somebody who forged their way past this layout would
 * see a set of empty lists and get "not permitted" on every button. What this
 * guard buys is that they see a sign-in page instead of a broken one, which is
 * a courtesy rather than a control.
 *
 * A Server Component so the redirect happens before anything renders. Doing it
 * in a client effect would paint the admin shell first and then navigate away,
 * which reads as a flicker of access somebody was never granted.
 *
 * `getUser()`, never `getSession()`: the cookie is attacker-controllable and
 * only the auth server can say the token in it is real.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { supabaseServer } from "@/lib/supabase/server";

interface Section {
  href: string;
  label: string;
  /** Rendered for admins only. The route refuses everyone else regardless. */
  adminOnly?: boolean;
}

const SECTIONS: Section[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/topics", label: "Topics" },
  { href: "/admin/polls", label: "Polls" },
  { href: "/admin/accounts", label: "Accounts", adminOnly: true },
  { href: "/admin/audit", label: "Audit", adminOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?next=%2Fadmin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "member";
  if (role !== "editor" && role !== "admin") redirect("/topics");

  const isAdmin = role === "admin";

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-4 py-[clamp(24px,4vw,48px)] sm:px-8">
      <header className="flex flex-col gap-3 border-b border-veil/10 pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="m-0 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.05] font-bold tracking-[-0.025em] text-cream-bright">
            Editorial <em className="italic">desk</em>
          </h1>
          <span className="flex items-center gap-2 text-[12.5px] text-muted">
            {profile?.display_name}
            <span
              className={`rounded-full border px-2.5 py-[3px] font-mono text-[10px] tracking-[0.12em] uppercase ${
                isAdmin
                  ? "border-positive/40 bg-positive/12 text-positive-light"
                  : "border-veil/18 text-soft"
              }`}
            >
              {role}
            </span>
          </span>
        </div>
        <p className="m-0 max-w-[70ch] text-[13.5px] leading-[1.6] font-light text-muted">
          What is published here is the verified half of the platform — the record of
          what a subject is. Nothing an editor writes ever mixes with what
          participants say about it.
        </p>

        <nav className="mt-2 flex flex-wrap gap-2">
          {SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-full border border-veil/14 px-3.5 py-[7px] text-[12.5px] font-medium text-soft transition-colors duration-300 hover:border-veil/34 hover:text-cream"
            >
              {section.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
