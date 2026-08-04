/**
 * Shared chrome for Ask Verified.
 *
 * One file rather than one-per-component because these are a single vocabulary
 * — lock, shield, credential chip, status, scale — and every Ask screen uses
 * most of them.
 *
 * Two rules hold throughout. Green means *verified* and is never decorative.
 * Steel blue means *private* and never means anything else.
 */

import {
  askStatusStyle,
  PRIVATE_COLOR,
  PRIVATE_LINE,
  PRIVATE_SOFT,
  VERIFIED_COLOR,
} from "@/lib/ask/taxonomy";
import type {
  AskCategoryId,
  Credential,
  Professional,
  QuestionStatus,
} from "@/lib/ask/types";

export { PRIVATE_COLOR, PRIVATE_LINE, PRIVATE_SOFT, VERIFIED_COLOR };

/* ------------------------------------------------------------------ icons */

export function LockIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
      <path d="M12 14.4v2.3" />
    </svg>
  );
}

export function ShieldIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3.2 19 6v5.6c0 4.2-2.8 7.6-7 9.2-4.2-1.6-7-5-7-9.2V6z" />
      <path d="m9 12 2.2 2.2L15.4 10" />
    </svg>
  );
}

/**
 * The vote marks.
 *
 * Arrows rather than a heart and a broken heart. A heart says "I enjoyed
 * this", which is not a thing anybody feels about an assessment of their fee
 * structure; an arrow says "this was / was not worth reading", which is the
 * signal the counts are actually for.
 */
export function VoteIcon({
  size = 15,
  down = false,
  filled = false,
  className,
}: {
  size?: number;
  down?: boolean;
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={down ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M12 4.6 4.6 12h4.1v7.4h6.6V12h4.1z" />
    </svg>
  );
}

export function ReplyIcon({ size = 13, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.4 6.2 4.6 11l4.8 4.8" />
      <path d="M4.6 11h8.6a6.2 6.2 0 0 1 6.2 6.2v.6" />
    </svg>
  );
}

export function AskCategoryIcon({
  category,
  size = 16,
}: {
  category: AskCategoryId;
  size?: number;
}) {
  const paths: Record<AskCategoryId, React.ReactNode> = {
    career: (
      <>
        <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
        <path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7" />
        <path d="M3 12.5h18M10.5 12.5v2h3v-2" />
      </>
    ),
    college: (
      <>
        <path d="M12 4 2.8 8.4 12 12.8l9.2-4.4z" />
        <path d="M6.4 10.6v5.1c0 1.6 2.5 2.9 5.6 2.9s5.6-1.3 5.6-2.9v-5.1" />
        <path d="M21.2 8.4v5.2" />
      </>
    ),
    exam: (
      <>
        <path d="M6 3.2h9.5L19 6.8V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1z" />
        <path d="M15 3.4v3.6h3.7" />
        <path d="m8.4 13.6 2 2 4-4.6" />
      </>
    ),
  };
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
    >
      {paths[category]}
    </svg>
  );
}

/* ----------------------------------------------------------------- badges */

/** The private marker. On every surface that carries question content. */
export function PrivateBadge({ label = "Private" }: { label?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-[4px] text-[11px] font-medium whitespace-nowrap"
      style={{ borderColor: PRIVATE_LINE, background: PRIVATE_SOFT, color: PRIVATE_COLOR }}
    >
      <LockIcon size={11} />
      {label}
    </span>
  );
}

export function SimulatedTag() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-veil/10 bg-veil/3 px-2 py-[3px] font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim"
      title="Prototype figure. Not a measurement of anything."
    >
      <span aria-hidden className="h-1 w-1 rounded-full bg-[#F0A83C]" />
      Simulated
    </span>
  );
}

