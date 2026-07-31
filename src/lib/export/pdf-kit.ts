/**
 * Shared PDF primitives for the report exports.
 *
 * Both the topic report and the poll report draw the same dark-theme A4 page
 * with vector primitives, rather than rasterising the DOM: it stays crisp at
 * any zoom, the numbers stay selectable, and it does not depend on a
 * screenshot library being able to parse Tailwind v4's oklch colours.
 */

export type Doc = import("jspdf").jsPDF;

/* ------------------------------------------------------------------ theme */

export const INK = "#0A0A0A";
export const PANEL = "#131313";
export const LINE = "#242424";
export const CREAM = "#F7F5F1";
export const SOFT = "#D6D3CD";
export const MUTED = "#A1A1A1";
export const DIM = "#8F8C86";
export const POSITIVE = "#1DB954";
export const POSITIVE_LIGHT = "#4ED27C";
export const NEUTRAL = "#9BA1A6";
export const NEGATIVE = "#E5484D";
export const VIOLET = "#A78BFA";
export const CAUTION = "#F0A83C";

/* A4 portrait in points. */
export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const MARGIN = 40;
export const CONTENT_W = PAGE_W - MARGIN * 2;
/** The footer rule sits at PAGE_H - 40, so content may run to just above it. */
export const FOOTER_SPACE = 46;

export function rgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [
    Number.parseInt(v.slice(0, 2), 16),
    Number.parseInt(v.slice(2, 4), 16),
    Number.parseInt(v.slice(4, 6), 16),
  ];
}

/* ----------------------------------------------------------------- layout */

/** Mutable layout cursor threaded through the section renderers. */
export interface Ctx {
  doc: Doc;
  y: number;
  page: number;
  /** Repeated at the top of continuation pages so context is never lost. */
  runningTitle: string;
}

export function paintBackground(doc: Doc) {
  doc.setFillColor(...rgb(INK));
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

export function newPage(ctx: Ctx) {
  ctx.doc.addPage();
  ctx.page += 1;
  paintBackground(ctx.doc);

  text(ctx.doc, ctx.runningTitle, MARGIN, MARGIN, { size: 7.5, color: DIM });
  text(ctx.doc, "OPINIONHQ REPORT", PAGE_W - MARGIN, MARGIN, {
    size: 6.5,
    color: DIM,
    bold: true,
    align: "right",
  });
  ctx.doc.setDrawColor(...rgb(LINE));
  ctx.doc.setLineWidth(0.6);
  ctx.doc.line(MARGIN, MARGIN + 8, PAGE_W - MARGIN, MARGIN + 8);

  ctx.y = MARGIN + 24;
}

/** Starts a new page when `needed` points would not fit above the footer. */
export function ensure(ctx: Ctx, needed: number) {
  if (ctx.y + needed > PAGE_H - FOOTER_SPACE) newPage(ctx);
}

/* -------------------------------------------------------------- type & fill */

export function text(
  doc: Doc,
  value: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    color?: string;
    bold?: boolean;
    align?: "left" | "center" | "right";
  } = {},
) {
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(opts.size ?? 9);
  doc.setTextColor(...rgb(opts.color ?? MUTED));
  doc.text(value, x, y, { align: opts.align ?? "left" });
}

/** Wrapped paragraph. Returns the y position of the last line. */
export function paragraph(
  doc: Doc,
  value: string,
  x: number,
  y: number,
  width: number,
  opts: { size?: number; color?: string; leading?: number; bold?: boolean } = {},
): number {
  const size = opts.size ?? 9;
  const leading = opts.leading ?? size * 1.45;
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...rgb(opts.color ?? MUTED));
  const lines = doc.splitTextToSize(value, width) as string[];
  lines.forEach((line, i) => doc.text(line, x, y + i * leading));
  return y + (lines.length - 1) * leading;
}

/** Number of lines `value` will wrap to at the given size and width. */
export function lineCount(doc: Doc, value: string, width: number, size: number): number {
  doc.setFontSize(size);
  return (doc.splitTextToSize(value, width) as string[]).length;
}

export function panel(doc: Doc, x: number, y: number, w: number, h: number) {
  doc.setFillColor(...rgb(PANEL));
  doc.setDrawColor(...rgb(LINE));
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 6, 6, "FD");
}

export function eyebrow(doc: Doc, value: string, x: number, y: number) {
  text(doc, value.toUpperCase(), x, y, { size: 7, color: DIM, bold: true });
}

