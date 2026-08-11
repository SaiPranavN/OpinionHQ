/**
 * The audit log.
 *
 * Read-only, and there is no interface anywhere for editing or deleting an
 * entry — `authenticated` has no insert, update or delete privilege on the
 * table at all. Entries are written by the same audited functions that perform
 * the actions, in the same transaction, before the row they describe stops
 * existing. That ordering is why `subject_label` is here: after a deletion there
 * is nothing left to join to for a name.
 */

import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Audit · Editorial desk" };
export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  role_granted: "Role granted",
  account_suspended: "Account suspended",
  account_restored: "Account restored",
  account_deleted: "Account deleted",
  topic_deleted: "Topic deleted",
  poll_deleted: "Poll deleted",
  credential_reviewed: "Proof reviewed",
};

const SEVERE = new Set(["account_deleted", "topic_deleted", "poll_deleted"]);

export default async function AdminAudit() {
  const supabase = await supabaseServer();

  const { data: entries } = await supabase
    .from("admin_actions")
    .select("id, action, subject_label, reason, created_at, actor_id, profiles!actor_id(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 font-display text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.018em] text-cream-bright">
          Audit
        </h2>
        <p className="m-0 max-w-[72ch] text-[13px] leading-[1.6] font-light text-muted">
          Every irreversible thing an admin does, written before the thing it
          describes stops existing. Nobody writes their own entry and nobody edits
          one afterwards — the table grants no write privilege to any signed-in
          role.
        </p>
      </div>

      {!entries || entries.length === 0 ? (
        <p className="ohq-panel m-0 p-6 text-[13.5px] text-muted">
          Nothing recorded yet. Granting a role, suspending an account or deleting
          anything will appear here.
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {entries.map((entry) => {
            const actor = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
            const severe = SEVERE.has(entry.action);
            return (
              <li
                key={entry.id}
                className={`ohq-panel flex flex-col gap-1.5 p-4 ${severe ? "border-negative/25" : ""}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={`text-[13.5px] font-semibold ${severe ? "text-negative-light" : "text-cream-bright"}`}
                  >
                    {LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-[13px] text-cream">{entry.subject_label || "—"}</span>
                  <span className="ml-auto font-mono text-[10.5px] tracking-[0.06em] text-dim">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="m-0 text-[12.5px] leading-[1.5] text-muted">
                  by{" "}
                  <span className="text-soft">
                    {(actor as { display_name?: string } | null)?.display_name ?? "a deleted account"}
                  </span>
                  {entry.reason ? <> — {entry.reason}</> : null}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
