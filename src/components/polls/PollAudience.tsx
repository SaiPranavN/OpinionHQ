/**
 * Who voted, on a poll.
 *
 * A thin adapter, the counterpart to components/topic/AudiencePanels.tsx.
 * Everything that draws is in AudienceExplorer; this file only says what a
 * poll's series are — its own options, in their own colours — and what its
 * people are called.
 *
 * TWO THINGS MOVED HERE FROM THE OLD PANEL. Gender is now a cross-tab like the
 * others rather than absent, because a poll's audience has one; and "against the
 * grain" is recomputed inside whatever is filtered instead of being a fixed
 * property of the whole poll, so filtering to one state can surface the group
 * that flips *within* it. The old static `poll.contrarian` is still derived and
 * still used by the export, which has no filter to respect.
 */

import { AudienceExplorer } from "@/components/audience/AudienceExplorer";
import { Brand } from "@/components/ui/Brand";
import type { AudienceCell, AudienceSeries } from "@/lib/audience/cells";
import type { DecoratedPoll } from "@/lib/types";

export function PollAudience({
  poll,
  cells,
}: {
  poll: DecoratedPoll;
  cells: AudienceCell[];
}) {
  // Nobody has voted, so there is no audience — the only case left now that the
  // ten-vote reporting threshold is gone.
  if (poll.unvoted || cells.length === 0) {
    return (
      <section aria-label="Who voted" className="ohq-panel flex flex-col gap-2 p-5 sm:p-7">
        <span className="ohq-eyebrow">Who voted</span>
        <p className="m-0 text-[13.5px] leading-[1.6] text-dim">
          Nobody has voted yet, so there is no audience to break down. The cross-tabs
          appear as soon as somebody does.
        </p>
      </section>
    );
  }

  // Index order is slot order, which is what `pollCells` indexes the counts by.
  const series: AudienceSeries[] = poll.options.map((option) => ({
    id: option.id,
    label: option.name,
    color: option.color,
    text: option.textColor,
  }));

  return (
    <AudienceExplorer
      cells={cells}
      series={series}
      shape="bar"
      noun="voter"
      title="Who voted, and where the split flips"
      optIn={poll.demographicOptIn}
      participants={poll.total}
      note={
        <>
          Location, age, occupation and gender are optional and self-declared.
          Segments are only ever shown as percentages of that segment, never as
          individuals, and every figure here describes <Brand /> participants
          rather than the public.
        </>
      }
    />
  );
}
