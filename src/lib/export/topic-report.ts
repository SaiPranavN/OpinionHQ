/**
 * PDF export of a topic dashboard.
 *
 * The charts are redrawn with vector primitives from the same derived values
 * the screen uses, rather than rasterising the DOM. That keeps the output
 * crisp at any zoom, keeps the numbers selectable and searchable, and avoids
 * depending on a screenshot library being able to parse Tailwind v4's oklch
 * colours — which the common ones cannot.
 *
 * jsPDF is imported dynamically so it never lands in the main bundle; the
 * export button is the only thing that pulls it in.
 */

import { formatNumber, trendPoints, TREND_VIEWBOX } from "@/lib/derive";
import {
  CONTENT_W,
  CREAM,
  Ctx,
  DIM,
  Doc,
  INK,
  distributionRow,
  ensure,
  eyebrow,
  footers,
  LINE,
  MARGIN,
  MUTED,
  NEGATIVE,
  NEUTRAL,
  paintBackground,
  panel,
  paragraph,
  POSITIVE,
  reportHeader,
  ringSegment,
  rgb,
  sectionHeading,
  SOFT,
  text,
  polyline,
} from "@/lib/export/pdf-kit";
import { statusStyle } from "@/lib/taxonomy";
import type { DecoratedTopic, TopicContext, TimelineEvent } from "@/lib/types";

/* ----------------------------------------------------------------- charts */


function donut(doc: Doc, topic: DecoratedTopic, cx: number, cy: number, r: number) {
  const thickness = 15;

  if (topic.unrated) {
    ringSegment(doc, cx, cy, r, thickness, 0, 360, LINE);
    text(doc, "No votes", cx, cy + 1, { size: 10, color: DIM, align: "center", bold: true });
    return;
  }

  // Same order as the dashboard donut: negative from the top, clockwise.
  const segments = [
    { pct: topic.neg, color: NEGATIVE },
    { pct: topic.neu, color: NEUTRAL },
    { pct: topic.pos, color: POSITIVE },
  ];

  let cursor = -90;
  for (const segment of segments) {
    const sweep = (segment.pct / 100) * 360;
    // A 2° gap keeps adjacent segments legible, as on screen.
    ringSegment(doc, cx, cy, r, thickness, cursor + 1, Math.max(sweep - 2, 0), segment.color);
    cursor += sweep;
  }

  text(doc, `${topic.dominantPct}%`, cx, cy + 2, {
    size: 19,
    bold: true,
    align: "center",
    color: topic.dominantColor,
  });
  text(doc, String(topic.dominant), cx, cy + 14, {
    size: 7.5,
    align: "center",
    color: topic.dominantColor,
  });
}


function trendChart(
  doc: Doc,
  topic: DecoratedTopic,
  markers: TopicContext["markers"],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const sx = w / TREND_VIEWBOX.width;
  const sy = h / TREND_VIEWBOX.height;
  const project = (p: { x: number; y: number }) => ({ x: x + p.x * sx, y: y + p.y * sy });

  // Horizontal gridlines, matching the on-screen chart.
  doc.setDrawColor(...rgb(LINE));
  doc.setLineWidth(0.5);
  for (const gy of [40, 90, 140, 190, 240]) {
    doc.line(x, y + gy * sy, x + w, y + gy * sy);
  }

  // One dashed guide per verified development, at the date it happened.
  markers.forEach((marker) => {
    const pct = Number.parseFloat(marker.left);
    if (!Number.isFinite(pct)) return;
    const mx = x + (pct / 100) * w;
    doc.setDrawColor(29, 185, 84);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 3], 0);
    doc.line(mx, y, mx, y + 240 * sy);
    doc.setLineDashPattern([], 0);
  });

  polyline(doc, trendPoints(Math.max(topic.neg - 34, 6), topic.neg).map(project), NEGATIVE, 1.6);
  polyline(
    doc,
    trendPoints(Math.min(topic.pos + 22, 94), topic.pos).map(project),
    POSITIVE,
    1.6,
  );

  // Numbered pins, keyed to the list printed underneath.
  markers.forEach((marker, i) => {
    const pct = Number.parseFloat(marker.left);
    if (!Number.isFinite(pct)) return;
    const mx = x + (pct / 100) * w;
    doc.setFillColor(...rgb(INK));
    doc.setDrawColor(29, 185, 84);
    doc.setLineWidth(0.6);
    doc.circle(mx, y, 6, "FD");
    text(doc, String(i + 1), mx, y + 2.2, { size: 6.5, color: "#4ED27C", align: "center" });
  });

  const axis = ["30d ago", "22d", "15d", "7d", "Today"];
  axis.forEach((label, i) => {
    const px = x + (i / (axis.length - 1)) * w;
    text(doc, label, px, y + h + 10, {
      size: 6.5,
      color: DIM,
      align: i === 0 ? "left" : i === axis.length - 1 ? "right" : "center",
    });
  });
}

