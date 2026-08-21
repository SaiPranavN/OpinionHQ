"use client";

/**
 * Changing what "For you" means, after sign-up.
 *
 * WITHOUT THIS THE FEATURE HAS A HOLE IN IT. The interests step is part of
 * creating an account, so every account that already existed when it shipped
 * has an empty list and no way on the site to fill one in — their catalogs
 * would show "All" forever, which is exactly the state the step was added to
 * improve on. This is the way in for them, and the way back for anybody whose
 * mind changed.
 *
 * COLLAPSED UNTIL ASKED FOR. Fifteen toggles is the largest thing that would be
 * on this page, and the dashboard's job is showing somebody what they did, not
 * offering them a settings screen on arrival. The summary line is the useful
 * part at a glance; the picker opens under it.
 *
 * It writes with `saveInterests`, which touches one column — not
 * `saveAccountDetails`, which would set eight of them from whatever this form
 * happens to be holding. A page that does not show a date of birth must not be
 * able to blank one.
 */

import { useState } from "react";

import { useSession } from "@/components/auth/SessionProvider";
import { InterestPicker } from "@/components/auth/InterestPicker";
import { saveInterests } from "@/lib/auth/account";
import { CATEGORY_BY_ID } from "@/lib/taxonomy";
import type { CategoryId } from "@/lib/types";

export function InterestSettings() {
  const { interests, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CategoryId[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Null until they touch something, so the panel follows the session until it
  // is being edited and does not fight a refresh landing underneath it.
  const chosen = draft ?? interests;
  const dirty = draft !== null && !same(draft, interests);

  const save = async () => {
    if (busy || !draft) return;
    setBusy(true);
    setError(null);
    const result = await saveInterests(draft);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    await refresh();
    setBusy(false);
    setDraft(null);
    setSaved(true);
  };

  return (
    <section
      aria-label="What you read"
      className="flex flex-col gap-3 rounded-[16px] border border-veil/10 bg-veil/2 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="ohq-eyebrow">What you read</span>
          <span className="text-[15px] font-semibold text-cream-bright">
            {interests.length === 0
              ? "Every category"
              : `${interests.length} ${interests.length === 1 ? "category" : "categories"}`}
          </span>
        </span>
        <span className="max-w-[440px] text-[12.5px] leading-[1.55] text-dim">
          {interests.length === 0
            ? "Pick a few and the topics and polls catalogs will open on them, under a “For you” tab."
            : summarise(interests)}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {saved && !open ? (
            <span className="text-[12px] text-positive-light">Saved</span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              setSaved(false);
            }}
            aria-expanded={open}
            className="cursor-pointer rounded-full border border-veil/14 px-4 py-2 text-[12.5px] font-medium text-muted transition-colors hover:border-veil/32 hover:text-cream"
          >
            {open ? "Close" : interests.length === 0 ? "Pick categories" : "Change"}
          </button>
        </span>
      </div>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-veil/8 pt-4">
          <InterestPicker
            value={chosen}
            onChange={(next) => {
              setDraft(next);
              setError(null);
              setSaved(false);
            }}
          />

          <p className="m-0 text-[12px] leading-[1.55] text-dim">
            This only decides what a catalog shows you first. Every category
            stays one tap away, and nothing here is visible to anybody else or
            counted in any breakdown.
          </p>

          {error ? (
            <p role="alert" className="m-0 text-[12.5px] text-negative-light">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={save}
              disabled={busy || !dirty}
              className="cursor-pointer rounded-full bg-positive px-5 py-2.5 text-[13px] font-semibold text-positive-ink transition-colors hover:bg-[#25CC61] disabled:cursor-not-allowed disabled:bg-veil/10 disabled:text-dim"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            {dirty ? (
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="cursor-pointer rounded-full border border-veil/14 px-4 py-2 text-[12.5px] font-medium text-muted transition-colors hover:border-veil/32 hover:text-cream"
              >
                Discard
              </button>
            ) : null}
            {/* Clearing every category is a real answer: it turns the leading
                chip back into "All". Said out loud, because a picker with
                nothing selected otherwise reads as an unsaved mistake. */}
            {chosen.length === 0 ? (
              <span className="text-[12px] text-dim">
                With none picked, the catalogs open on everything.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Three names and a count, rather than a wrapped list of fifteen. */
function summarise(interests: readonly CategoryId[]): string {
  const names = interests.map((id) => CATEGORY_BY_ID.get(id)?.short ?? id);
  if (names.length <= 3) return `${names.join(", ")}.`;
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more.`;
}

/** Both lists are kept in taxonomy order, so position-wise equality is enough. */
function same(a: readonly CategoryId[], b: readonly CategoryId[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
