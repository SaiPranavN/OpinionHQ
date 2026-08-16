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
 * THE TIME ZONE IS PINNED, and it has to be. This renders on the server, and
 * `toLocaleString` with no zone uses whatever the machine's is — which is UTC
 * on Vercel and IST on the laptop it was written on. The deployed page shipped
 * "1:28 pm" in its HTML and then React re-rendered it as "6:58 pm" after
 * hydration: a mismatch, and five and a half hours of wrong for anybody reading
 * before the JavaScript lands or with it turned off.
 *
 * Asia/Kolkata rather than the reader's own zone, because pinning is what makes
 * server and client agree, and IST is the right default for a site whose
 * subjects are Indian. It is labelled, so a reader elsewhere knows which clock
 * they are being shown rather than assuming it is theirs.
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
        timeZone: "Asia/Kolkata",
      });

  return (
    <span
      title={exact ? `Edited ${exact} IST` : "Edited after posting"}
      className="font-mono text-[10px] tracking-[0.08em] whitespace-nowrap text-dim"
    >
      · edited
    </span>
  );
}
