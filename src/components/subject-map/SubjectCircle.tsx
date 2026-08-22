"use client";

/**
 * One subject, as a true circle on the map.
 *
 * MINIMAL BY RULE. A circle carries the title and, when there is room, the
 * summary — and nothing else. Category, place and status were tried inside
 * here and thrown out: they are set in small type across the widest chord of
 * the circle, which is exactly where a circular container has least room, so
 * they clipped through the circumference on any title long enough to matter.
 * The list view already carries the full record; the map is for finding a
 * subject, not for reading its metadata.
 *
 * NOTHING MAY CROSS THE CIRCUMFERENCE. All content lives inside an inscribed
 * square sized off the ring's inner radius (see `CONTENT_BOX`), which is a
 * geometric guarantee rather than a hopeful `max-width`.
 *
 * NO HOVER CHOREOGRAPHY. There is no hover scale, no tilt and no neighbour
 * repulsion. A circle that grows under the pointer changes what the pointer is
 * over, which makes the cursor flicker between states and the hit target move
 * out from under the press — the "pointer glitch". Hover now changes colour
 * only, which cannot move anything.
 *
 * Text is authored on a 2× content plane scaled to 0.5, so the smallest
 * caption is a 13px font being scaled rather than a 6.5px font being
 * rendered — that survives browser minimum-font-size settings and rasterises
 * cleanly at every zoom.
 */

import Link from "next/link";
import { memo } from "react";

import { DistributionRing } from "@/components/subject-map/DistributionRing";
import { fitFontSize, type DetailTier } from "@/lib/subject-map/camera";
import type { MapSubject } from "@/lib/subject-map/subjects";

/**
 * Side of the square that fits inside the ring, on the 2× content plane.
 *
 * The ring is drawn at r=68 with a 4-unit stroke on a 148 viewBox, so its
 * inner edge is r=66. An inscribed square there has side 66·√2 ≈ 93, doubled
 * for the 2× plane ≈ 187, less a little breathing room off the arc.
 */
const CONTENT_BOX = 182;

