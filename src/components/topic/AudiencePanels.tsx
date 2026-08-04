import { formatNumber } from "@/lib/derive";
import type { DecoratedTopic, DistributionRow } from "@/lib/types";

function DistributionBars({
  title,
  rows,
  labelWidth,
}: {
  title: string;
  rows: DistributionRow[];
  labelWidth: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[12.5px] text-muted">{title}</span>
      {rows.map((row) => (
        <span key={row.label} className="flex items-center gap-3">
          <span
            className="flex-none text-[13px] text-soft"
            style={{ width: labelWidth }}
          >
            {row.label}
          </span>
          <span className="h-2 flex-[1_1_50px] overflow-hidden rounded-[3px] bg-veil/5">
            <span
              className="block h-full max-w-full rounded-[3px] bg-veil/55"
              style={{ width: `${row.pct * 2.6}%` }}
            />
          </span>
          <span className="flex-none font-mono text-[11px] whitespace-nowrap text-cream">
            {row.pct}% · {formatNumber(row.count)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function AudiencePanels({ topic }: { topic: DecoratedTopic }) {
  // Breakdowns describe who voted. With nobody voting there is nothing to break
  // down, and the demographic caveats would be describing an empty sample.
  if (topic.unrated) {
    return (
      <section
        aria-label="Who is participating"
        className="ohq-panel flex flex-col gap-2 p-5 sm:p-7"
      >
        <span className="ohq-eyebrow">Who is participating</span>
        <p className="m-0 text-[13.5px] leading-[1.6] text-dim">
          Nobody has voted yet, so there is no audience to break down. Location,
          age and occupation splits appear once enough participants have shared
          them — and never for individuals.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Who is participating"
      className="flex flex-wrap gap-[clamp(14px,1.6vw,20px)]"
    >
      <figure className="ohq-panel m-0 flex min-w-0 flex-[2_1_380px] flex-col gap-[18px] p-5 sm:p-7">
        <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="ohq-eyebrow">Where participants are voting from</span>
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-dim">
            Self-reported
          </span>
        </figcaption>
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {topic.geo.map((row) => (
            <li key={row.label} className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
              <span className="flex-none basis-[clamp(96px,14vw,140px)] text-[13.5px] text-soft">
                {row.label}
              </span>
              <span className="h-2 min-w-20 flex-[1_1_120px] overflow-hidden rounded-[3px] bg-veil/5">
                <span
                  className="block h-full max-w-full rounded-[3px] bg-veil/55"
                  style={{ width: `${row.pct * 3.4}%` }}
                />
              </span>
              <span className="flex-none font-mono text-[11.5px] whitespace-nowrap text-cream">
                {row.pct}% · {formatNumber(row.count)}
              </span>
              <span
                className="flex flex-none items-center gap-1.5 text-[12px] whitespace-nowrap"
                style={{
                  color:
                    row.lean === "leans negative"
                      ? "#E5484D"
                      : row.lean === "leans positive"
                        ? "#1DB954"
                        : "#A1A1A1",
                }}
              >
                <span aria-hidden className="text-[8px]">
                  ●
                </span>
                {row.negativeShare}% negative · {row.lean}
              </span>
            </li>
          ))}
        </ul>
        <p className="m-0 border-t border-line pt-4 text-[12.5px] leading-[1.55] text-dim">
          Location is optional and self-declared, shared by {topic.demographicOptIn}% of
          participants on this topic. Regions below 3% of the sample are grouped as
          “Other states” rather than shown separately.
        </p>
      </figure>

      <figure className="ohq-panel m-0 flex min-w-0 flex-[1_1_300px] flex-col gap-[22px] p-5 sm:p-7">
        <figcaption className="ohq-eyebrow">Who is participating</figcaption>
        <DistributionBars
          title="Age group"
          rows={topic.ageGroups}
          labelWidth="clamp(74px,10vw,96px)"
        />
        <DistributionBars
          title="Occupation"
          rows={topic.occupations}
          labelWidth="clamp(74px,10vw,120px)"
        />
        <p className="m-0 border-t border-line pt-4 text-[12.5px] leading-[1.55] text-dim">
          Demographics are voluntary. Percentages describe the participants who chose to
          share them — not all {formatNumber(topic.participants)} voters, and not the
          public.
        </p>
      </figure>
    </section>
  );
}
