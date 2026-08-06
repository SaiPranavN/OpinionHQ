"use client";

/**
 * `/ask/answer` — questions waiting for the visitor to answer.
 *
 * Reachable only once they hold proof, because the list itself is the grant:
 * a question reaches this screen because the matcher routed it to somebody
 * with a relevant credential, and nothing else puts it here.
 *
 * Deliberately not a queue with a claim button. There is no assignment to
 * accept and no lock to take out — several people are looking at the same
 * question independently, and that is the point rather than a race.
 */

import { useMemo } from "react";

import { SELF_USER_ID, useAsk } from "@/components/ask/AskProvider";
import { AskRail } from "@/components/ask/AskRail";
import { QuestionCard } from "@/components/ask/QuestionCard";
import {
  CredentialChip,
  EmptyState,
  ShieldIcon,
  askPrimary,
  PRIVATE_COLOR,
} from "@/components/ask/primitives";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { deadlineNote } from "@/lib/ask/derive";
import { askCategory } from "@/lib/ask/taxonomy";
import { credentialsFor } from "@/lib/ask/verification";
import Link from "next/link";

export function AskInbox() {
  const { signedIn, openAuth, ready: sessionReady } = usePrototype();
  const { inbox, answers, isProfessional, myAreas, myCredentials, ready } = useAsk();

  const rows = useMemo(
    () =>
      inbox.map((question) => {
        const mine = answers.filter(
          (a) =>
            a.questionId === question.id && a.professionalUserId === SELF_USER_ID,
        );
        return {
          question,
          // The count a professional cares about is whether *they* have
          // answered, not how many others have — and on a public question they
          // cannot see the others until they write their own anyway.
          answered: mine.length > 0,
          answers: answers.filter((a) => a.questionId === question.id).length,
        };
      }),
    [inbox, answers],
  );

  const todo = rows.filter((r) => !r.answered);
  const done = rows.filter((r) => r.answered);

  if (sessionReady && !signedIn) {
    return (
      <Shell>
        <EmptyState
          title="Sign in to answer"
          body="Answering needs an account with verified proof attached to it."
          action={
            <button type="button" onClick={() => openAuth("signin")} className={askPrimary}>
              Sign in
            </button>
          }
        />
      </Shell>
    );
  }

  if (ready && !isProfessional) {
    return (
      <Shell>
        <EmptyState
          title="Verify something first"
          body="Questions are routed on proof. Verify what you know and the ones that match will appear here — and nothing else will."
          action={
            <Link href="/ask/verify" className={askPrimary}>
              <ShieldIcon size={14} />
              Verify yourself
            </Link>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {!ready ? null : (
        <div className="flex flex-col gap-6">
          {/* What is actually routing these questions here, stated plainly.
              A professional should never have to guess why a stranger's
              question landed in front of them. */}
          <div className="ohq-panel flex flex-col gap-2.5 p-4 sm:p-5">
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
              <span style={{ color: PRIVATE_COLOR }}>
                <ShieldIcon size={13} />
              </span>
              Matched on your proof
            </span>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {myAreas.map((area) => (
                <li key={area} className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] text-muted">
                    {askCategory(area).label}:
                  </span>
                  {credentialsFor(myCredentials, SELF_USER_ID, area).map((c) => (
                    <CredentialChip key={c.id} credential={c} />
                  ))}
                </li>
              ))}
            </ul>
          </div>

          <Group
            title="Waiting for you"
            note="You have not answered these yet."
            rows={todo}
          />
          <Group
            title="You answered"
            note="Your answer is in. On public questions you can now read the others."
            rows={done}
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
  rows: { question: Parameters<typeof QuestionCard>[0]["question"]; answers: number }[];
}) {
  return (
    <section>
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-2.5">
        <h2 className="font-display m-0 text-[15px] font-semibold tracking-[-0.01em] text-cream-bright">
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
          { label: "Answer questions" },
        ]}
      />
      <h1 className="mt-4 mb-6 font-display font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.02] tracking-[-0.025em] text-cream-bright">
        Questions <em className="italic">for you</em>
      </h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">{children}</div>
        <AskRail />
      </div>
    </section>
  );
}
