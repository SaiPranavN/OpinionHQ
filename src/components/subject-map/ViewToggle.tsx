"use client";

/**
 * List / Map switch, shared by both catalogues.
 *
 * The list leads because it is the default view — the plain rendering of the
 * results — and the map is the opt-in way to explore them. The toggle sits
 * beside the result summary where it cannot be missed, and the choice is
 * remembered across both catalogues.
 */

export function ViewToggle({
  view,
  accent,
  mapLabel,
  onChange,
}: {
  view: "map" | "list";
  accent: "positive" | "poll";
  /** "Topic map" or "Poll map" — the catalogue names its own map. */
  mapLabel: string;
  onChange: (view: "map" | "list") => void;
}) {
  const active =
    accent === "poll"
      ? "border-poll/45 bg-poll/12 text-poll-soft"
      : "border-positive/45 bg-positive/12 text-positive-light";
  const idle = "border-transparent text-dim hover:text-cream";
  const ring = accent === "poll" ? "focus-visible:ring-poll/60" : "focus-visible:ring-positive/60";

  return (
    <div
      role="group"
      aria-label="Catalogue view"
      className="flex items-center gap-1 rounded-full border border-veil/10 p-1"
    >
      {(
        [
          { id: "list", label: "List view" },
          { id: "map", label: mapLabel },
        ] as const
      ).map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={view === option.id}
          onClick={() => onChange(option.id)}
          className={`cursor-pointer rounded-full border px-3 py-1 text-[11.5px] font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 ${ring} ${
            view === option.id ? active : idle
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