function participationChart(
  doc: Doc,
  topic: DecoratedTopic,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (topic.unrated) {
    text(doc, "No participation recorded yet.", x, y + h / 2, { size: 8, color: DIM });
    return;
  }
  const bars = topic.participationBars;
  const gap = 1.6;
  const barW = (w - gap * (bars.length - 1)) / bars.length;
  doc.setFillColor(...rgb(POSITIVE));
  bars.forEach((value, i) => {
    const bh = Math.max((value / 100) * h, 1);
    doc.rect(x + i * (barW + gap), y + h - bh, barW, bh, "F");
  });
}

function sentimentBar(
  doc: Doc,
  topic: DecoratedTopic,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (topic.unrated) {
    doc.setFillColor(...rgb(LINE));
    doc.rect(x, y, w, h, "F");
    return;
  }
  const gap = 1.5;
  const segments = [
    { pct: topic.pos, color: POSITIVE },
    { pct: topic.neu, color: NEUTRAL },
    { pct: topic.neg, color: NEGATIVE },
  ];
  let cursor = x;
  segments.forEach((segment) => {
    const sw = (segment.pct / 100) * w;
    doc.setFillColor(...rgb(segment.color));
    doc.rect(cursor, y, Math.max(sw - gap, 0), h, "F");
    cursor += sw;
  });
}


/* --------------------------------------------------------------- sections */

function header(ctx: Ctx, topic: DecoratedTopic, context: TopicContext) {
  const { doc } = ctx;

  reportHeader(doc);
  ctx.y = 78;

  const status = statusStyle(topic.status);
  text(
    doc,
    `${topic.category.label.toUpperCase()}   ·   ${topic.status.toUpperCase()}`,
    MARGIN,
    ctx.y,
    { size: 7, bold: true, color: status.fg },
  );

  ctx.y += 22;
  ctx.y = paragraph(doc, topic.name, MARGIN, ctx.y, CONTENT_W, {
    size: 21,
    bold: true,
    color: CREAM,
    leading: 25,
  });

  ctx.y += 18;
  ctx.y = paragraph(doc, topic.summary, MARGIN, ctx.y, CONTENT_W, {
    size: 9.5,
    color: SOFT,
    leading: 13.5,
  });

  ctx.y += 15;
  ctx.y = paragraph(doc, topic.about, MARGIN, ctx.y, CONTENT_W, {
    size: 8.5,
    color: MUTED,
    leading: 12.5,
  });

  ctx.y += 16;
  panel(ctx.doc, MARGIN, ctx.y - 9, CONTENT_W, 30);
  text(doc, "STATUS", MARGIN + 10, ctx.y + 5, { size: 6.5, bold: true, color: "#4ED27C" });
  paragraph(doc, context.explain, MARGIN + 48, ctx.y + 5, CONTENT_W - 60, {
    size: 8,
    color: SOFT,
    leading: 10,
  });
  ctx.y += 40;
}

function headlineStats(ctx: Ctx, topic: DecoratedTopic) {
  const { doc } = ctx;
  ensure(ctx, 130);

  panel(doc, MARGIN, ctx.y, CONTENT_W, 108);
  const innerX = MARGIN + 16;
  let y = ctx.y + 24;

  text(doc, topic.headlineMetric, innerX, y, {
    size: 20,
    bold: true,
    color: topic.dominantColor,
  });

  // Sample size carries the credibility of every other number here.
  text(doc, formatNumber(topic.participants), MARGIN + CONTENT_W - 16, y, {
    size: 20,
    bold: true,
    color: POSITIVE,
    align: "right",
  });
  text(
    doc,
    topic.participants === 1 ? "participant" : "participants",
    MARGIN + CONTENT_W - 16,
    y + 11,
    { size: 7.5, color: MUTED, align: "right" },
  );

  y += 22;
  sentimentBar(doc, topic, innerX, y, CONTENT_W - 32, 6);

  y += 18;
  text(doc, topic.sentimentLabel, innerX, y, { size: 8, color: MUTED });

  y += 20;
  const kpis: [string, string][] = [
    ["Written opinions", formatNumber(topic.writtenCount)],
    ["Polarization", `${Math.round(topic.polarization)}/100`],
    ["7-day change", topic.changeLabel],
  ];
  const colW = (CONTENT_W - 32) / 3;
  kpis.forEach(([label, value], i) => {
    const x = innerX + i * colW;
    text(doc, label.toUpperCase(), x, y, { size: 6.5, bold: true, color: DIM });
    paragraph(doc, value, x, y + 11, colW - 12, { size: 8.5, color: SOFT, leading: 10 });
  });

  ctx.y += 122;
}

