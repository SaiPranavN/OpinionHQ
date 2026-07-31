/**
 * Standing disclosure that the figures on screen are fixtures rather than
 * measurements. Required while the prototype uses `src/lib/sample-data`.
 */
export function PrototypeDataBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase text-dim ${className}`}
      title="All figures on this prototype are sample data, not real measurements."
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#F0A83C]" />
      Sample data
    </span>
  );
}
