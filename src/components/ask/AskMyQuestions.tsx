"use client";

/**
 * `/ask/my-questions` — everything the visitor asked.
 *
 * Split into "answered" and "still waiting" rather than one list sorted by
 * date. The only thing anyone comes to this screen for is whether somebody has
 * answered yet, and a mixed list makes you read every row to find out.
 */

import { useMemo } from "react";

import { useAsk } from "@/components/ask/AskProvider";
import { AskRail } from "@/components/ask/AskRail";
import { QuestionCard } from "@/components/ask/QuestionCard";
import { EmptyState, askPrimary } from "@/components/ask/primitives";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { deadlineNote, questionStatus } from "@/lib/ask/derive";
import type { AskQuestion } from "@/lib/ask/types";

export function AskMyQuestions() {
  const { signedIn, openAuth, ready: sessionReady } = usePrototype();
  const { myQuestions, answers, matches, threads, unansweredSeen, ready } = useAsk();

  const rows = useMemo(
    () =>
      myQuestions.map((question) => {
        const mine = answers.filter((a) => a.questionId === question.id);
        const myMatches = matches.filter((m) => m.questionId === question.id);
        const myThreads = threads.filter((t) => t.questionId === question.id);
        return {
          question,
          answers: mine.length,
          status: questionStatus(myMatches, myThreads),
          unread: unansweredSeen.has(question.id),
        };
      }),
    [myQuestions, answers, matches, threads, unansweredSeen],
  );

  const answered = rows.filter((r) => r.answers > 0);
  const waiting = rows.filter((r) => r.answers === 0);

  if (sessionReady && !signedIn) {
    return (
      <Shell>
        <EmptyState
          title="Sign in to see your questions"
          body="Your questions and their answers are tied to your account."
          action={
            <button type="button" onClick={() => openAuth("signin")} className={askPrimary}>
              Sign in
            </button>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {!ready ? null : rows.length === 0 ? (
        <EmptyState
          title="You have not asked anything yet"
          body="Ask a question and it goes to people whose proof fits it. Public by default, private if you choose."
        />
      ) : (
        <div className="flex flex-col gap-8">
          <Group
            title="Answered"
            note="Somebody with relevant proof has replied."
            rows={answered}
          />
          <Group
            title="Still waiting"
            note="Sent to people whose proof fits. Nothing back yet."
            rows={waiting}
          />
        </div>
      )}
    </Shell>
  );
}

function Group({
  title,
  note,
  rows,
}: {
  title: string;
  note: string;
  rows: {
    question: AskQuestion;
    answers: number;
    status: ReturnType<typeof questionStatus>;
    unread: boolean;
  }[];
}) {
  return (
    <section>
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-2.5">
        <h2 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-cream-bright">
          {title}
        </h2>
        <span className="font-mono text-[10.5px] text-dim">{rows.length}</span>
        <span className="text-[12.5px] text-muted">{note}</span>
      </header>
      {rows.length === 0 ? (
        <p className="m-0 py-3 text-[13px] text-dim">Nothing here.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 xl:grid-cols-2">
          {rows.map((row) => (
            <QuestionCard
              key={row.question.id}
              question={row.question}
              answers={row.answers}
              status={row.status}
              unread={row.unread}
              detail={deadlineNote(row.question.deadline)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8 lg:px-14">
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Ask Verified", href: "/ask" },
          { label: "My questions" },
        ]}
      />
      <h1 className="mt-4 mb-6 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.02] tracking-[-0.025em] text-cream-bright">
        My <em className="italic">questions</em>
      </h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">{children}</div>
        <AskRail />
      </div>
    </section>
  );
}