export function sectionHeading(ctx: Ctx, title: string) {
  ensure(ctx, 54);
  ctx.y += 10;
  text(ctx.doc, title, MARGIN, ctx.y + 10, { size: 13, bold: true, color: CREAM });
  ctx.y += 26;
}

/* ------------------------------------------------------------------ charts */

export function polyline(
  doc: Doc,
  points: { x: number; y: number }[],
  color: string,
  width: number,
) {
  doc.setDrawColor(...rgb(color));
  doc.setLineWidth(width);
  doc.setLineCap("round");
  doc.setLineJoin("round");
  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1]!.x, points[i - 1]!.y, points[i]!.x, points[i]!.y);
  }
}

/**
 * One segment of a donut ring, as a filled annular sector.
 *
 * jsPDF has no arc primitive. Stroking a thick arc out of short chords leaves
 * wedge-shaped gaps on the outer edge (visible as radial striping), and round
 * caps overshoot by half the stroke width. Filling the sector avoids both.
 */
export function ringSegment(
  doc: Doc,
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
  startDeg: number,
  sweepDeg: number,
  color: string,
) {
  if (sweepDeg <= 0) return;
  const outerR = radius + thickness / 2;
  const innerR = radius - thickness / 2;
  const steps = Math.max(3, Math.ceil(sweepDeg / 3));
  const rad = (deg: number) => (deg * Math.PI) / 180;

  const path: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = rad(startDeg + (sweepDeg * i) / steps);
    path.push([cx + outerR * Math.cos(a), cy + outerR * Math.sin(a)]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = rad(startDeg + (sweepDeg * i) / steps);
    path.push([cx + innerR * Math.cos(a), cy + innerR * Math.sin(a)]);
  }

  // `lines` walks relative deltas from the starting point.
  const deltas = path
    .slice(1)
    .map((p, i) => [p[0] - path[i]![0], p[1] - path[i]![1]] as [number, number]);

  doc.setFillColor(...rgb(color));
  doc.lines(deltas, path[0]![0], path[0]![1], [1, 1], "F", true);
}

/** Label · value row with a proportional track behind the value. */
export function distributionRow(
  doc: Doc,
  label: string,
  pct: number,
  count: string,
  x: number,
  y: number,
  w: number,
) {
  const labelW = w * 0.42;
  const trackX = x + labelW;
  const trackW = w * 0.32;
  text(doc, label, x, y, { size: 8, color: SOFT });
  doc.setFillColor(...rgb(LINE));
  doc.roundedRect(trackX, y - 5, trackW, 5, 2.5, 2.5, "F");
  doc.setFillColor(...rgb("#4A4A4A"));
  doc.roundedRect(trackX, y - 5, Math.max((pct / 100) * trackW, 2), 5, 2.5, 2.5, "F");
  text(doc, `${pct}%  ·  ${count}`, x + w, y, { size: 8, color: MUTED, align: "right" });
}

/* ----------------------------------------------------------------- footers */

/** Sample caveat and page number on every page (brief §5.5). */
export function footers(doc: Doc, caveat: string, pages: number) {
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...rgb(LINE));
    doc.setLineWidth(0.6);
    doc.line(MARGIN, PAGE_H - 40, PAGE_W - MARGIN, PAGE_H - 40);

    paragraph(doc, caveat, MARGIN, PAGE_H - 28, CONTENT_W - 60, {
      size: 6.5,
      color: DIM,
      leading: 8.5,
    });
    text(doc, `${page} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 24, {
      size: 7,
      color: DIM,
      align: "right",
    });
  }
}

/** Standard report header band with the wordmark and a generated timestamp. */
export function reportHeader(doc: Doc) {
  doc.setFillColor(...rgb("#101010"));
  doc.rect(0, 0, PAGE_W, 46, "F");
  doc.setDrawColor(...rgb(LINE));
  doc.setLineWidth(0.6);
  doc.line(0, 46, PAGE_W, 46);

  text(doc, "Opinion", MARGIN, 28, { size: 13, bold: true, color: CREAM });
  const wordmarkW = doc.getTextWidth("Opinion");
  text(doc, "HQ", MARGIN + wordmarkW, 28, { size: 13, bold: true, color: POSITIVE });

  text(doc, "OPINION REPORT", PAGE_W - MARGIN, 22, {
    size: 6.5,
    color: DIM,
    align: "right",
    bold: true,
  });
  text(
    doc,
    new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    PAGE_W - MARGIN,
    33,
    { size: 7.5, color: MUTED, align: "right" },
  );
}
