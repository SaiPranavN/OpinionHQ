import { Bar, Panel, SkeletonPage } from "@/components/ui/Skeleton";

/**
 * Shown the instant a topic link is clicked, while Postgres is asked.
 *
 * Mirrors `TopicDashboard`'s spine — breadcrumb, title, the stat row, then the
 * three-panel measurement band — so the real page lands into the same shape
 * rather than reflowing the screen under the reader.
 */
export default function Loading() {
  return (
    <SkeletonPage>
      <div className="flex flex-col gap-5">
        <Bar className="h-8 w-[220px] rounded-full" />
        <Bar className="h-[clamp(2rem,4.4vw,3.6rem)] w-full max-w-[620px]" />
        <Bar className="h-[clamp(2rem,4.4vw,3.6rem)] w-full max-w-[420px]" />
        <div className="flex flex-col gap-2">
          <Bar className="h-4 w-full max-w-[560px]" />
          <Bar className="h-4 w-full max-w-[480px]" />
        </div>
        <div className="flex flex-wrap gap-8 pt-2">
          <Bar className="h-12 w-[120px]" />
          <Bar className="h-12 w-[140px]" />
          <Bar className="ml-auto h-11 w-[280px] rounded-full" />
        </div>
      </div>

      {/* The measurement band: donut, trend, participation. */}
      <div className="flex flex-wrap gap-[clamp(14px,1.6vw,20px)]">
        <Panel className="h-[300px] min-w-0 flex-[1_1_300px]" />
        <Panel className="h-[300px] min-w-0 flex-[2_1_420px]" />
        <Panel className="h-[300px] min-w-0 flex-[1_1_320px]" />
      </div>

      <Panel className="h-[180px]" />
    </SkeletonPage>
  );
}
