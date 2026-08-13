"use client";

/**
 * Post without your name on it.
 *
 * WHAT IT SAYS IS THE IMPORTANT PART. "Anonymous" is a word people read as
 * untraceable, and this is not that: other members see no name, no initials and
 * no occupation, while the row still has an author — it has to, because one
 * account one vote depends on it and because somebody has to be able to edit
 * their own post. Overstating it would be the kind of promise that gets
 * somebody into trouble on a topic that matters.
 *
 * So the helper line under the switch says exactly what is hidden and from
 * whom, and it says it before the choice is made rather than in a policy page
 * nobody opens.
 */

export function AnonymousToggle({
  on,
  onChange,
  disabled = false,
  hint,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  /** True for a non-member: the switch renders, explains, and does not move. */
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className="inline-flex cursor-pointer items-center gap-2.5 self-start rounded-full border border-veil/12 px-3 py-1.5 text-[12.5px] font-medium transition-[border-color,color] duration-300 outline-none hover:border-veil/32 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-positive/50"
        style={{ color: on ? "#4ED27C" : "#A8A49E" }}
      >
        <span
          aria-hidden
          className="relative h-[15px] w-[26px] rounded-full transition-colors duration-300"
          style={{ background: on ? "rgba(29,185,84,0.55)" : "rgba(255,255,255,0.14)" }}
        >
          <span
            className="absolute top-[2px] h-[11px] w-[11px] rounded-full bg-cream transition-[left] duration-300"
            style={{ left: on ? "13px" : "2px" }}
          />
        </span>
        Post anonymously
      </button>

      <p className="m-0 max-w-[52ch] text-[11.5px] leading-[1.55] text-dim">
        {hint ??
          (on
            ? "No name, initials or occupation will be shown to other readers. Your account still holds the post, so you can edit it and it still counts as your one vote."
            : "Other readers will see your name on this.")}
      </p>
    </div>
  );
}
