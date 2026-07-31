/**
 * PDF export of a poll result.
 *
 * Built on the same vector kit as the topic report. The shape differs because
 * a poll is a different object: one split rather than a distribution, cross-tabs
 * rather than a trend, and written reasons in two columns rather than a thread.
 */

import { formatNumber } from "@/lib/derive-poll";
import {
  CONTENT_W,
  CREAM,
  Ctx,
  DIM,
  Doc,
  ensure,
  eyebrow,
  footers,
  LINE,
  MARGIN,
  MUTED,
  paintBackground,
  panel,
  paragraph,
  POSITIVE,
  reportHeader,
  rgb,
  sectionHeading,
  SOFT,
  text,
} from "@/lib/export/pdf-kit";
import { statusStyle } from "@/lib/taxonomy";
import type { DecoratedPoll, PollReason, PollSplitRow } from "@/lib/types";

/* ------------------------------------------------------------------ pieces */

/** The head-to-head bar: two fills meeting, each labelled inside its own. */
function splitBar(doc: Doc, poll: DecoratedPoll, x: number, y: number, w: number, h: number) {
  const [a, b] = poll.sides;

  if (poll.unvoted) {
    doc.setFillColor(...rgb(LINE));
    doc.roundedRect(x, y, w, h, 3, 3, "F");
    text(doc, "No votes yet", x + w / 2, y + h / 2 + 3, {
      size: 8.5,
      color: DIM,
      align: "center",
    });
    return;
  }

  const gap = 2;
  const aw = Math.max((a.pct / 100) * w - gap, 0);
  const bw = Math.max((b.pct / 100) * w - gap, 0);

  doc.setFillColor(...rgb(a.color));
  doc.roundedRect(x, y, aw, h, 3, 3, "F");
  doc.setFillColor(...rgb(b.color));
  doc.roundedRect(x + aw + gap * 2, y, bw, h, 3, 3, "F");

  // Percentages sit inside their own fill, so the split is readable without a
  // legend and without depending on the colours alone.
  if (a.pct >= 12) {
    text(doc, `${a.pct}%`, x + 8, y + h / 2 + 3.5, { size: 10, bold: true, color: "#07240F" });
  }
  if (b.pct >= 12) {
    text(doc, `${b.pct}%`, x + w - 8, y + h / 2 + 3.5, {
      size: 10,
      bold: true,
      color: "#1B1233",
      align: "right",
    });
  }
}

/**
 * One cross-tab row, kept to two tightly-coupled lines.
 *
 * Everything about a row sits above its own bar; an earlier version put the
 * percentages on a line below, where they read as belonging to the next row.
 */
function crossTabRow(
  doc: Doc,
  poll: DecoratedPoll,
  row: PollSplitRow,
  x: number,
  y: number,
  w: number,
) {
  const [a, b] = poll.sides;

  text(doc, row.label, x, y, { size: 8, color: SOFT });
  text(
    doc,
    `${row.aPct}% / ${row.bPct}%   ·   ${
      row.leans === "even" ? "dead even" : `leans ${row.leans === "a" ? a.name : b.name}`
    }   ·   ${formatNumber(row.voters)}`,
    x + w,
    y,
    { size: 7, color: DIM, align: "right" },
  );

  const barY = y + 4;
  const aw = (row.aPct / 100) * w;
  doc.setFillColor(...rgb(a.color));
  doc.rect(x, barY, Math.max(aw - 1, 0), 4.5, "F");
  doc.setFillColor(...rgb(b.color));
  doc.rect(x + aw + 1, barY, Math.max(w - aw - 1, 0), 4.5, "F");
}

/* --------------------------------------------------------------- sections */

function header(ctx: Ctx, poll: DecoratedPoll) {
  const { doc } = ctx;
  reportHeader(doc);
  ctx.y = 78;

  const status = statusStyle(poll.status);
  text(
    doc,
    `${poll.category.label.toUpperCase()}   ·   POLL   ·   ${poll.closes.toUpperCase()}`,
    MARGIN,
    ctx.y,
    { size: 7, bold: true, color: status.fg },
  );

  ctx.y += 22;
  ctx.y = paragraph(doc, poll.question, MARGIN, ctx.y, CONTENT_W, {
    size: 21,
    bold: true,
    color: CREAM,
    leading: 25,
  });

  ctx.y += 18;
  ctx.y = paragraph(doc, poll.summary, MARGIN, ctx.y, CONTENT_W, {
    size: 9.5,
    color: SOFT,
    leading: 13.5,
  });

  ctx.y += 15;
  ctx.y = paragraph(doc, poll.about, MARGIN, ctx.y, CONTENT_W, {
    size: 8.5,
    color: MUTED,
    leading: 12.5,
  });
  ctx.y += 26;
}

