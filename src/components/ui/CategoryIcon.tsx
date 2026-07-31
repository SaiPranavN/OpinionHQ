import type { CategoryId } from "@/lib/types";

/**
 * One restrained line glyph per topic type. Inline SVG rather than image
 * assets so cards stay analytical, load instantly and never 404.
 */
const PATHS: Record<CategoryId, React.ReactNode> = {
  entertainment: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M8 5v4M16 5v4" />
      <path d="M11 12.5v4l3.5-2z" />
    </>
  ),
  brands: (
    <>
      <path d="M4 8.5 6 4h12l2 4.5" />
      <path d="M4 8.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M9.5 12a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  sports: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 20h6" />
    </>
  ),
  technology: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
    </>
  ),
  events: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </>
  ),
  "national-politics": (
    <>
      <path d="M4 20h16M6 20v-8M10 20v-8M14 20v-8M18 20v-8" />
      <path d="M3 12l9-6 9 6" />
    </>
  ),
  policies: (
    <>
      <path d="M6 3h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  politicians: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  colleges: (
    <>
      <path d="M2 9l10-4 10 4-10 4z" />
      <path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </>
  ),
  exams: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.8h6V4" />
      <path d="M9 11l2 2 4-4" />
      <path d="M9 17h6" />
    </>
  ),
  careers: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3 12h18" />
    </>
  ),
  food: (
    <>
      <path d="M4 3v7a2.5 2.5 0 0 0 5 0V3" />
      <path d="M6.5 3v7M6.5 12.5V21" />
      <path d="M17.5 21v-7.5c2 0 2.5-1.6 2.5-4.5S19 3.5 17.5 3.5 15 6 15 9s.5 4.5 2.5 4.5" />
    </>
  ),
  other: (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <path d="M9.6 9.2a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4" />
      <path d="M12 16.6v.1" />
    </>
  ),
  controversies: (
    <>
      <path d="M12 4L2.5 20h19z" />
      <path d="M12 10v4M12 17.2v.1" />
    </>
  ),
};

export function CategoryIcon({
  category,
  size = 18,
  className,
}: {
  category: CategoryId;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[category]}
    </svg>
  );
}
