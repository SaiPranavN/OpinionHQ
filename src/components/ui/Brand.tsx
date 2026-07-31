/**
 * The wordmark, for use inside running copy.
 *
 * "OpinionHQ" is always set bold with the HQ in brand green, so the name reads
 * the same way in a paragraph as it does in the header. Import this rather than
 * typing the string — that is what keeps it consistent.
 */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <strong className={`font-semibold text-cream-bright ${className}`}>
      Opinion<span className="text-positive">HQ</span>
    </strong>
  );
}
