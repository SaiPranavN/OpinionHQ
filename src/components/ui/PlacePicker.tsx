"use client";

/**
 * Choosing where an artifact applies.
 *
 * A `<select>` cannot nest, so the tree is carried in the indentation of the
 * labels. Em-space rather than markup because the browser renders the option
 * list itself and will strip anything cleverer.
 *
 * There is no blank first entry. A place is required, and an empty default is
 * how every artifact ends up in whatever the picker happened to open on.
 */

import { placeContext, placeOptions, type PlaceId } from "@/lib/places";

const INDENT = " ";

export function PlacePicker({
  value,
  onChange,
  className = "",
  id,
}: {
  value: PlaceId;
  onChange: (next: PlaceId) => void;
  className?: string;
  id?: string;
}) {
  const context = placeContext(value);
  return (
    <>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as PlaceId)}
        className={className}
      >
        {placeOptions().map((option) => (
          <option key={option.id} value={option.id}>
            {INDENT.repeat(option.depth)}
            {option.label}
          </option>
        ))}
      </select>
      <span className="text-[10.5px] text-dim">
        {context
          ? `Inside ${context.replace(", Worldwide", "")}. A wider filter still finds it.`
          : "Not tied to a place — shown under Worldwide, not under any country."}
      </span>
    </>
  );
}
