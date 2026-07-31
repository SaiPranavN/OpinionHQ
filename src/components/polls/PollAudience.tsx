import { Brand } from "@/components/ui/Brand";
import { formatNumber } from "@/lib/derive-poll";
import type { DecoratedPoll, PollSplitRow } from "@/lib/types";

/**
 * Cross-tabs: how each slice of the audience divided.
 *
 * A single headline bar hides the interesting part. Showing the same split per
 * region, age band and occupation is what turns a poll result into something
 * worth reading — and it is where the disagreements actually live.
 */
export function PollAudience({ poll }: { poll: DecoratedPoll }) {
  // Below the reporting threshold there is no audience to describe. Splitting a
  // handful of votes by region would invent a pattern that does not exist.
  if (poll.unvoted || poll.smallSample) {
    return (
      <section aria-label="Who voted" className="ohq-panel flex flex-col gap-2 p-5 sm:p-7">
        <span className="ohq-eyebrow">Who voted</span>
        <p className="m-0 text-[13.5px] leading-[1.6] text-dim">
          {poll.unvoted
            ? "Nobody has voted yet, so there is no audience to break down."
            : `Only ${poll.totalLabel} so far — too few to break down by region, age or occupation without inventing a pattern.`}{" "}
          The cross-tabs appear once enough people have voted.
        </p>
      </section>
    );
  }

  const blocks: [string, string, PollSplitRow[]][] = [
    ["Where votes came from", "Self-reported location", poll.regions],
    ["By age", "Self-reported age band", poll.ageGroups],
    ["By occupation", "Self-reported occupation", poll.occupations],
  ];

  return (
    <section aria-label="Who voted" className="flex flex-col gap-[clamp(14px,1.6vw,20px)]">
      {poll.contrarian ? (
        <div
          className="flex flex-col gap-1.5 rounded-[16px] border p-5"
          style={{
            borderColor: "rgba(240,168,60,0.3)",
            background: "rgba(240,168,60,0.06)",
          }}
        >
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#F0A83C]">
            Against the grain
          </span>
          <p className="m-0 text-[14.5px] leading-[1.55] text-soft">
            <strong className="font-semibold text-cream-bright">
              {poll.contrarian.label}
            </strong>{" "}
            is the one group that went the other way —{" "}
            <strong className="font-semibold" style={{ color: poll.trailer.color }}>
              {poll.contrarian.leans === "a"
                ? poll.contrarian.aPct
                : poll.contrarian.bPct}
              % for {poll.trailer.name}
            </strong>{" "}
            against {poll.leader.pct}% for {poll.leader.name} overall.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-[clamp(14px,1.6vw,20px)]">
        {blocks.map(([title, note, rows]) => (
          <figure
            key={title}
            className="ohq-panel m-0 flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-5 sm:p-7"
          >
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="ohq-eyebrow">{title}</span>
              <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-dim">
                {note}
              </span>
            </figcaption>

            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {rows.map((row) => (
                <li key={row.label} className="flex flex-col gap-1.5">
                  <span className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="text-soft">{row.label}</span>
                    <span className="font-mono text-[10.5px] text-dim">
                      {formatNumber(row.voters)} votes
                    </span>
                  </span>

                  <SplitRowBar poll={poll} row={row} />

                  <span className="flex flex-wrap items-baseline gap-x-2.5 text-[11px] text-dim">
                    <span style={{ color: poll.sides[0].color }}>{row.aPct}%</span>
                    <span aria-hidden className="text-white/18">
                      ·
                    </span>
                    <span style={{ color: poll.sides[1].color }}>{row.bPct}%</span>
                    {row.leans !== "even" ? (
                      <span className="ml-auto">
                        leans{" "}
                        {row.leans === "a" ? poll.sides[0].name : poll.sides[1].name}
                      </span>
                    ) : (
                      <span className="ml-auto">dead even</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </figure>
        ))}
      </div>

      <p className="m-0 text-[12px] leading-[1.55] text-dim">
        Location, age and occupation are optional and self-declared, shared by{" "}
        {poll.demographicOptIn}% of voters. Segments are only ever shown as
        percentages of that segment — never as individuals. Percentages describe
        the {formatNumber(poll.total)} <Brand /> participants who voted here, not the
        public.
      </p>
    </section>
  );
}

function SplitRowBar({ poll, row }: { poll: DecoratedPoll; row: PollSplitRow }) {
  const [a, b] = poll.sides;
  return (
    <div
      role="img"
      aria-label={`${row.label}: ${a.name} ${row.aPct} percent, ${b.name} ${row.bPct} percent`}
      className="flex h-2 w-full gap-[2px]"
    >
      <span
        className="rounded-[2px]"
        style={{ width: `${row.aPct}%`, background: a.color }}
      />
      <span
        className="rounded-[2px]"
        style={{ width: `${row.bPct}%`, background: b.color }}
      />
    </div>
  );
}
