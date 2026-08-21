/**
 * Who is participating, on a topic.
 *
 * A thin adapter now. Everything that draws is in AudienceExplorer, which the
 * poll dashboard renders too — the two pages had four grey bar charts each,
 * built from different code, disagreeing about label widths and about whether a
 * segment's percentage was of everyone or of the people who answered that
 * question. There is one implementation and one answer to that now.
 *
 * WHAT THIS FILE STILL OWNS is the vocabulary: a topic splits three ways by
 * sentiment, in the site's sentiment colours, and calls its people
 * participants. A poll splits by option and calls them voters.
 */

import { AudienceExplorer } from "@/components/audience/AudienceExplorer";
import type { AudienceCell, AudienceSeries } from "@/lib/audience/cells";
import type { DecoratedTopic } from "@/lib/types";

/**
 * Aligned with `SENTIMENT_ORDER` in lib/audience/cells.ts, which is what the
 * cell counts are indexed by. Getting these out of step would recolour every
 * bar on the page without changing a number, which is the worst kind of wrong.
 */
const SENTIMENT_SERIES: AudienceSeries[] = [
  {
    id: "positive",
    label: "Positive",
    color: "var(--color-positive)",
    text: "var(--color-positive-light)",
  },
  {
    id: "neutral",
    label: "Neutral",
    color: "var(--color-neutral)",
    text: "var(--color-neutral)",
  },
  {
    id: "negative",
    label: "Negative",
    color: "var(--color-negative)",
    text: "var(--color-negative-light)",
  },
];

export function AudiencePanels({
  topic,
  cells,
}: {
  topic: DecoratedTopic;
  cells: AudienceCell[];
}) {
  // Breakdowns describe who voted. With nobody voting there is nothing to break
  // down, and the demographic caveats would be describing an empty sample.
  if (topic.unrated || cells.length === 0) {
    return (
      <section
        aria-label="Who is participating"
        className="ohq-panel flex flex-col gap-2 p-5 sm:p-7"
      >
        <span className="ohq-eyebrow">Who is participating</span>
        <p className="m-0 text-[13.5px] leading-[1.6] text-dim">
          Nobody has voted yet, so there is no audience to break down. Location,
          age and occupation splits appear once participants have shared them —
          and never for individuals.
        </p>
      </section>
    );
  }

  return (
    <AudienceExplorer
      cells={cells}
      series={SENTIMENT_SERIES}
      shape="donut"
      noun="participant"
      title="Demographic and geographic distribution"
      optIn={topic.demographicOptIn}
      participants={topic.participants}
      note={
        <>
          Location, age, occupation and gender are optional and self-declared.
          A voter is counted under the state their place sits in; somebody who
          set only a country appears in no state row, and “prefer not to say” is
          not counted as an answer.
        </>
      }
    />
  );
}
