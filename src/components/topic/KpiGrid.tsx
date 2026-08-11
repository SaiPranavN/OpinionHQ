import { formatNumber } from "@/lib/derive";
import type { DecoratedTopic } from "@/lib/types";

function Kpi({
  label,
  value,
  note,
  color,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  color?: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface p-5">
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
        {label}
      </span>
      <span
        className="flex items-center gap-2 text-[26px] font-semibold tracking-[-0.02em]"
        style={{ color: color ?? "#F7F5F1" }}
      >
        {icon ? (
          <span aria-hidden className="text-[14px]">
            {icon}
          </span>
        ) : null}
        {value}
      </span>
      <span className="text-[12px] text-dim">{note}</span>
    </div>
  );
}

export function KpiGrid({ topic }: { topic: DecoratedTopic }) {
  return (
    <section
      aria-label="Key metrics"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-[clamp(12px,1.4vw,16px)]"
    >
      <Kpi
        label="Total participants"
        value={formatNumber(topic.participants)}
        note="One vote counted per account"
      />
      <Kpi
        label="7-day change"
        value={
          topic.unrated
            ? "—"
            : `${topic.change.direction === "up" ? "+" : "−"}${topic.change.value.toFixed(1)}%`
        }
        note={topic.changeLabel}
        color={topic.changeColor}
        icon={topic.changeArrow}
      />
      <Kpi
        label="Polarization index"
        value={`${Math.round(topic.polarization)}/100`}
        note={topic.polarizationWord}
      />
      <Kpi
        label="Written opinions"
        value={formatNumber(topic.writtenCount)}
        note="Explanations attached to votes"
      />
    </section>
  );
}
