"use client";

/**
 * One question in a list.
 *
 * Used by all three list screens — browse, my questions, and the answer inbox
 * — with `detail` choosing which trailing line it carries. One card definition
 * rather than three keeps a question looking like the same object wherever it
 * appears, which is most of what makes a section feel coherent.
 *
 * The asker's name is never on it. Publishing a question is not publishing
 * yourself (see `canSeeAsker` in lib/ask/access.ts), and a list is exactly
 * where a name would leak without anybody deciding to show it.
 */

import Link from "next/link";

import { PlaceChip } from "@/components/ui/PlaceChip";
import {
  AskCategoryIcon,
  AskStatusBadge,
  LockIcon,
  PRIVATE_COLOR,
  SimulatedTag,
} from "@/components/ask/primitives";
import { relativeTime } from "@/lib/ask/derive";
import { askCategory } from "@/lib/ask/taxonomy";
import type { AskQuestion, QuestionStatus } from "@/lib/ask/types";

interface QuestionCardProps {
  question: AskQuestion;
  /** How many answers it has. Shown because it is the reason to open one. */
  answers: number;
  status?: QuestionStatus;
  /** Trailing note — a status line, a deadline, whatever the screen needs. */
  detail?: string;
  /** An answer landed and the asker has not opened it. */
  unread?: boolean;
}

export function QuestionCard({
  question,
  answers,
  status,
  detail,
  unread,
}: QuestionCardProps) {
  const category = askCategory(question.category);

  return (
    <li>
      <Link
        href={`/ask/questions/${question.id}`}
        data-spotlight
        className="ohq-panel flex h-full flex-col gap-3 p-4 transition-[border-color,transform] duration-300 ease-ohq outline-none hover:-translate-y-0.5 hover:border-veil/18 focus-visible:ring-2 focus-visible:ring-positive/60 sm:p-5"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border"
            style={{
              borderColor: "color-mix(in oklab, var(--color-private) 26%, transparent)",
              background: "color-mix(in oklab, var(--color-private) 9%, transparent)",
              color: PRIVATE_COLOR,
            }}
          >
            <AskCategoryIcon category={question.category} size={14} />
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
            {category.short}
          </span>
          <PlaceChip place={question.place} className="before:mr-1 before:text-veil/25 before:content-['·']" />

          {/* Only private questions carry a marker. Labelling the public ones
              too would put a badge on every card and make the distinction
              disappear into the noise — the exception is what needs saying. */}
          {question.visibility === "private" ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10.5px] font-medium"
              style={{
                borderColor: "color-mix(in oklab, var(--color-private) 34%, transparent)",
                color: "var(--color-private-soft)",
              }}
            >
              <LockIcon size={10} />
              Private
            </span>
          ) : null}

          {question.simulated ? <SimulatedTag /> : null}

          {unread ? (
            <span
              aria-label="New answer"
              className="h-[7px] w-[7px] shrink-0 rounded-full bg-positive"
            />
          ) : null}

          <span className="ml-auto text-[11.5px] whitespace-nowrap text-dim">
            {relativeTime(question.createdAt)}
          </span>
        </span>

        <h3 className="m-0 text-[15.5px] leading-[1.32] font-semibold text-pretty text-cream-bright">
          {question.title}
        </h3>

        {/* The options are the question — a reader scanning the list should be
            able to see what is actually being weighed without opening it. */}
        <span className="flex flex-wrap gap-1.5">
          {question.options.map((option) => (
            <span
              key={option}
              className="rounded-full border border-veil/10 px-2.5 py-[3px] text-[11.5px] text-muted"
            >
              {option}
            </span>
          ))}
        </span>

        <span className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {status ? <AskStatusBadge status={status} size="sm" /> : null}
          <span className="text-[12.5px] text-muted">
            {answers === 0
              ? "No answers yet"
              : `${answers} ${answers === 1 ? "answer" : "answers"}`}
          </span>
          {detail ? (
            <span className="ml-auto text-[11.5px] whitespace-nowrap text-dim">
              {detail}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
