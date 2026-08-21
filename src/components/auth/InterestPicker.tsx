"use client";

/**
 * The fifteen categories, as toggles.
 *
 * The last step of sign-up, and the only one that asks for a preference rather
 * than a fact. What it collects decides what the catalogs open on — see
 * `lib/interests.ts` for the rule and `CategoryFilter` for the chip it feeds.
 *
 * TOGGLE BUTTONS, NOT CHECKBOXES, and the difference is only in the markup:
 * each is a `<button role="switch">` carrying `aria-checked`, which is what a
 * screen reader needs to announce "Exams, on" and to say that pressing it turns
 * it off. A row of styled `<div>`s with a tick would look identical and be
 * unusable without a mouse, and a bare `<input type=checkbox>` cannot carry the
 * blurb and the glyph without a wrapper doing the work anyway.
 *
 * THE WHOLE CARD IS THE TARGET. On a phone these are the last thing between
 * somebody and their account, and a 24px tick box beside a two-line label is a
 * miss waiting to happen; the button is the card, so anywhere inside it counts.
 */

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CATEGORIES } from "@/lib/taxonomy";
import type { CategoryId } from "@/lib/types";

export function InterestPicker({
  value,
  onChange,
}: {
  value: readonly CategoryId[];
  onChange: (next: CategoryId[]) => void;
}) {
  const chosen = new Set(value);

  const toggle = (id: CategoryId) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Written back in taxonomy order rather than click order, so the list is
    // the same for two people who chose the same things.
    onChange(CATEGORIES.filter((c) => next.has(c.id)).map((c) => c.id));
  };

  const all = () => onChange(CATEGORIES.map((c) => c.id));
  const none = () => onChange([]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-dim" aria-live="polite">
          {chosen.size === 0
            ? "Nothing picked yet"
            : `${chosen.size} of ${CATEGORIES.length} picked`}
        </span>
        <span className="flex items-center gap-1.5">
          <QuietButton onClick={all}>Select all</QuietButton>
          {chosen.size > 0 ? <QuietButton onClick={none}>Clear</QuietButton> : null}
        </span>
      </div>

      {/* Two columns, and `short` rather than `label`.
          The sign-in panel is a fixed 468px at every viewport above it, so a
          card here is about 210px however wide the screen is — and
          "National & International Events" wraps to *three* lines in that,
          stretching its whole row and making the grid read as broken. `short`
          is the taxonomy's own field for exactly this case ("used where
          horizontal room is tight"), it is what the ticker and the compact
          chips already use, and it puts every one of the fifteen on one line.
          The full label and the blurb are on the button's `title`. */}
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
        {CATEGORIES.map((category) => {
          const on = chosen.has(category.id);
          return (
            <li key={category.id}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggle(category.id)}
                // The full name as well as the blurb: `short` is what is drawn,
                // and "Events" on its own does not say which events.
                title={`${category.label} — ${category.blurb}`}
                aria-label={category.label}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-left transition-[background,border-color,color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                  on
                    ? "border-positive/50 bg-positive/12 text-positive-light"
                    : "border-veil/12 text-muted hover:border-veil/28 hover:text-cream"
                }`}
              >
                <CategoryIcon category={category.id} size={15} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] leading-[1.3] font-medium">
                  {category.short}
                </span>
                <Tick on={on} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The state, drawn rather than only coloured.
 *
 * Colour is never the only signal on this site, and a green-tinted card against
 * a grey one is exactly that — invisible to a red-green colourblind reader and
 * to anyone at a glance in daylight. The ring fills and takes a check.
 */
function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
        on ? "border-positive bg-positive text-positive-ink" : "border-veil/25"
      }`}
    >
      {on ? (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6.4 4.8 8.7 9.5 3.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

function QuietButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-full border border-veil/12 px-2.5 py-1 text-[11.5px] text-muted transition-colors duration-300 outline-none hover:border-veil/28 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
    >
      {children}
    </button>
  );
}
