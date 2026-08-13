"use client";

/**
 * Pro membership, read and written against Postgres.
 *
 * IT USED TO BE A BOOLEAN IN LOCALSTORAGE. That meant Pro was per-device, gone
 * on a cache clear, and available to anybody willing to open a console and set
 * it — which was fine for a prototype and is not fine now that the same flag
 * decides who may publish a rich contribution and who may post without a name.
 *
 * Nothing here decides anything. `pro` comes back from `is_pro()` itself, the
 * same function the row policies call, so a screen cannot form its own opinion
 * about who is a member and quietly disagree with the database. Every write is
 * a `SECURITY DEFINER` function that checks the caller before it moves.
 */

import { supabaseBrowser } from "@/lib/supabase/client";

export interface ProState {
  /** Straight from `is_pro()`. Not derived here — see the note above. */
  pro: boolean;
  status: string;
  plan: string;
  periodEnd: string | null;
  /** An admin removed it. The account cannot start again by itself. */
  revoked: boolean;
  /** The free launch window is still open. */
  offerOpen: boolean;
  freeUntil: string | null;
  priceInr: number;
}

const SIGNED_OUT: ProState = {
  pro: false,
  status: "none",
  plan: "",
  periodEnd: null,
  revoked: false,
  offerOpen: false,
  freeUntil: null,
  priceInr: 99,
};

/** A `returns table` function comes back as rows. There is exactly one. */
function fromRow(row: {
  pro: boolean;
  status: string;
  plan: string;
  period_end: string | null;
  revoked: boolean;
  offer_open: boolean;
  free_until: string | null;
  price_inr: number;
}): ProState {
  return {
    pro: row.pro,
    status: row.status,
    plan: row.plan,
    periodEnd: row.period_end,
    revoked: row.revoked,
    offerOpen: row.offer_open,
    freeUntil: row.free_until,
    priceInr: Number(row.price_inr ?? 99),
  };
}

export async function readProState(): Promise<ProState> {
  const { data, error } = await supabaseBrowser().rpc("my_pro_state");
  if (error || !data || data.length === 0) return SIGNED_OUT;
  return fromRow(data[0] as Parameters<typeof fromRow>[0]);
}

/**
 * Opt in.
 *
 * The error is thrown rather than swallowed, and the message is the one Postgres
 * raised — "the free launch period ended on 13 Oct 2026", "Pro is not available
 * on this account". Those are written to be read by a person, and replacing them
 * with a generic failure here would throw away the only explanation there is.
 */
export async function startPro(): Promise<ProState> {
  const { error } = await supabaseBrowser().rpc("start_pro");
  if (error) throw new Error(error.message);
  return readProState();
}

export async function stopPro(): Promise<ProState> {
  const { error } = await supabaseBrowser().rpc("stop_pro");
  if (error) throw new Error(error.message);
  return readProState();
}

/* ------------------------------------------------------------------ admin */

export async function revokePro(target: string, reason: string): Promise<void> {
  const { error } = await supabaseBrowser().rpc("revoke_pro", { target, reason });
  if (error) throw new Error(error.message);
}

export async function grantPro(target: string, reason: string): Promise<void> {
  const { error } = await supabaseBrowser().rpc("grant_pro", { target, reason });
  if (error) throw new Error(error.message);
}

/* ----------------------------------------------------------------- format */

/**
 * "until 13 October" — the date the free offer closes.
 *
 * Day and month, no year and no time. The offer is weeks away, not months, and
 * a full timestamp on a marketing panel reads like a legal notice.
 */
export function offerDeadline(freeUntil: string | null): string {
  if (!freeUntil) return "";
  const date = new Date(freeUntil);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}

/** "8 weeks left", "6 days left", "today". Null once it has passed. */
export function offerRemaining(freeUntil: string | null): string | null {
  if (!freeUntil) return null;
  const end = new Date(freeUntil).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.ceil((end - Date.now()) / 86_400_000);
  if (days <= 0) return null;
  if (days === 1) return "last day";
  if (days < 14) return `${days} days left`;
  return `${Math.floor(days / 7)} weeks left`;
}
