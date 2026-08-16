/**
 * "edited", next to the time on anything its author has rewritten.
 *
 * WHY IT MATTERS MORE HERE THAN ON MOST SITES. A contribution can be updated
 * three times, and replies hang underneath it. Without a marker, a post can be
 * rewritten after people have answered it, and their answers are left arguing
 * with words that are no longer on the page — with nothing to tell a later
 * reader that the two ever disagreed. The tag does not restore the old text; it
 * says the text moved, which is the part a reader needs in order to read the
 * thread correctly.
 *
 * It carries the timestamp in `title` rather than on screen. The fact of an
 * edit is worth a permanent two-word footprint; the minute it happened is worth
 * a hover.
 *
 * DELIBERATELY NOT A COUNT. "edited 3 times" reads as an accusation, and the
 * limit already exists to stop the behaviour that would deserve one.
 */
export function EditedTag({ at }: { at?: string | null }) {
  if (!at) return null;

  const when = new Date(at);
  const exact = Number.isNaN(when.getTime())
    ? undefined
    : when.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  return (
    <span
      title={exact ? `Edited ${exact}` : "Edited after posting"}
      className="font-mono text-[10px] tracking-[0.08em] whitespace-nowrap text-dim"
    >
      · edited
    </span>
  );
}
