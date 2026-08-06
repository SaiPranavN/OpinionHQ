/**
 * Accounts.
 *
 * `profiles` is world-readable — it holds nothing that is not already printed
 * next to somebody's opinions — so this list needs no privilege to *read*. What
 * needs admin is every button on it, and each of those goes through an audited
 * function rather than a column write.
 *
 * Notably absent: date of birth, phone number, address. They live in
 * `profile_private`, an admin can read them, and this screen still does not show
 * them — there is no administrative task on this page that needs somebody's
 * date of birth, and a table that displays it invites reading it for no reason.
 */

import { AccountRows } from "@/components/admin/AccountRows";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Accounts · Editorial desk" };
export const dynamic = "force-dynamic";

export default async function AdminAccounts() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows }, { data: me }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, initials, username, role, suspended_at, created_at, headline")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle(),
  ]);

  if (me?.role !== "admin") {
    return (
      <p className="ohq-panel m-0 p-6 text-[13.5px] leading-[1.6] text-muted">
        Managing accounts is an admin power. Editors publish topics and moderate
        content; granting roles, suspending and deleting are deliberately not on
        that list.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 font-display text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.018em] text-cream-bright">
          Accounts
          <span className="ml-2.5 font-mono text-[12px] font-normal tracking-normal text-dim">
            {rows?.length ?? 0}
          </span>
        </h2>
        <p className="m-0 max-w-[72ch] text-[13px] leading-[1.6] font-light text-muted">
          Roles are what somebody may <em className="italic">do</em>. Pro is what they have{" "}
          <em className="italic">paid for</em> and is not on this ladder — an admin may or may not
          be a subscriber, and it changes nothing either way.
        </p>
      </div>

      <AccountRows
        accounts={(rows ?? []).map((r) => ({
          id: r.id,
          displayName: r.display_name,
          initials: r.initials ?? "?",
          username: r.username,
          headline: r.headline ?? "",
          role: r.role as "member" | "editor" | "admin",
          suspended: Boolean(r.suspended_at),
          createdAt: r.created_at,
        }))}
        selfId={user?.id ?? ""}
      />
    </div>
  );
}
