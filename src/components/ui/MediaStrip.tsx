/**
 * The pictures on a contribution or a poll reason.
 *
 * PLAIN `<img>`, NOT `next/image`, and that is a considered choice rather than
 * an oversight. These are user uploads on a Supabase bucket: `next/image` would
 * need the host in `remotePatterns` and would proxy every one of them through
 * the optimiser, which on Vercel is billed per source image and would put an
 * unbounded, user-controlled number of them through it. `loading="lazy"` and a
 * reserved aspect ratio get the two things that actually matter here.
 *
 * The box is reserved from the stored dimensions so the feed does not jump as
 * each file decodes. A picture whose size was not measurable at upload falls
 * back to 3:2, which is wrong for some images and stable for all of them.
 */

import type { ContributionMedia } from "@/lib/types";

export function MediaStrip({ media }: { media: ContributionMedia[] }) {
  if (media.length === 0) return null;

  return (
    <ul
      className="m-0 grid list-none gap-2 p-0"
      style={{
        gridTemplateColumns: media.length === 1 ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {media.map((item) => (
        <li key={item.id} className="m-0 overflow-hidden rounded-[12px] border border-veil/10">
          {/* eslint-disable-next-line @next/next/no-img-element -- see the note above */}
          <img
            src={item.url}
            alt={item.alt || "Attached image"}
            loading="lazy"
            decoding="async"
            width={item.width ?? undefined}
            height={item.height ?? undefined}
            className="block h-auto w-full object-cover"
            style={{
              aspectRatio:
                item.width && item.height ? `${item.width} / ${item.height}` : "3 / 2",
              maxHeight: media.length === 1 ? "460px" : "260px",
            }}
          />
        </li>
      ))}
    </ul>
  );
}
