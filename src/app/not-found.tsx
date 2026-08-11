import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
      <p className="ohq-eyebrow m-0">404</p>
      <h1 className="m-0 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-none font-bold tracking-[-0.025em] text-cream-bright">
        No topic <em>here.</em>
      </h1>
      <p className="m-0 max-w-[420px] text-[15px] leading-[1.6] font-light text-muted">
        Topics are published by editors in curated batches. This one either has not
        been created yet or was removed.
      </p>
      <Link
        href="/topics"
        className="rounded-full bg-positive px-7 py-3.5 text-[15px] font-semibold text-positive-ink transition-colors duration-300 hover:bg-[#25CC61]"
      >
        Browse the catalog
      </Link>
    </div>
  );
}
