import { Bar, Panel } from "@/components/ui/Skeleton";

/** The polls catalog, while the rows are read. */
export default function Loading() {
  return (
    <div aria-hidden style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <div className="mx-auto max-w-[1440px] animate-pulse px-4 pt-7 sm:px-8 lg:px-14">
        <Bar className="h-8 w-[200px] rounded-full" />
        <Bar className="mt-4 h-[clamp(2rem,4vw,3.1rem)] w-full max-w-[440px]" />
        <Bar className="mt-3 h-4 w-full max-w-[520px]" />

        <div className="mt-6 flex flex-wrap gap-3">
          <Bar className="h-12 w-full max-w-[560px] rounded-full sm:flex-1" />
          <Bar className="h-11 w-[180px] rounded-full" />
          <Bar className="h-11 w-[160px] rounded-full" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Bar key={i} className="h-9 w-[130px] rounded-full" />
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Panel key={i} className="h-[260px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