function result(ctx: Ctx, poll: DecoratedPoll) {
  const { doc } = ctx;
  const [a, b] = poll.sides;
  ensure(ctx, 150);

  panel(doc, MARGIN, ctx.y, CONTENT_W, 132);
  const innerX = MARGIN + 16;
  let y = ctx.y + 26;

  if (poll.unvoted) {
    text(doc, "No votes yet", innerX, y, { size: 18, bold: true, color: SOFT });
  } else {
    text(doc, `${poll.leader.pct}% ${poll.leader.name}`, innerX, y, {
      size: 18,
      bold: true,
      color: poll.leader.color,
    });
    text(doc, formatNumber(poll.total), MARGIN + CONTENT_W - 16, y, {
      size: 18,
      bold: true,
      color: POSITIVE,
      align: "right",
    });
    text(
      doc,
      poll.total === 1 ? "vote cast" : "votes cast",
      MARGIN + CONTENT_W - 16,
      y + 11,
      { size: 7.5, color: MUTED, align: "right" },
    );
  }

  y += 12;
  text(doc, `${poll.verdict} · ${poll.marginLabel}`, innerX, y, { size: 8.5, color: MUTED });

  y += 16;
  splitBar(doc, poll, innerX, y, CONTENT_W - 32, 24);

  // Both options spelled out under the bar, with their own case for them.
  y += 40;
  const colW = (CONTENT_W - 40) / 2;
  [a, b].forEach((side, i) => {
    const x = innerX + i * (colW + 8);
    doc.setFillColor(...rgb(side.color));
    doc.circle(x + 3, y - 3, 3, "F");
    text(doc, side.name, x + 11, y, { size: 9.5, bold: true, color: CREAM });
    text(
      doc,
      poll.unvoted ? "—" : `${side.pct}%  ·  ${formatNumber(side.votes)}`,
      x + colW,
      y,
      { size: 8, color: MUTED, align: "right" },
    );
    paragraph(doc, side.blurb, x + 11, y + 11, colW - 11, {
      size: 7.5,
      color: DIM,
      leading: 9.5,
    });
  });

  ctx.y += 146;
}

function crossTabs(ctx: Ctx, poll: DecoratedPoll) {
  const { doc } = ctx;

  if (poll.unvoted || poll.smallSample) {
    sectionHeading(ctx, "Who voted");
    ctx.y = paragraph(
      doc,
      poll.unvoted
        ? "Nobody has voted yet, so there is no audience to break down."
        : `Only ${poll.totalLabel} so far — too few to break down by region, age or occupation without inventing a pattern.`,
      MARGIN,
      ctx.y,
      CONTENT_W,
      { size: 8.5, color: DIM, leading: 11 },
    );
    ctx.y += 16;
    return;
  }

  sectionHeading(ctx, "Who voted");

  if (poll.contrarian) {
    ensure(ctx, 46);
    panel(doc, MARGIN, ctx.y - 8, CONTENT_W, 40);
    text(doc, "AGAINST THE GRAIN", MARGIN + 12, ctx.y + 6, {
      size: 6.5,
      bold: true,
      color: "#F0A83C",
    });
    paragraph(
      doc,
      `${poll.contrarian.label} is the one group that went the other way — ${
        poll.contrarian.leans === "a" ? poll.contrarian.aPct : poll.contrarian.bPct
      }% for ${poll.trailer.name}, against ${poll.leader.pct}% for ${poll.leader.name} overall.`,
      MARGIN + 12,
      ctx.y + 18,
      CONTENT_W - 24,
      { size: 8, color: SOFT, leading: 10 },
    );
    ctx.y += 48;
  }

  const blocks: [string, PollSplitRow[]][] = [
    ["Where votes came from", poll.regions],
    ["By age", poll.ageGroups],
    ["By occupation", poll.occupations],
  ];

  for (const [title, rows] of blocks) {
    const height = 34 + rows.length * 22;
    ensure(ctx, height + 12);
    panel(doc, MARGIN, ctx.y, CONTENT_W, height);
    eyebrow(doc, title, MARGIN + 14, ctx.y + 18);
    let y = ctx.y + 36;
    for (const row of rows) {
      crossTabRow(doc, poll, row, MARGIN + 14, y, CONTENT_W - 28);
      y += 22;
    }
    ctx.y += height + 12;
  }

  ensure(ctx, 30);
  ctx.y = paragraph(
    doc,
    `Location, age and occupation are optional and self-declared, shared by ${poll.demographicOptIn}% of voters. Segments are only ever reported as percentages of that segment, never as individuals.`,
    MARGIN,
    ctx.y + 8,
    CONTENT_W,
    { size: 7.5, color: DIM, leading: 10 },
  );
  ctx.y += 18;
}

