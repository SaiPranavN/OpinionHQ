"use client";

export function TopicSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="relative flex min-w-0 flex-1 items-center sm:max-w-[300px]">
      <span aria-hidden className="absolute left-3 text-[13px] text-dim">
        ⌕
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name, category, tag…"
        aria-label="Search topics by name, category, tag or description"
        className="w-full rounded-[10px] border border-white/10 bg-surface py-[10px] pr-3 pl-8 text-[13.5px] text-cream outline-none transition-colors duration-300 focus:border-positive/50 focus-visible:ring-2 focus-visible:ring-positive/40"
      />
    </label>
  );
}
