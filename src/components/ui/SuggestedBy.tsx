/**
 * "Suggested by Meera" on a card.
 *
 * THE POINT OF THE WHOLE SUGGESTION FLOW IS THIS LINE. Somebody asked for a
 * subject, an editor agreed it was worth running, and the credit stays on the
 * card permanently — which is what makes suggesting feel like contributing to
 * the site rather than filing a ticket into a queue.
 *
 * Renders nothing at all when there is no suggester, which is most subjects.
 * An empty "Suggested by —" would make editorial topics look like they had
 * lost an attribution.
 *
 * Not a link. There are no profile pages, and a name that looks clickable and
 * is not is worse than a name that plainly is not.
 */

export function SuggestedBy({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;

  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase text-dim"
      }
      title={`${name} suggested this subject`}
    >
      <span aria-hidden>◆</span>
      Suggested by {name}
    </span>
  );
}