function charts(ctx: Ctx, topic: DecoratedTopic, context: TopicContext) {
  const { doc } = ctx;

  /* Distribution + trend, side by side. */
  ensure(ctx, 190);
  const donutW = 168;
  const trendW = CONTENT_W - donutW - 12;

  panel(doc, MARGIN, ctx.y, donutW, 176);
  eyebrow(doc, "Sentiment distribution", MARGIN + 14, ctx.y + 18);
  donut(doc, topic, MARGIN + donutW / 2, ctx.y + 72, 36);

  let legendY = ctx.y + 122;
  const rows: [string, number, number, string][] = [
    ["Positive", topic.pos, topic.posCount, POSITIVE],
    ["Neutral", topic.neu, topic.neuCount, NEUTRAL],
    ["Negative", topic.neg, topic.negCount, NEGATIVE],
  ];
  rows.forEach(([label, pct, count, color]) => {
    doc.setFillColor(...rgb(color));
    doc.rect(MARGIN + 14, legendY - 4.5, 5, 5, "F");
    text(doc, label, MARGIN + 24, legendY, { size: 8, color: SOFT });
    text(
      doc,
      topic.unrated ? "—" : `${pct}%  ·  ${formatNumber(count)}`,
      MARGIN + donutW - 14,
      legendY,
      { size: 8, color: MUTED, align: "right" },
    );
    legendY += 14;
  });

  const trendX = MARGIN + donutW + 12;
  panel(doc, trendX, ctx.y, trendW, 176);
  eyebrow(doc, "Sentiment trend · last 30 days", trendX + 14, ctx.y + 18);

  if (topic.unrated) {
    paragraph(doc, "No trend to plot yet — this topic has no votes.", trendX + 14, ctx.y + 40, trendW - 28, {
      size: 8,
      color: DIM,
    });
  } else {
    trendChart(doc, topic, context.markers, trendX + 16, ctx.y + 40, trendW - 32, 92);
    let keyY = ctx.y + 152;
    context.markers.slice(0, 3).forEach((marker, i) => {
      text(doc, `${i + 1}`, trendX + 16, keyY, { size: 6.5, color: "#4ED27C" });
      text(doc, marker.label, trendX + 26, keyY, { size: 7.5, color: MUTED });
      keyY += 10;
    });
  }

  ctx.y += 190;

  /* Daily participation. */
  ensure(ctx, 110);
  panel(doc, MARGIN, ctx.y, CONTENT_W, 96);
  eyebrow(doc, "Daily participants · 30 days", MARGIN + 14, ctx.y + 18);
  participationChart(doc, topic, MARGIN + 16, ctx.y + 28, CONTENT_W - 32, 54);
  ctx.y += 110;
}

function aspects(ctx: Ctx, topic: DecoratedTopic) {
  if (topic.facets.length === 0) return;
  const { doc } = ctx;

  sectionHeading(ctx, "Aspects");
  ctx.y -= 10;
  ctx.y = paragraph(
    doc,
    "Sub-opinions under the headline vote, written for this topic. Shares are of the people who answered that aspect.",
    MARGIN,
    ctx.y + 10,
    CONTENT_W,
    { size: 8, color: DIM, leading: 10.5 },
  );
  ctx.y += 16;

  for (const result of topic.facets) {
    ensure(ctx, 60);
    panel(doc, MARGIN, ctx.y, CONTENT_W, 54);
    const x = MARGIN + 14;

    text(doc, result.facet.label, x, ctx.y + 17, { size: 9.5, bold: true, color: CREAM });
    text(
      doc,
      result.responses > 0 ? `${formatNumber(result.responses)} answered` : "no answers yet",
      MARGIN + CONTENT_W - 14,
      ctx.y + 17,
      { size: 7.5, color: DIM, align: "right" },
    );
    text(doc, result.facet.prompt, x, ctx.y + 27, { size: 8, color: MUTED });

    // Stacked share bar, then each option spelled out beneath it.
    const barY = ctx.y + 33;
    const barW = CONTENT_W - 28;
    if (result.responses > 0) {
      let cursor = x;
      result.tallies.forEach((tally) => {
        const w = (tally.pct / 100) * barW;
        doc.setFillColor(
          ...rgb(
            tally.tone === "Positive"
              ? POSITIVE
              : tally.tone === "Negative"
                ? NEGATIVE
                : NEUTRAL,
          ),
        );
        doc.rect(cursor, barY, Math.max(w - 1.5, 0), 4, "F");
        cursor += w;
      });
    } else {
      doc.setFillColor(...rgb(LINE));
      doc.rect(x, barY, barW, 4, "F");
    }

    const colW = barW / 3;
    result.tallies.forEach((tally, i) => {
      const cx = x + i * colW;
      doc.setFillColor(
        ...rgb(
          tally.tone === "Positive" ? POSITIVE : tally.tone === "Negative" ? NEGATIVE : NEUTRAL,
        ),
      );
      doc.rect(cx, barY + 11, 4, 4, "F");
      text(
        doc,
        `${tally.label}  ${result.responses > 0 ? `${tally.pct}%` : "—"}`,
        cx + 8,
        barY + 15,
        { size: 7.5, color: SOFT },
      );
    });

    ctx.y += 60;
  }
}