export function AskStatusBadge({
  status,
  size = "md",
}: {
  status: QuestionStatus;
  size?: "sm" | "md";
}) {
  const style = askStatusStyle(status);
  return (
    <span
      title={style.meaning}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap ${
        size === "sm" ? "px-2.5 py-[3px] text-[10.5px]" : "px-3 py-[5px] text-[11.5px]"
      }`}
      style={{ borderColor: style.border, background: style.bg, color: style.fg }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: style.fg }} />
      {status}
    </span>
  );
}

/**
 * One verified claim, stating what was checked.
 *
 * Never a bare tick: "Verified" alone asks the reader to guess what was
 * verified, and they guess generously.
 */
export function CredentialChip({
  credential,
  title,
}: {
  credential: Pick<Credential, "publicLabel" | "evidenceCategory">;
  title?: string;
}) {
  return (
    <span
      title={title ?? `Evidence: ${credential.evidenceCategory}`}
      className="inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-[4px] text-[11.5px] font-medium whitespace-nowrap"
      style={{
        borderColor: "rgba(29,185,84,0.3)",
        background: "rgba(29,185,84,0.07)",
        color: "#7BD99B",
      }}
    >
      <ShieldIcon size={11} />
      {credential.publicLabel}
    </span>
  );
}

/**
 * Monogram.
 *
 * No photographs are attached to fictional people. A stock face over an
 * invented credential is the one element here that would genuinely mislead
 * somebody about what they are looking at.
 */
export function Monogram({
  professional,
  size = 40,
}: {
  professional: Pick<Professional, "initials" | "tone">;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full border font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        borderColor: `${professional.tone}55`,
        background: `${professional.tone}18`,
        color: professional.tone,
      }}
    >
      {professional.initials}
    </span>
  );
}

/* --------------------------------------------------------------- notices */

/** The standing privacy statement, for a question that is actually private. */
export const PRIVACY_STATEMENT =
  "Your question and discussion are private. Only you and the verified people matched to it can read them.";

/**
 * What is and is not visible, stated on the question itself.
 *
 * Takes the visibility rather than assuming it. This notice used to be a
 * constant that said "your question is private" — printed unchanged on a
 * public question read by a stranger, it was not a reassurance, it was a
 * false statement about the page it sat on.
 *
 * The public wording still leads with what stays private, because that is the
 * part a reader cannot verify by looking and the part an asker is trusting.
 */
export function PrivacyNotice({
  short = false,
  visibility = "private",
}: {
  short?: boolean;
  visibility?: "public" | "private";
}) {
  const text =
    visibility === "public"
      ? short
        ? "Public. Your name is never shown."
        : "This question is public, so anyone can read it and the answers. Who asked, the one-to-one discussion and any rating stay private."
      : short
        ? "Your question stays private."
        : PRIVACY_STATEMENT;

  return (
    <p
      className="m-0 flex items-start gap-2.5 rounded-[12px] border p-3.5 text-[12.5px] leading-[1.6]"
      style={{ borderColor: PRIVATE_LINE, background: PRIVATE_SOFT, color: "var(--color-private-soft)" }}
    >
      <span className="pt-px" style={{ color: PRIVATE_COLOR }}>
        <LockIcon size={14} />
      </span>
      <span>{text}</span>
    </p>
  );
}

/**
 * The standing caveat on gated screens. Leaving it out would let the prototype
 * imply an enforcement it does not have.
 */
export function PrototypeAuthNotice() {
  return (
    <p className="m-0 rounded-[12px] border border-dashed border-veil/12 bg-veil/2 p-3.5 text-[12px] leading-[1.6] text-dim">
      <strong className="font-medium text-soft">Prototype.</strong> Access rules run in
      your browser over data it already holds — this build has no server. The same
      decisions (<code className="font-mono text-[11px] text-muted">lib/ask/access.ts</code>)
      must run server-side in production, and verification approves instantly here rather
      than going to a reviewer.
    </p>
  );
}

/* ------------------------------------------------------------- structure */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ohq-panel flex flex-col items-center gap-3 px-5 py-11 text-center">
      <span style={{ color: PRIVATE_COLOR }}>
        <LockIcon size={22} />
      </span>
      <h3 className="m-0 text-[15px] font-semibold text-cream-bright">{title}</h3>
      <p className="m-0 max-w-[420px] text-[13px] leading-[1.6] font-light text-muted">{body}</p>
      {action}
    </div>
  );
}

export const askPrimary =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-positive px-6 py-3 text-[14px] font-semibold text-positive-ink transition-[background,box-shadow] duration-300 ease-ohq outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light";

export const askSecondary =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-veil/16 px-5 py-2.5 text-[13.5px] font-medium text-soft transition-colors duration-300 ease-ohq outline-none hover:border-veil/36 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60";

export const askQuiet =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-medium transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60";

export const askInput =
  "w-full rounded-[10px] border border-veil/10 bg-surface-sunken px-3 py-2.5 text-[13.5px] leading-[1.55] text-cream outline-none transition-colors duration-300 focus:border-private/60";

/** Small text control used under a comment: Reply, Collapse, and friends. */
export const askInline =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px] font-medium text-dim transition-colors duration-200 outline-none hover:bg-veil/6 hover:text-soft focus-visible:ring-2 focus-visible:ring-positive/50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-dim";

/**
 * Like and dislike, side by side, each carrying its own count.
 *
 * TWO COUNTS RATHER THAN ONE NET SCORE. A single number reading zero could be
 * nobody voting or fifty people disagreeing, and those are not the same page.
 * Disagreement under a considered answer is the most interesting thing that can
 * happen to it, so it gets its own number instead of cancelling out.
 *
 * Both counts are always rendered, including at zero and including for somebody
 * who may not press them. A control that appears only once it has something to
 * show teaches people the thing does not exist; a zero teaches them they are
 * the first.
 */
export function VoteBar({
  likes,
  dislikes,
  vote,
  disabled,
  title,
  size = "md",
  onVote,
}: {
  likes: number;
  dislikes: number;
  /** The viewer's own position, if they have one. */
  vote?: "like" | "dislike";
  disabled?: boolean;
  /** Why it is disabled, when it is. Shown on hover and to screen readers. */
  title?: string;
  size?: "md" | "lg";
  onVote: (kind: "like" | "dislike") => void;
}) {
  const big = size === "lg";
  const base = big
    ? "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors duration-200 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-55"
    : "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-200 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-55";
  const icon = big ? 16 : 14.5;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onVote("like")}
        disabled={disabled}
        title={title}
        aria-pressed={vote === "like"}
        aria-label={`${vote === "like" ? "Remove your like" : "Like this"} — ${likes} ${likes === 1 ? "like" : "likes"}`}
        className={`${base} focus-visible:ring-positive/60 ${
          vote === "like"
            ? "border-positive/55 bg-positive/14 text-positive-light"
            : "border-veil/14 text-muted hover:border-positive/40 hover:bg-positive/8 hover:text-positive-light"
        }`}
      >
        <VoteIcon size={icon} filled={vote === "like"} />
        <span className="font-mono tabular-nums">{likes}</span>
      </button>

      <button
        type="button"
        onClick={() => onVote("dislike")}
        disabled={disabled}
        title={title}
        aria-pressed={vote === "dislike"}
        aria-label={`${vote === "dislike" ? "Remove your dislike" : "Dislike this"} — ${dislikes} ${dislikes === 1 ? "dislike" : "dislikes"}`}
        className={`${base} focus-visible:ring-negative/60 ${
          vote === "dislike"
            ? "border-negative/55 bg-negative/14 text-negative-light"
            : "border-veil/14 text-muted hover:border-negative/40 hover:bg-negative/8 hover:text-negative-light"
        }`}
      >
        <VoteIcon size={icon} down filled={vote === "dislike"} />
        <span className="font-mono tabular-nums">{dislikes}</span>
      </button>
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex flex-wrap items-baseline gap-2 text-[12px] text-muted">
        {label}
        {hint ? <span className="text-[10.5px] text-dim">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
