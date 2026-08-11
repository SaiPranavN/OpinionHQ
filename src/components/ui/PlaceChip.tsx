/**
 * Where an artifact applies, on a card.
 *
 * A pin and a word. The containing places go in `title` rather than on screen —
 * a card has room for "Bengaluru", not for "Bengaluru, Karnataka, India", and
 * the reader who needs the longer form is the rare one who does not recognise
 * the short one.
 *
 * `worldwide` renders nothing. A chip on every card saying "Worldwide" is a
 * chip that means nothing, and the whole value of this field is that it marks
 * the artifacts which are *not* about everywhere.
 */

import { placeContext, placeLabel, type PlaceId } from "@/lib/places";

export function PlaceChip({
  place,
  className = "",
}: {
  place: PlaceId;
  className?: string;
}) {
  if (place === "worldwide") return null;
  const context = placeContext(place).replace(", Worldwide", "");
  return (
    <span
      title={context ? `${placeLabel(place)} — in ${context}` : placeLabel(place)}
      className={`inline-flex min-w-0 shrink-0 items-center gap-1 text-[10px] tracking-[0.14em] uppercase text-dim ${className}`}
    >
      <PinIcon />
      <span className="truncate font-mono">{placeLabel(place)}</span>
    </span>
  );
}

function PinIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden className="shrink-0">
      <path
        d="M4.5 10.2S8 6.9 8 4.4a3.5 3.5 0 1 0-7 0c0 2.5 3.5 5.8 3.5 5.8Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="4.5" cy="4.3" r="1.15" fill="currentColor" />
    </svg>
  );
}