function audience(ctx: Ctx, topic: DecoratedTopic) {
  if (topic.unrated) return;
  const { doc } = ctx;

  sectionHeading(ctx, "Who is participating");

  const blocks: [string, { label: string; pct: number; count: number }[]][] = [
    ["Where participants are voting from", topic.geo],
    ["Age group", topic.ageGroups],
    ["Occupation", topic.occupations],
  ];

  for (const [title, rows] of blocks) {
    const height = 34 + rows.length * 14;
    ensure(ctx, height + 12);
    panel(doc, MARGIN, ctx.y, CONTENT_W, height);
    eyebrow(doc, title, MARGIN + 14, ctx.y + 18);
    let y = ctx.y + 36;
    for (const row of rows) {
      distributionRow(doc, row.label, row.pct, formatNumber(row.count), MARGIN + 14, y, CONTENT_W - 28);
      y += 14;
    }
    ctx.y += height + 12;
  }

  ensure(ctx, 30);
  ctx.y = paragraph(
    doc,
    `Location, age and occupation are optional and self-declared, shared by ${topic.demographicOptIn}% of participants. They are only ever reported as aggregate percentages.`,
    MARGIN,
    ctx.y + 8,
    CONTENT_W,
    { size: 7.5, color: DIM, leading: 10 },
  );
  ctx.y += 18;
}

function developments(ctx: Ctx, timeline: TimelineEvent[]) {
  if (timeline.length === 0) return;
  const { doc } = ctx;

  sectionHeading(ctx, "Verified developments");

  for (const event of timeline) {
    // Measure the wrapped block before committing to it, so a long entry is
    // never split across a page break or stranded alone on the next one.
    doc.setFontSize(9);
    const titleLines = (doc.splitTextToSize(event.title, CONTENT_W) as string[]).length;
    doc.setFontSize(8);
    const descLines = (doc.splitTextToSize(event.desc, CONTENT_W) as string[]).length;
    ensure(ctx, 12 + titleLines * 11 + 11 + descLines * 10.5 + 16);

    text(doc, event.date, MARGIN, ctx.y, { size: 7.5, color: "#4ED27C", bold: true });
    text(doc, `Source: ${event.src}`, MARGIN + CONTENT_W, ctx.y, {
      size: 7,
      color: DIM,
      align: "right",
    });
    ctx.y = paragraph(doc, event.title, MARGIN, ctx.y + 12, CONTENT_W, {
      size: 9,
      bold: true,
      color: SOFT,
      leading: 11,
    });
    ctx.y = paragraph(doc, event.desc, MARGIN, ctx.y + 11, CONTENT_W, {
      size: 8,
      color: MUTED,
      leading: 10.5,
    });
    ctx.y += 16;
  }
}

/* -------------------------------------------------------------- entry point */

export interface TopicReportInput {
  topic: DecoratedTopic;
  context: TopicContext;
  timeline: TimelineEvent[];
}

export function reportFilename(topic: DecoratedTopic): string {
  return `opinionhq-${topic.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

/**
 * Builds the document without touching the DOM, so it can be rendered and
 * inspected outside a browser.
 */
export async function buildTopicReport({
  topic,
  context,
  timeline,
}: TopicReportInput): Promise<Doc> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setProperties({
    title: `${topic.name} — OpinionHQ report`,
    subject: `${topic.headlineMetric} ${topic.sampleLabel}`,
    creator: "OpinionHQ (prototype)",
  });

  paintBackground(doc);
  const ctx: Ctx = {
    doc,
    y: MARGIN,
    page: 1,
    runningTitle: `${topic.name} · ${topic.category.label}`,
  };

  header(ctx, topic, context);
  headlineStats(ctx, topic);
  charts(ctx, topic, context);
  aspects(ctx, topic);
  audience(ctx, topic);
  developments(ctx, timeline);

  footers(
    doc,
    `All figures describe ${topic.unrated ? "OpinionHQ participants" : `the ${formatNumber(topic.participants)} OpinionHQ participants who voted on this topic`} — a self-selected sample, not a representative poll of the public. Prototype sample data.`,
    ctx.page,
  );
  return doc;
}

/** Builds the report and triggers a download. Returns the filename used. */
export async function exportTopicReport(input: TopicReportInput): Promise<string> {
  const doc = await buildTopicReport(input);
  const filename = reportFilename(input.topic);
  doc.save(filename);
  return filename;
}