function SubjectCircleImpl({
  subject,
  tier,
  selected,
  dimmed,
  pulse,
  onSelect,
}: {
  subject: MapSubject;
  tier: DetailTier;
  selected: boolean;
  /** Another circle is selected — step back visually. */
  dimmed: boolean;
  pulse: boolean;
  onSelect: (id: string) => void;
}) {
  // A selected circle never renders below "medium": the first tap must show
  // the reader what they picked even before the camera flight lands.
  const t: DetailTier = selected && (tier === "dot" || tier === "small") ? "medium" : tier;

  const accent = subject.accent;
  const isPoll = subject.kind === "poll";
  const focusTone = isPoll ? "var(--color-poll)" : "var(--color-positive)";

  const surface = accent
    ? `radial-gradient(circle at 32% 26%, color-mix(in oklab, var(--color-veil) 8%, transparent), transparent 56%), radial-gradient(circle at 68% 80%, color-mix(in oklab, ${accent} 12%, transparent), transparent 72%), color-mix(in oklab, ${accent} 6%, var(--color-surface))`
    : `radial-gradient(circle at 32% 26%, color-mix(in oklab, var(--color-veil) 7%, transparent), transparent 56%), var(--color-surface)`;

  const depth = [
    // Edge reflection along the top of the sphere.
    "inset 0 1px 0 color-mix(in oklab, var(--color-veil) 9%, transparent)",
    // Faint inner shadow pooling at the bottom.
    "inset 0 -16px 26px -18px rgb(0 0 0 / 0.5)",
  ];
  // Glow is the expensive part — hundreds of blurred shadows at overview zoom
  // is a paint bill for something invisible at that size.
  if (accent && t !== "dot") {
    depth.push(
      `0 0 ${selected ? 52 : 36}px ${selected ? -10 : -16}px color-mix(in oklab, ${accent} ${selected ? 60 : 42}%, transparent)`,
    );
  }
  if (selected) {
    depth.push(`0 0 0 1.5px color-mix(in oklab, ${focusTone} 55%, transparent)`);
  }

  // The action sits inside the circle, low in the inscribed box, so the room
  // it needs is taken out of the text's box rather than hung off the bottom
  // edge where it would straddle the circumference.
  const showAction = selected && (t === "medium" || t === "large");

  return (
    <>
      <button
        type="button"
        aria-label={subject.aria}
        aria-pressed={selected}
        onClick={() => onSelect(subject.id)}
        /* `cursor-[inherit]`: the circle takes the map's grab/grabbing cursor
           rather than switching to a pointer, so sweeping across the cluster
           does not strobe the cursor. See the container in SubjectMap. */
        className={`group relative block h-full w-full cursor-[inherit] rounded-full border outline-none transition-[border-color,box-shadow] duration-200 after:absolute after:-inset-[8px] after:rounded-full after:content-[''] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
          isPoll ? "focus-visible:ring-poll/70" : "focus-visible:ring-positive/70"
        } ${selected ? "border-veil/25" : "border-veil/12 hover:border-veil/30"}`}
        style={{ background: surface, boxShadow: depth.join(", ") }}
      >
        {t !== "dot" ? (
          <DistributionRing
            segments={subject.segments}
            emphasis={dimmed ? 0.55 : 1}
            pulse={pulse}
          />
        ) : null}

        {/* The inscribed square. Nothing inside it can reach the ring. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 scale-50 flex-col items-center justify-center overflow-hidden text-center"
          style={{ width: CONTENT_BOX, height: CONTENT_BOX }}
        >
          {t === "dot" ? null : (
            <Content subject={subject} tier={t} reserveAction={showAction} />
          )}
        </span>
      </button>

      {/* The action, a sibling because a link cannot live inside a button —
          but positioned within the circle, not hanging off it. */}
      {showAction ? (
        <span
          className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 scale-50 justify-center"
          style={{ bottom: "17%", transformOrigin: "bottom center" }}
        >
          <Link
            href={subject.href}
            className={`ohq-press pointer-events-auto flex items-center gap-2 rounded-full border px-5 py-2 font-mono text-[13px] tracking-[0.1em] whitespace-nowrap uppercase outline-none focus-visible:ring-2 ${
              isPoll
                ? "border-poll/45 bg-poll/16 text-poll-soft hover:bg-poll/24 focus-visible:ring-poll/60"
                : "border-positive/45 bg-positive/16 text-positive-light hover:bg-positive/24 focus-visible:ring-positive/60"
            }`}
          >
            {subject.actionLabel}
            <span aria-hidden>→</span>
          </Link>
        </span>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- content */

/** First words of the title, cut at a word boundary — a hint, not an ellipsis. */
function fragment(title: string, budget: number): string {
  if (title.length <= budget) return title;
  const cut = title.slice(0, budget);
  const space = cut.lastIndexOf(" ");
  return space > 8 ? cut.slice(0, space) : cut;
}

function Content({
  subject,
  tier,
  reserveAction,
}: {
  subject: MapSubject;
  tier: DetailTier;
  reserveAction: boolean;
}) {
  // Room the action pill takes out of the text box when it is showing.
  const reserved = reserveAction ? 46 : 0;
  const boxHeight = CONTENT_BOX - reserved;

  if (tier === "small") {
    // Title only, and only as much of it as reads cleanly at this size.
    return (
      <span
        className="font-display leading-[1.16] font-semibold tracking-[-0.015em] text-balance text-cream"
        style={{
          fontSize: fitFontSize(subject.title.length, CONTENT_BOX, boxHeight, 20, 30),
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {fragment(subject.title, 44)}
      </span>
    );
  }

  if (tier === "medium") {
    return (
      <>
        <span
          className="font-display leading-[1.18] font-semibold tracking-[-0.015em] text-balance text-cream-bright"
          style={{
            fontSize: fitFontSize(subject.title.length, CONTENT_BOX, boxHeight * 0.72, 18, 28),
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {subject.title}
        </span>
        {subject.unvoted ? null : (
          <span className="mt-2 text-[14px] font-medium" style={{ color: subject.leadColor }}>
            {subject.leadLabel}
          </span>
        )}
        {reserveAction ? <span style={{ height: reserved }} /> : null}
      </>
    );
  }

  // Large / focused: the full title, never an ellipsis, plus the summary when
  // the title left room for one.
  const titleSize = fitFontSize(subject.title.length, CONTENT_BOX, boxHeight * 0.6, 13, 26);
  const roomForSummary = titleSize >= 18 && Boolean(subject.summary);

  return (
    <>
      <span
        className="font-display leading-[1.16] font-semibold tracking-[-0.018em] text-balance text-cream-bright"
        style={{ fontSize: titleSize }}
      >
        {subject.title}
      </span>
      {roomForSummary ? (
        <span
          className="mt-2 text-[13px] leading-[1.4] font-light text-muted"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {subject.summary}
        </span>
      ) : null}
      <span
        className="mt-2.5 text-[14px] font-medium"
        style={{ color: subject.unvoted ? "var(--color-dim)" : subject.leadColor }}
      >
        {subject.leadLabel}
      </span>
      {reserveAction ? <span style={{ height: reserved }} /> : null}
    </>
  );
}

/**
 * Memoised: the camera repaints at frame rate, but a circle only re-renders
 * when its tier, selection, dimming or data actually change.
 */
export const SubjectCircle = memo(SubjectCircleImpl);
