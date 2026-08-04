import { Brand } from "@/components/ui/Brand";

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-veil/6 px-5 py-[34px] text-[13px] text-dim sm:px-8 lg:px-20">
      <span className="flex items-baseline gap-px">
        <Brand />
      </span>
      <span className="max-w-[520px] leading-[1.5]">
        All figures describe participating <Brand /> users, not the general public.
        Verified updates are sourced; opinions belong to their authors.
      </span>
      <span className="font-mono text-[11px] tracking-[0.08em]">Prototype · 2026</span>
    </footer>
  );
}