function reasons(ctx: Ctx, poll: DecoratedPoll, list: PollReason[]) {
  if (list.length === 0) return;
  const { doc } = ctx;

  sectionHeading(ctx, "Why people chose what they chose");
  ctx.y = paragraph(
    doc,
    "Written reasons attached to votes. Polls carry no threads — nobody replies to anybody here.",
    MARGIN,
    ctx.y,
    CONTENT_W,
    { size: 8, color: DIM, leading: 10.5 },
  );
  ctx.y += 24;

  for (const side of poll.sides) {
    const column = list.filter((r) => r.side === side.id);
    if (column.length === 0) continue;

    ensure(ctx, 40);
    doc.setFillColor(...rgb(side.color));
    doc.circle(MARGIN + 4, ctx.y - 3, 3.5, "F");
    text(doc, side.name, MARGIN + 14, ctx.y, { size: 10.5, bold: true, color: CREAM });
    text(
      doc,
      poll.unvoted ? "—" : `${side.pct}%  ·  ${formatNumber(side.votes)}`,
      MARGIN + CONTENT_W,
      ctx.y,
      { size: 8, color: DIM, align: "right" },
    );
    ctx.y += 14;

    for (const reason of column) {
      // Measure before committing so a long reason is never split across pages.
      doc.setFontSize(8.5);
      const lines = (doc.splitTextToSize(reason.text, CONTENT_W - 28) as string[]).length;
      const height = 26 + lines * 11;
      ensure(ctx, height + 8);

      panel(doc, MARGIN, ctx.y, CONTENT_W, height);
      text(doc, reason.name, MARGIN + 14, ctx.y + 16, { size: 8.5, bold: true, color: SOFT });
      text(doc, reason.time, MARGIN + CONTENT_W - 14, ctx.y + 16, {
        size: 7,
        color: DIM,
        align: "right",
      });
      paragraph(doc, reason.text, MARGIN + 14, ctx.y + 29, CONTENT_W - 28, {
        size: 8.5,
        color: MUTED,
        leading: 11,
      });
      ctx.y += height + 8;
    }
    ctx.y += 6;
  }
}

/* ----------------------------------------------------------- entry point */

export interface PollReportInput {
  poll: DecoratedPoll;
  reasons: PollReason[];
}

export function pollReportFilename(poll: DecoratedPoll): string {
  return `opinionhq-poll-${poll.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

/**
 * Builds the document without touching the DOM, so the output can be rendered
 * and inspected outside a browser.
 */
export async function buildPollReport({
  poll,
  reasons: list,
}: PollReportInput): Promise<Doc> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setProperties({
    title: `${poll.question} — OpinionHQ poll report`,
    subject: poll.splitLabel,
    creator: "OpinionHQ (prototype)",
  });

  paintBackground(doc);
  const ctx: Ctx = {
    doc,
    y: MARGIN,
    page: 1,
    runningTitle: `${poll.question} · ${poll.category.label}`,
  };

  header(ctx, poll);
  result(ctx, poll);
  crossTabs(ctx, poll);
  reasons(ctx, poll, list);

  footers(
    doc,
    `All figures describe ${
      poll.unvoted
        ? "OpinionHQ participants"
        : `the ${formatNumber(poll.total)} OpinionHQ participants who voted in this poll`
    } — a self-selected sample, not a representative poll of the public. Prototype sample data.`,
    ctx.page,
  );

  return doc;
}

/** Builds the report and triggers a download. Returns the filename used. */
export async function exportPollReport(input: PollReportInput): Promise<string> {
  const doc = await buildPollReport(input);
  const filename = pollReportFilename(input.poll);
  doc.save(filename);
  return filename;
}
