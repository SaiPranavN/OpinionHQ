/**
 * The pictures on a contribution or a poll reason.
 *
 * THEY ARE BOUNDED, AND THE FIRST VERSION WAS NOT. It set `width: 100%` and
 * capped only the height, so a wide image stretched to the full width of the
 * card and stood 400px tall — a screenshot of a phone became the loudest thing
 * on a page whose subject is the argument. Every feed that carries user images
 * caps the *box*, not one dimension of it, for exactly this reason.
 *
 * So the box is capped on both axes and the image is fitted inside it:
 * `object-contain`, so nothing is cropped, and a picture that does not match
 * the box simply comes out smaller rather than being cut into. An illustration
 * should be legible at a glance and clickable if you want more, which is what
 * opening it in a new tab is for.
 *
 * PLAIN `<img>`, NOT `next/image`, and that is considered rather than lazy.
 * These are user uploads on a Supabase bucket: `next/image` would need the host
 * in `remotePatterns` and would put an unbounded, user-controlled number of
 * images through the optimiser, which is billed per source image on Vercel.
 * `loading="lazy"` and a reserved aspect ratio get the two things that matter.
 */

import type { ContributionMedia } from "@/lib/types";

/**
 * The cap, in CSS pixels.
 *
 * Roughly what a social feed gives a photo: wide enough to read a screenshot,
 * short enough that scrolling past three of them is not a journey. One image
 * gets the larger box; a set gets thumbnails, because four pictures at full
 * size is a gallery and this is a comment.
 */
const SINGLE = { width: 520, height: 360 };
const MANY = { width: 260, height: 180 };

export function MediaStrip({ media }: { media: ContributionMedia[] }) {
  if (media.length === 0) return null;

  const alone = media.length === 1;
  const box = alone ? SINGLE : MANY;

  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {media.map((item) => (
        <li
          key={item.id}
          className="m-0 overflow-hidden rounded-[12px] border border-veil/10 bg-veil/2"
          style={{ maxWidth: `min(100%, ${box.width}px)` }}
        >
          <a href={item.url} target="_blank" rel="noreferrer noopener" title="Open full size">
            {/* eslint-disable-next-line @next/next/no-img-element -- see the note above */}
            <img
              src={item.url}
              alt={item.alt || "Attached image"}
              loading="lazy"
              decoding="async"
              width={item.width ?? undefined}
              height={item.height ?? undefined}
              className="block h-auto w-auto max-w-full object-contain"
              style={{
                maxHeight: `${box.height}px`,
                // Reserved from the stored dimensions so the feed does not jump
                // as each file decodes. A picture whose size was not measurable
                // at upload falls back to 3:2 — wrong for some, stable for all.
                aspectRatio:
                  item.width && item.height ? `${item.width} / ${item.height}` : "3 / 2",
              }}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
