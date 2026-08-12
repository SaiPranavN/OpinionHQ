import { Bar, Panel, SkeletonPage } from "@/components/ui/Skeleton";

/**
 * Shown the instant a poll link is clicked, while Postgres is asked.
 *
 * The tall block under the question stands in for the result panel — headline
 * percentage, split bar and tallies — which is the first thing a reader looks
 * for and the last thing that should jump into place.
 */
export default function Loading() {
  return (
    <SkeletonPage>
      <div className="flex flex-col gap-5">
        <Bar className="h-8 w-[200px] rounded-full" />
        <Bar className="h-[clamp(2rem,4.4vw,3.6rem)] w-full max-w-[560px]" />
        <Bar className="h-4 w-full max-w-[460px]" />
        <Panel className="h-[280px]" />
        <div className="flex flex-wrap gap-2.5">
          <Bar className="h-11 w-[170px] rounded-full" />
          <Bar className="h-11 w-[130px] rounded-full" />
        </div>
      </div>

      <Panel className="h-[260px]" />

      {/* Who voted: three cross-tab panels side by side. */}
      <div className="flex flex-wrap gap-[clamp(14px,1.6vw,20px)]">
        <Panel className="h-[220px] min-w-0 flex-[1_1_300px]" />
        <Panel className="h-[220px] min-w-0 flex-[1_1_300px]" />
        <Panel className="h-[220px] min-w-0 flex-[1_1_300px]" />
      </div>
    </SkeletonPage>
  );
}
