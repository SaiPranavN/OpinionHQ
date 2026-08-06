"use client";

/**
 * `/ask/questions/[id]` — the only page that renders private content.
 *
 * Every read is a projection from `lib/ask/access.ts` rather than a filter
 * written inline. The asker gets everything on their question; a matched
 * professional gets their own answer and their own thread and no trace of
 * anybody else's; everybody else gets "no such question" — not "forbidden",
 * because confirming a question exists at an address is itself a disclosure.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAsk } from "@/components/ask/AskProvider";
import {
  AskCategoryIcon,
  AskStatusBadge,
  CredentialChip,
  EmptyState,
  Field,
  LockIcon,
  Monogram,
  PRIVATE_COLOR,
  PRIVATE_LINE,
  PRIVATE_SOFT,
  PrivacyNotice,
  PrivateBadge,
  PrototypeAuthNotice,
  ReplyIcon,
  ShieldIcon,
  SimulatedTag,
  VoteBar,
  askInline,
  askInput,
  askPrimary,
  askQuiet,
  askSecondary,
} from "@/components/ask/primitives";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import {
  canComment,
  canMessagePrivately,
  canOpenPrivate,
  canVote,
  visibleAnswers,
  visibleThreads,
  type AccessScope,
} from "@/lib/ask/access";
import { replySummary, voteCount } from "@/lib/ask/comments";
import {
  isComplete,
  NO_PICK,
  pickLabel,
  RATING_LEVELS,
  toneColor,
  VERDICT_LEVELS,
  VERDICT_PROMPT,
  verdictsFor,
} from "@/lib/ask/assessments";
import {
  decorateAnswer,
  deadlineNote,
  questionStatus,
  relativeTime,
  shortDate,
  turnLine,
} from "@/lib/ask/derive";
import { askCategory, isThreadOpen } from "@/lib/ask/taxonomy";
import { MIN_REPORTABLE_ANSWERS, verificationDisclosure } from "@/lib/ask/verification";
import type {
  CommentNode,
  DecoratedAnswer,
  AskQuestion,
  Viewer,
} from "@/lib/ask/types";

export function QuestionView({ id }: { id: string }) {
  const {
    ready,
    access,
    professionals,
    allCredentials,
    answers,
    threads,
    messages,
    ratings,
    comments,
    matches,
    markRead,
  } = useAsk();
  const { signedIn, openAuth } = usePrototype();

  const { question, viewer, decision } = access(id);
  const allowed = decision.allowed;
  const scope = decision.allowed ? decision.scope : null;

  useEffect(() => {
    if (allowed) markRead(id);
  }, [allowed, id, markRead]);

  const decorated = useMemo<DecoratedAnswer[]>(() => {
    if (!question || !scope) return [];
    const mine = visibleAnswers(viewer, scope, answers, question);
    const myThreads = visibleThreads(viewer, scope, threads, question.id);
    return mine
      .map((answer) => {
        const professional = professionals.find(
          (p) => p.userId === answer.professionalUserId,
        );
        if (!professional) return null;
        return decorateAnswer(answer, {
          question,
          professional,
          credentials: allCredentials,
          threads: myThreads,
          messages,
          ratings,
          comments,
          viewer,
          scope,
        });
      })
      .filter((d): d is DecoratedAnswer => d !== null)
      .sort((a, b) => a.answer.createdAt.localeCompare(b.answer.createdAt));
  }, [question, scope, viewer, answers, threads, messages, ratings, comments, professionals, allCredentials]);

  if (!ready) return null;

  if (!allowed || !question || !scope) {
    return (
      <Shell crumb="Not found">
        <EmptyState
          title={signedIn ? "No such question" : "Nothing to show here"}
          body={
            signedIn
              ? (decision.allowed ? "" : decision.reason)
              : "Most questions in Ask Verified are public and readable without an account. This one is not — private questions are visible only to the person who asked and the verified people matched to them."
          }
          action={
            signedIn ? (
              <Link href="/ask" className={`${askSecondary} mt-1`}>
                Back to Ask Verified
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("signin", "/ask")}
                className={`${askPrimary} mt-1`}
              >
                Sign in
              </button>
            )
          }
        />
        <div className="mt-5">
          <PrototypeAuthNotice />
        </div>
      </Shell>
    );
  }

  const category = askCategory(question.category);
  const myMatches = matches.filter((m) => m.questionId === question.id);
  const status = questionStatus(
    myMatches,
    threads.filter((t) => t.questionId === question.id),
  );
  const mine = decorated.find((d) => d.answer.professionalUserId === viewer.userId);

  return (
    <Shell
      crumb={
        scope === "asker"
          ? "Your question"
          : scope === "professional"
            ? "Question for you"
            : "Question"
      }
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-[9px] border"
              style={{
                borderColor: "rgba(143,168,196,0.26)",
                background: "rgba(143,168,196,0.09)",
                color: PRIVATE_COLOR,
              }}
            >
              <AskCategoryIcon category={question.category} size={16} />
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-dim">
              {category.label}
            </span>
            {question.visibility === "private" ? (
              <PrivateBadge />
            ) : (
              <PrivateBadge label="Public question" />
            )}
            <AskStatusBadge status={status} size="sm" />
            {question.simulated ? <SimulatedTag /> : null}
            <span className="ml-auto text-[11.5px] text-dim">
              {shortDate(question.createdAt)}
            </span>
          </div>

          <h1 className="m-0 font-display font-bold text-[clamp(1.8rem,3.6vw,2.7rem)] leading-[1.08] tracking-[-0.024em] text-balance text-cream-bright">
            {question.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-dim">
            <span>{deadlineNote(question.deadline)}</span>
            {scope === "professional" ? <span>Asked by {question.askerName}</span> : null}
          </div>

          <PrivacyNotice visibility={question.visibility} />
        </header>

        <section className="ohq-panel flex flex-col gap-5 p-5 sm:p-6">
          <span className="ohq-eyebrow">
            {scope === "asker" ? "What you wrote" : "The situation"}
          </span>
          {question.context.split("\n\n").map((paragraph, i) => (
            <p key={i} className="m-0 text-[14px] leading-[1.7] font-light text-pretty text-soft">
              {paragraph}
            </p>
          ))}
          {question.options.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-line pt-5">
              <span className="ohq-eyebrow">The choices</span>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {question.options.map((option) => (
                  <li key={option} className="flex gap-2 text-[13px] text-soft">
                    <span aria-hidden className="text-veil/25">
                      ·
                    </span>
                    {option}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ------------------------------------------------ asker's view */}
        {scope === "asker" ? (
          <>
            <section
              className="flex flex-wrap items-center gap-3 rounded-[16px] border p-4"
              style={{ borderColor: PRIVATE_LINE, background: PRIVATE_SOFT }}
            >
              <span className="flex items-center gap-2" style={{ color: PRIVATE_COLOR }}>
                <ShieldIcon size={14} />
                <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase">
                  Sent to
                </span>
              </span>
              {myMatches.map((match) => {
                const person = professionals.find((p) => p.userId === match.professionalUserId);
                if (!person) return null;
                return (
                  <span key={match.id} className="flex items-center gap-2">
                    <Monogram professional={person} size={24} />
                    <span className="text-[12.5px] text-soft">{person.name}</span>
                    {match.revokedAt ? (
                      <span className="text-[11px] text-dim">· access ended</span>
                    ) : null}
                  </span>
                );
              })}
              {myMatches.length === 0 ? (
                <span className="text-[12.5px] text-dim">
                  Nobody verified in this area matches it yet.
                </span>
              ) : null}
            </section>
          </>
        ) : null}

        {/* --------------------------------------- answers: asker + public

            Both scopes read the same list, so it lives outside the asker
            branch it used to be nested inside. That nesting was correct when
            the asker was the only person who could ever reach this page; once
            questions became public it silently rendered a public question with
            its answers stripped out — the one thing the reader came for. */}
        {scope === "asker" || scope === "public" ? (
          <>
            {decorated.length > 1 ? <Compare items={decorated} question={question} /> : null}

            <section className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display m-0 text-[15px] font-semibold text-cream-bright">
                  Answers
                  <span className="ml-2 font-mono text-[11px] text-dim">
                    {decorated.length}
                  </span>
                </h2>
                <span className="text-[12px] text-dim">
                  Independent. Nobody writing one could see another.
                </span>
              </div>

              {decorated.length === 0 ? (
                <EmptyState
                  title="No answers yet"
                  body={
                    scope === "asker"
                      ? "Your question is with the people it was matched to. You will see each answer here as it arrives."
                      : "Nobody with matching proof has answered this one yet."
                  }
                />
              ) : null}

              {decorated.map((item, i) => (
                <AnswerCard
                  key={item.answer.id}
                  item={item}
                  question={question}
                  scope={scope}
                  viewer={viewer}
                  index={i}
                />
              ))}
            </section>
          </>
        ) : null}

        {/* ----------------------------------------- professional's view */}
        {scope === "professional" ? (
          <>
            <p className="m-0 rounded-[12px] border border-veil/8 bg-veil/2 p-4 text-[12.5px] leading-[1.6] text-dim">
              You can see this because your verified proof matched it. You cannot see any
              other answer or thread on this question — that is deliberate, so your read
              stays your own.
            </p>
            {mine ? (
              <AnswerCard
                item={mine}
                question={question}
                scope="professional"
                viewer={viewer}
                index={0}
              />
            ) : (
              <AnswerForm question={question} />
            )}
          </>
        ) : null}

        <PrototypeAuthNotice />
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------- answer card */

function AnswerCard({
  item,
  question,
  scope,
  viewer,
  index,
}: {
  item: DecoratedAnswer;
  question: AskQuestion;
  scope: AccessScope;
  viewer: Viewer;
  index: number;
}) {
  const { reply, closeThread, rate, openPrivate, voteAnswer, answerVotes } = useAsk();
  const { signedIn, openAuth } = usePrototype();
  const [showProof, setShowProof] = useState(false);
  const [draft, setDraft] = useState("");
  const { answer, professional, credentials, thread } = item;
  const verdicts = verdictsFor(question, answer.verdicts, answer.pick);
  const chosen = verdicts.find((v) => v.picked);
  const open = isThreadOpen(thread.status);
  const used = scope === "asker" ? item.replies.asker : item.replies.professional;
  const left = Math.max(item.replies.cap - used, 0);
  const reportable = professional.answered >= MIN_REPORTABLE_ANSWERS;

  const anchorId = `thread-${professional.userId}`;
  const mayOpenPrivate = canOpenPrivate(question, viewer, thread, item.messages);
  const myVote = answerVotes[answer.id];
  const mayVote = canVote(question, viewer, professional.userId);

  /**
   * Opens the private channel and takes them to it.
   *
   * The scroll runs on the next frame because the section it targets does not
   * exist until this state change has rendered — an `href="#thread-…"` would
   * be resolved against the document as it is *now*, find nothing, and leave
   * them looking at the comments wondering whether the button worked.
   */
  const goPrivate = () => {
    if (mayOpenPrivate) openPrivate(question.id, professional.userId);
    requestAnimationFrame(() => {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <article className="ohq-panel-raised flex flex-col overflow-hidden">
      <header className="flex flex-col gap-3.5 border-b border-line p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-3.5">
          <Monogram professional={professional} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <h3 className="font-display m-0 text-[16px] leading-[1.2] font-semibold text-cream-bright">
                {professional.name}
              </h3>
              {scope === "asker" ? (
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
                  Answer {index + 1}
                </span>
              ) : null}
            </span>
            <span className="text-[13px] text-muted">{professional.headline}</span>
          </div>
          <AskStatusBadge status={thread.status} size="sm" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {credentials.map((credential) => (
            <CredentialChip key={credential.id} credential={credential} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowProof((v) => !v)}
          aria-expanded={showProof}
          className="flex w-fit cursor-pointer items-center gap-2 text-[12px] text-dim underline-offset-4 transition-colors duration-300 outline-none hover:text-soft hover:underline focus-visible:ring-2 focus-visible:ring-positive/60"
        >
          <ShieldIcon size={12} />
          {showProof ? "Hide proof details" : "What exactly was checked?"}
        </button>

        {showProof ? (
          <div className="flex flex-col gap-2.5 rounded-[12px] border border-veil/8 bg-surface-sunken p-4">
            {credentials.map((credential) => (
              <span key={credential.id} className="flex flex-col gap-0.5">
                <span className="text-[12.5px] font-medium text-cream">
                  {credential.publicLabel}
                </span>
                <span className="text-[11.5px] text-dim">
                  Evidence: {credential.evidenceCategory} · checked{" "}
                  {relativeTime(credential.verifiedAt)}
                </span>
              </span>
            ))}
            <p className="m-0 border-t border-line pt-3 text-[11.5px] leading-[1.6] text-dim">
              {verificationDisclosure(question.category)} Documents, addresses and identity
              numbers are never displayed and are not stored on this record.
            </p>
          </div>
        ) : null}
      </header>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {/* What they would actually do. The lead, because it is the answer. */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border p-4"
          style={{
            borderColor: chosen ? `${toneColor(chosen.level.tone)}44` : "color-mix(in oklab, var(--color-veil) 10%, transparent)",
            background: chosen ? `${toneColor(chosen.level.tone)}0E` : "transparent",
          }}
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="ohq-eyebrow">Would choose</span>
            <span
              className="text-[19px] leading-[1.15] font-semibold tracking-[-0.015em] text-pretty"
              style={{ color: chosen ? toneColor(chosen.level.tone) : "var(--color-soft)" }}
            >
              {pickLabel(question, answer.pick)}
            </span>
          </span>
          <span className="max-w-[420px] text-[13.5px] leading-[1.55] text-pretty text-soft">
            {answer.summary}
          </span>
        </div>

        <section className="flex flex-col gap-3.5">
          <span className="ohq-eyebrow">Their read on each of your options</span>
          <div className="flex flex-col gap-3.5">
            {verdicts.map((verdict) => (
              <OptionVerdictRow key={verdict.index} verdict={verdict} />
            ))}
          </div>
          <p className="m-0 text-[11.5px] leading-[1.55] text-dim">
            Scored against the options you wrote. One person&rsquo;s private read of
            your situation — not a poll, never aggregated, never published.
          </p>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-line pt-5">
          {answer.reasoning.split("\n\n").map((paragraph, i) => (
            <p key={i} className="m-0 text-[14px] leading-[1.7] font-light text-pretty text-soft">
              {paragraph}
            </p>
          ))}
        </section>

        {answer.nextSteps.length > 0 ? (
          <section className="flex flex-col gap-2 border-t border-line pt-5">
            <span className="ohq-eyebrow">What to do next</span>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {answer.nextSteps.map((step) => (
                <li key={step} className="flex gap-2.5 text-[13px] leading-[1.6] text-soft">
                  <span aria-hidden className="pt-px font-mono text-positive">
                    →
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[11.5px] text-dim">
          <span>{relativeTime(answer.createdAt)}</span>
          <span>· {turnLine(thread.status)}</span>
          {reportable ? (
            <span className="ml-auto flex items-center gap-2">
              <span style={{ color: PRIVATE_COLOR }}>
                {professional.helpfulPct}% helpful · {professional.answered} answers
              </span>
              <SimulatedTag />
            </span>
          ) : (
            <span className="ml-auto">Too few answers to report a track record</span>
          )}
        </footer>

        {/* ------------------------------------------------- reader actions

            Public questions only. On a private one there is no audience to
            like an answer — the only reader is the person who asked, and they
            already have the private rating at the foot of this card, which
            says something more useful and says it to nobody else. */}
        {question.visibility === "public" ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4">
            <VoteBar
              size="lg"
              likes={voteCount(answer.likes, "like", myVote)}
              dislikes={voteCount(answer.dislikes, "dislike", myVote)}
              vote={myVote}
              disabled={signedIn && !mayVote}
              title={
                signedIn && !mayVote ? "You cannot vote on your own answer" : undefined
              }
              onVote={(kind) => (signedIn ? voteAnswer(answer.id, kind) : openAuth("signin"))}
            />
            <a href={`#comments-${professional.userId}`} className={askInline}>
              <ReplyIcon size={13} />
              {item.commentCount}{" "}
              {item.commentCount === 1 ? "comment" : "comments"}
            </a>
            {answer.likes ? (
              <span className="ml-auto flex items-center gap-2 text-[11px] text-dim">
                Readers, not the person who asked
                <SimulatedTag />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------- private channel

          Never rendered for a public reader. `visibleThreads` already returns
          nothing for that scope, so this would collapse to an empty panel
          headed "Just the two of you" — which would be worse than absent: it
          would advertise a conversation the reader cannot see and imply the
          product shows it to somebody.

          AND NOT RENDERED UNTIL THE ASKER OPENS IT. A reply box under every
          answer by default was making a promise the asker never made: it read
          as an open line to somebody who had done nothing but answer a
          question, and it made an answer that needed no follow-up look
          unfinished. The door is theirs. */}
      {scope !== "public" && item.privateOpen ? (
      <section
        // The target of "Message privately". The private thread is the one
        // place a confidential follow-up can live, and every route to it —
        // this anchor, the button below the comments — lands here rather than
        // opening a second channel.
        id={anchorId}
        className="flex scroll-mt-24 flex-col gap-4 border-t p-5 sm:p-6"
        style={{ borderColor: PRIVATE_LINE, background: PRIVATE_SOFT }}
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2" style={{ color: PRIVATE_COLOR }}>
            <LockIcon size={14} />
            <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase">
              Just the two of you
            </span>
          </span>
          <span className="text-[11.5px] text-dim">
            {left} {left === 1 ? "reply" : "replies"} left
          </span>
        </header>

        {item.messages.length === 0 ? (
          <p className="m-0 text-[12.5px] leading-[1.6] text-dim">
            {scope === "asker"
              ? "No messages yet. Ask a follow-up if something needs unpacking."
              : "No messages yet."}
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {item.messages.map((message) => {
              const own =
                (scope === "asker" && message.senderRole === "asker") ||
                (scope === "professional" && message.senderRole === "professional");
              return (
                <li key={message.id} className={`flex gap-3 ${own ? "flex-row-reverse" : ""}`}>
                  {message.senderRole === "professional" ? (
                    <Monogram professional={professional} size={28} />
                  ) : (
                    <span
                      aria-hidden
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-veil/14 bg-veil/4 text-[10.5px] font-semibold text-soft"
                    >
                      {scope === "asker" ? "YO" : question.askerName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div
                    className={`flex max-w-[560px] min-w-0 flex-col gap-1 rounded-[14px] border px-4 py-3 ${
                      own ? "border-positive/22 bg-positive/6" : "border-veil/9 bg-surface-sunken"
                    }`}
                  >
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[11.5px] font-medium text-soft">
                        {message.senderRole === "professional"
                          ? professional.name
                          : scope === "asker"
                            ? "You"
                            : question.askerName}
                      </span>
                      <span className="text-[10.5px] text-dim">
                        {relativeTime(message.createdAt)}
                      </span>
                    </span>
                    <p className="m-0 text-[13.5px] leading-[1.65] text-pretty text-soft">
                      {message.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {open && left > 0 ? (
          <div className="flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: PRIVATE_LINE }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 1200))}
              rows={3}
              placeholder={
                scope === "asker"
                  ? "Ask a follow-up. Keep it to this decision."
                  : "Reply privately."
              }
              className={askInput}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  if (reply(question.id, professional.userId, draft)) setDraft("");
                }}
                className="cursor-pointer rounded-full bg-positive px-5 py-2.5 text-[13px] font-semibold text-positive-ink transition-colors duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
              <span className="text-[11.5px] text-dim">
                {used} of {item.replies.cap} used
              </span>
            </div>
          </div>
        ) : open ? (
          <p
            className="m-0 border-t pt-4 text-[12.5px] leading-[1.6] text-dim"
            style={{ borderColor: PRIVATE_LINE }}
          >
            Reply limit reached — {item.replies.cap} each way. This is bounded guidance,
            not an open retainer.
          </p>
        ) : (
          <p
            className="m-0 border-t pt-4 text-[12.5px] leading-[1.6] text-dim"
            style={{ borderColor: PRIVATE_LINE }}
          >
            {thread.status === "Resolved" ? "Resolved" : "Closed"} — their access to your
            question ended here.
          </p>
        )}

      </section>
      ) : null}

      {/* The closed door, for the asker. A line and a button rather than a
          collapsed panel: the point is that nothing is open, and a panel that
          takes up the space of a conversation is not "nothing is open". */}
      {scope === "asker" && !item.privateOpen ? (
        <section
          id={anchorId}
          className="flex scroll-mt-24 flex-wrap items-center gap-x-4 gap-y-3 border-t p-5 sm:p-6"
          style={{ borderColor: PRIVATE_LINE, background: PRIVATE_SOFT }}
        >
          <span className="flex items-center gap-2" style={{ color: PRIVATE_COLOR }}>
            <LockIcon size={14} />
            <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase">
              Private follow-up
            </span>
          </span>
          <p className="m-0 min-w-[240px] flex-1 text-[12.5px] leading-[1.6] text-dim">
            {open
              ? `Nothing open. If something here needs unpacking — a salary, an employer, anything you would not put in a public comment — start a thread and it stays between you and ${professional.name}.`
              : "This one is finished. Their access to your question ended when you closed it."}
          </p>
          {open ? (
            <button
              type="button"
              onClick={goPrivate}
              className={`${askQuiet} border-private/45 text-private-soft hover:bg-private/12`}
            >
              <LockIcon size={12} />
              Message privately
            </button>
          ) : null}
        </section>
      ) : null}

      {/* The professional's side of the same fact. Said plainly, because the
          alternative is somebody looking for a reply box that was there
          yesterday and concluding the page is broken. */}
      {scope === "professional" && !item.privateOpen ? (
        <p
          className="m-0 flex items-center gap-2 border-t px-5 py-4 text-[12.5px] leading-[1.6] text-dim sm:px-6"
          style={{ borderColor: PRIVATE_LINE, background: PRIVATE_SOFT }}
        >
          <LockIcon size={13} />
          No private thread on this one. Only the person who asked can open one — if
          they want to take something further, it appears here.
        </p>
      ) : null}

      {/* ------------------------------------------------ public comments */}
      <CommentSection
        item={item}
        question={question}
        scope={scope}
        viewer={viewer}
        onMessagePrivately={goPrivate}
      />

      {/* ---------------------------------------- the asker's own controls

          Rating and closing, together, and outside the private channel they
          used to live inside. Closing is how the asker ends the whole exchange
          with this person, and burying it in a conversation most answers never
          have left them no way to finish one. */}
      {scope === "asker" ? (
        <footer className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="mr-1 flex items-center gap-2 text-[12px]"
              style={{ color: PRIVATE_COLOR }}
            >
              <LockIcon size={12} />
              {item.rating ? "You rated this" : "Was this useful?"}
            </span>
            {RATING_LEVELS.map((level, i) => (
              <button
                key={level}
                type="button"
                onClick={() => rate(question.id, professional.userId, i)}
                aria-pressed={item.rating?.helpfulness === i}
                className={`${askQuiet} ${
                  item.rating?.helpfulness === i
                    ? "border-positive/50 bg-positive/12 text-positive-light"
                    : "border-veil/12 text-muted hover:border-veil/26"
                }`}
              >
                {level}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-dim">
              Private. They are told it was helpful, never what you picked.
            </span>
          </div>

          {open ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="mr-1 text-[11.5px] text-dim">Done with this one?</span>
              <button
                type="button"
                onClick={() => closeThread(question.id, professional.userId, "Resolved")}
                className={`${askQuiet} border-positive/40 text-positive-light hover:bg-positive/10`}
              >
                Resolved
              </button>
              <button
                type="button"
                onClick={() => closeThread(question.id, professional.userId, "Not useful")}
                className={`${askQuiet} border-veil/14 text-muted hover:border-veil/28`}
              >
                Not useful
              </button>
              <span className="ml-auto text-[11px] text-dim">
                Ends the exchange and their access to your question.
              </span>
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

/* ---------------------------------------------------------- answer form */

/**
 * What a professional fills in.
 *
 * Scales first, prose second. Writing the argument and then picking a rating to
 * match it produces a rating that agrees with the argument; committing to the
 * scale first produces a read the prose has to justify.
 */
function AnswerForm({ question }: { question: AskQuestion }) {
  const { answer } = useAsk();
  const [verdicts, setVerdicts] = useState<number[]>([]);
  const [pick, setPick] = useState<number | undefined>(undefined);
  const [summary, setSummary] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [steps, setSteps] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setVerdict = (index: number, value: number) =>
    setVerdicts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  const submit = () => {
    if (pick === undefined || !isComplete(question, verdicts, pick)) {
      setError(
        "Score every option they listed and say which one you would take. A blank is not a neutral and will not be shown as one.",
      );
      return;
    }
    if (summary.trim().length < 12) return setError("Write a one-line summary.");
    if (reasoning.trim().length < 80) {
      setError("The reasoning is the part that helps. Give it at least a short paragraph.");
      return;
    }
    setError(null);
    answer(question.id, {
      verdicts,
      pick,
      summary: summary.trim(),
      reasoning: reasoning.trim(),
      nextSteps: steps
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <section className="ohq-panel flex flex-col gap-6 p-5 sm:p-7">
      <header className="flex flex-col gap-1.5">
        <span className="ohq-eyebrow">Your answer</span>
        <h2 className="font-display m-0 text-[17px] font-semibold tracking-[-0.01em] text-cream-bright">
          Score their options, then say why
        </h2>
        <p className="m-0 text-[12.5px] leading-[1.6] text-muted">
          These are the choices they wrote. Scoring the decision in front of them beats
          scoring a set of generic dimensions.
        </p>
      </header>

      {/* Verdicts first, prose second. Writing the argument and then picking a
          score to match it produces a score that agrees with the argument;
          committing to the score first produces a read the prose must justify. */}
      <div className="flex flex-col gap-5">
        {question.options.map((option, index) => (
          <fieldset key={option} className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="mb-1 flex flex-wrap items-baseline gap-2 p-0">
              <span className="text-[13.5px] font-semibold text-cream">{option}</span>
              <span className="text-[12px] text-dim">{VERDICT_PROMPT}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {VERDICT_LEVELS.map((level, i) => {
                const active = verdicts[index] === i;
                const color = toneColor(level.tone);
                return (
                  <button
                    key={level.label}
                    type="button"
                    onClick={() => setVerdict(index, i)}
                    aria-pressed={active}
                    className="cursor-pointer rounded-full border px-3.5 py-[6px] text-[12px] font-medium transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60"
                    style={{
                      borderColor: active ? `${color}88` : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                      background: active ? `${color}18` : "transparent",
                      color: active ? color : "var(--color-muted)",
                    }}
                  >
                    {level.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 border-t border-line p-0 pt-5">
        <legend className="mb-1 p-0 text-[13.5px] font-semibold text-cream">
          Which would you take?
        </legend>
        <div className="flex flex-wrap gap-2">
          {question.options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => setPick(index)}
              aria-pressed={pick === index}
              className={`${askQuiet} ${
                pick === index
                  ? "border-positive/50 bg-positive/12 text-positive-light"
                  : "border-veil/12 text-muted hover:border-veil/26"
              }`}
            >
              {option}
            </button>
          ))}
          {/* Sometimes the honest answer is that neither is right. */}
          <button
            type="button"
            onClick={() => setPick(NO_PICK)}
            aria-pressed={pick === NO_PICK}
            className={`${askQuiet} ${
              pick === NO_PICK
                ? "border-[#F0A83C]/50 bg-[#F0A83C]/12 text-[#F0A83C]"
                : "border-veil/12 text-muted hover:border-veil/26"
            }`}
          >
            Neither
          </button>
        </div>
      </fieldset>

      <div className="flex flex-col gap-5 border-t border-line pt-5">
        <Field label="One line" hint="Shown at the top of your answer">
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value.slice(0, 160))}
            placeholder="e.g. Worth taking, but expect the first six months to feel like a step back."
            className={askInput}
          />
        </Field>
        <Field label="Why" hint="Blank lines separate paragraphs">
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value.slice(0, 3000))}
            rows={8}
            placeholder="Say what you have actually seen — that is the thing they cannot get anywhere else."
            className={askInput}
          />
        </Field>
        <Field label="What to do next" hint="One per line, optional">
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={3}
            className={askInput}
          />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="m-0 text-[13px] text-negative-light">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="button" onClick={submit} className={askPrimary}>
          <ShieldIcon size={14} />
          Send answer
        </button>
        <span className="text-[11.5px] text-dim">
          Goes privately to the person who asked. Nobody else sees it.
        </span>
      </div>
    </section>
  );
}

/**
 * One option, its verdict, and where that sits on the scale.
 *
 * A segmented track rather than a smooth bar: this is an ordinal judgement on
 * five points, and a continuous bar would imply a precision nobody claimed.
 */
function OptionVerdictRow({
  verdict,
}: {
  verdict: ReturnType<typeof verdictsFor>[number];
}) {
  const color = toneColor(verdict.level.tone);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-[13px] text-soft">
          {verdict.picked ? (
            <span
              aria-label="Their pick"
              title="Their pick"
              className="font-mono text-[11px]"
              style={{ color }}
            >
              ★
            </span>
          ) : null}
          {verdict.option}
        </span>
        <span className="text-[13.5px] font-semibold" style={{ color }}>
          {verdict.level.label}
        </span>
      </div>
      <span
        className="flex gap-[3px]"
        role="img"
        aria-label={`${verdict.option}: ${verdict.level.label}, ${verdict.value + 1} of 5`}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="h-[5px] flex-1 rounded-full"
            style={{ background: i <= verdict.value ? color : "color-mix(in oklab, var(--color-veil) 8%, transparent)" }}
          />
        ))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- compare */

/**
 * Side by side. Only the asker sees this, and it is the reason two answers beat
 * one: the rows are the choices they actually face, so disagreement shows up as
 * two people scoring the same option differently.
 */
function Compare({
  items,
  question,
}: {
  items: DecoratedAnswer[];
  question: AskQuestion;
}) {
  return (
    <section className="ohq-panel flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display m-0 text-[15px] font-semibold text-cream-bright">Side by side</h2>
        <span className="text-[12px] text-dim">Visible to you only.</span>
      </div>
      <div className="ohq-scroll-x -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr>
              <th className="pb-3 text-[11.5px] font-normal text-dim">Your options</th>
              {items.map((item) => (
                <th key={item.answer.id} className="pb-3 pl-4">
                  <span className="flex items-center gap-2">
                    <Monogram professional={item.professional} size={22} />
                    <span className="text-[12.5px] font-medium text-cream">
                      {item.professional.name}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {question.options.map((option, index) => (
              <tr key={option} className="border-t border-line">
                <td className="py-2.5 pr-4 text-[12.5px] text-muted">{option}</td>
                {items.map((item) => {
                  const verdict = verdictsFor(
                    question,
                    item.answer.verdicts,
                    item.answer.pick,
                  ).find((v) => v.index === index);
                  return (
                    <td key={item.answer.id} className="py-2.5 pl-4">
                      {verdict ? (
                        <span
                          className="flex items-center gap-1.5 text-[13px] font-medium"
                          style={{ color: toneColor(verdict.level.tone) }}
                        >
                          {verdict.picked ? <span aria-hidden>★</span> : null}
                          {verdict.level.label}
                        </span>
                      ) : (
                        <span className="text-[13px] text-dim">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td className="py-2.5 pr-4 text-[12.5px] font-medium text-soft">
                Would choose
              </td>
              {items.map((item) => (
                <td
                  key={item.answer.id}
                  className="py-2.5 pl-4 text-[13px] font-semibold text-cream-bright"
                >
                  {pickLabel(question, item.answer.pick)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="m-0 text-[11.5px] leading-[1.55] text-dim">
        ★ marks what each of them would do. Two people scoring the same option
        differently is the most useful thing on this page.
      </p>
    </section>
  );
}

/**
 * Third-party comments on one published answer, and the private-follow-up
 * door beside them.
 *
 * The split the whole section turns on, stated on screen rather than assumed:
 *
 *   Comment          public, anybody signed in, visible to every reader
 *   Message privately  the asker only, and it goes to the existing one-to-one
 *                      thread rather than opening a second channel
 *
 * A reader who wants to add "this happened to me and it went the other way"
 * has somewhere to put it. A person who needs to say something with a salary
 * figure or an employer's name in it has somewhere else — and the button that
 * takes them there is right next to the comment box, so the choice is made
 * before anything is typed rather than regretted after.
 */
function CommentSection({
  item,
  question,
  scope,
  viewer,
  onMessagePrivately,
}: {
  item: DecoratedAnswer;
  question: AskQuestion;
  scope: AccessScope;
  viewer: Viewer;
  onMessagePrivately: () => void;
}) {
  const { comment } = useAsk();
  const { signedIn, openAuth } = usePrototype();
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  // Private questions have no third parties, so there is nothing to render.
  if (question.visibility !== "public") return null;

  const mayComment = canComment(question, viewer, item.professional.userId);
  const mayMessage = canMessagePrivately(question, viewer);

  const post = () => {
    if (comment(question.id, item.professional.userId, draft)) setDraft("");
  };

  return (
    <section
      id={`comments-${item.professional.userId}`}
      className="flex scroll-mt-24 flex-col gap-4 border-t border-line px-5 py-5 sm:px-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        {/* The whole heading is the collapse control. Somebody who came for the
            answer should be able to put the discussion away in one press
            without hunting for a small glyph at the end of a row. */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-controls={`comment-list-${item.professional.userId}`}
          className="-mx-2 flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 outline-none transition-colors duration-200 hover:bg-veil/6 focus-visible:ring-2 focus-visible:ring-positive/50"
        >
          <span
            aria-hidden
            className={`font-mono text-[10px] text-dim transition-transform duration-200 ${
              collapsed ? "" : "rotate-90"
            }`}
          >
            ▶
          </span>
          <span className="ohq-eyebrow">
            Comments
            <span className="ml-2 font-mono text-[10.5px] normal-case text-dim">
              {item.commentCount}
            </span>
          </span>
          <span className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">
            {collapsed ? "Show" : "Hide"}
          </span>
        </button>

        {/* The private door. Rendered for the asker only — a passer-by reading
            a published answer is a reader, not a client, and letting them into
            that thread would put a stranger inside the one place this feature
            promises is between two people. */}
        {mayMessage ? (
          <button
            type="button"
            onClick={onMessagePrivately}
            className={`${askQuiet} border-private/45 text-private-soft hover:bg-private/12`}
          >
            <LockIcon size={12} />
            {item.privateOpen ? "Go to your private thread" : "Message privately"}
          </button>
        ) : null}
      </header>

      {collapsed ? null : (
      <div id={`comment-list-${item.professional.userId}`} className="flex flex-col gap-4">
      <p className="m-0 text-[12px] leading-[1.55] text-dim">
        Comments are public and sit under this answer for anyone reading the
        question.{" "}
        {mayMessage
          ? "Anything you would rather not publish belongs in the private thread instead."
          : "A private follow-up is between the person who asked and the person who answered."}
      </p>

      {item.comments.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-5 p-0">
          {item.comments.map((node) => (
            <li key={node.comment.id}>
              <CommentNodeView
                node={node}
                item={item}
                question={question}
                viewer={viewer}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 text-[12.5px] text-dim">No comments yet.</p>
      )}

      {mayComment ? (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 600))}
            rows={2}
            placeholder="Add what this answer is missing, or what happened when you were in the same position."
            aria-label="Write a public comment on this answer"
            className={`${askInput} resize-y`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={post}
              disabled={draft.trim().length === 0}
              className={`${askSecondary} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Post comment
            </button>
            <span className="font-mono text-[10.5px] text-dim">
              {draft.length}/600 · public
            </span>
          </div>
        </div>
      ) : !signedIn ? (
        <button
          type="button"
          onClick={() => openAuth("signin")}
          className={`${askQuiet} w-fit border-veil/14 text-muted hover:border-veil/28`}
        >
          Sign in to comment
        </button>
      ) : scope === "professional" ? (
        <p className="m-0 text-[12.5px] leading-[1.6] text-dim">
          You wrote this answer. A new comment of your own belongs in the answer
          itself — but you can reply to anyone who has commented on it.
        </p>
      ) : null}
      </div>
      )}
    </section>
  );
}

/**
 * One comment and its replies.
 *
 * THE THREAD LINE IS STRUCTURAL, not decoration, and it is a line rather than a
 * bar. It drops out of this comment's monogram, runs down the gutter, and then
 * curves into each reply's own monogram — so a reply four levels down still
 * visibly hangs off one specific comment. A bar alongside a column of text only
 * says "these are indented", which the indent already said.
 *
 * The replies are a SIBLING of this comment's row, not a child of its content
 * column. That is what lets the vertical segment in the gutter stop exactly
 * where the first elbow begins: the row is as tall as this comment alone, and
 * everything below it is drawn by the replies themselves (see `.ohq-thread` in
 * globals.css). The line therefore ends at the last reply instead of running on
 * past the end of the conversation.
 *
 * The gutter segment is also the collapse control — a 28px-wide target around a
 * 1px line, so it is easy to hit and still reads as a hairline.
 */
function CommentNodeView({
  node,
  item,
  question,
  viewer,
}: {
  node: CommentNode;
  item: DecoratedAnswer;
  question: AskQuestion;
  viewer: Viewer;
}) {
  const { comment, voteComment, commentVotes } = useAsk();
  const { signedIn, openAuth } = usePrototype();
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState("");

  const entry = node.comment;
  const myVote = commentVotes[entry.id];
  const mayVote = canVote(question, viewer, entry.authorUserId);
  const mayReply = canComment(question, viewer, item.professional.userId, entry.id);
  const isAuthor = entry.authorUserId === item.professional.userId;
  const hasReplies = node.replies.length > 0;
  const showReplies = hasReplies && !collapsed;

  const post = () => {
    if (comment(question.id, item.professional.userId, draft, entry.id)) {
      setDraft("");
      setReplying(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex gap-2.5">
        <span className="flex w-7 shrink-0 flex-col items-center gap-1.5">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-veil/12 bg-veil/4 font-mono text-[10px] text-muted"
            style={
              isAuthor
                ? { borderColor: "rgba(29,185,84,0.4)", color: "var(--color-positive-light)" }
                : undefined
            }
          >
            {entry.authorInitials}
          </span>
          {/* `flex-col` matters: in a row-direction flex the `flex-1` below
              grows the line sideways into a 28px block instead of stretching
              it downwards, which is a bar and not a thread. */}
          {showReplies ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={`Collapse ${replySummary(node.total)}`}
              title={`Collapse ${replySummary(node.total)}`}
              className="group flex w-full flex-1 cursor-pointer flex-col items-center outline-none"
            >
              <span className="w-px flex-1 bg-veil/17 transition-colors duration-200 group-hover:bg-positive/55 group-focus-visible:bg-positive/60" />
            </button>
          ) : null}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-[12.5px] font-medium text-cream">
              {entry.authorName}
            </span>
            {isAuthor ? (
              <span className="rounded-full border border-positive/35 bg-positive/10 px-1.5 py-px font-mono text-[9px] tracking-[0.1em] text-positive-light uppercase">
                Answered this
              </span>
            ) : null}
            <span className="text-[11px] text-dim">{relativeTime(entry.createdAt)}</span>
            {entry.simulated ? <SimulatedTag /> : null}
          </span>

          {/* Collapsing folds away the replies and nothing else.
              Threaded discussions elsewhere hide the comment's own text too,
              which makes sense when the reason you are collapsing is that the
              comment is noise. Here it never is — every one of these is a
              considered note under a considered answer — so what is worth
              folding is a long sub-thread, and the control says exactly that. */}
          <p className="m-0 text-[13px] leading-[1.6] text-pretty text-soft">
            {entry.body}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <VoteBar
              likes={voteCount(entry.likes, "like", myVote)}
              dislikes={voteCount(entry.dislikes, "dislike", myVote)}
              vote={myVote}
              disabled={signedIn && !mayVote}
              title={signedIn && !mayVote ? "You cannot vote on your own comment" : undefined}
              onVote={(kind) => (signedIn ? voteComment(entry.id, kind) : openAuth("signin"))}
            />
            {mayReply ? (
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                aria-expanded={replying}
                className={askInline}
              >
                <ReplyIcon size={12.5} />
                Reply
              </button>
            ) : !signedIn ? (
              <button
                type="button"
                onClick={() => openAuth("signin")}
                className={askInline}
              >
                <ReplyIcon size={12.5} />
                Sign in to reply
              </button>
            ) : null}
            {hasReplies ? (
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                aria-expanded={!collapsed}
                className={askInline}
              >
                {collapsed ? "Show" : "Collapse"} {replySummary(node.total)}
              </button>
            ) : null}
          </div>

          {replying ? (
            <div className="mt-1 flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 600))}
                rows={2}
                autoFocus
                placeholder={`Reply to ${entry.authorName}`}
                aria-label={`Reply to ${entry.authorName}`}
                className={`${askInput} resize-y`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={post}
                  disabled={draft.trim().length === 0}
                  className={`${askQuiet} border-positive/40 text-positive-light hover:bg-positive/10 disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Post reply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplying(false);
                    setDraft("");
                  }}
                  className={askInline}
                >
                  Cancel
                </button>
                <span className="font-mono text-[10.5px] text-dim">
                  {draft.length}/600 · public
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* The replies. A sibling of the row above, so that row is as tall as
          this comment alone and its gutter line stops where the first elbow
          starts.

          `ohq-thread` carries the indent (38px) as padding, so the negative
          margin is the depth cap doing its work: past MAX_COMMENT_DEPTH the
          children share their parent's depth, and pulling the list back by
          exactly one gutter cancels the indent while leaving the connectors
          drawn against it. The elbows still land on the line — only the
          stepping right stops, so a long exchange does not walk off the edge
          of a phone. */}
      {showReplies ? (
        <ol
          className={`ohq-thread m-0 list-none ${
            node.replies[0]!.depth > node.depth ? "" : "-ml-[38px]"
          }`}
        >
          {node.replies.map((reply) => (
            <li key={reply.comment.id}>
              <CommentNodeView
                node={reply}
                item={item}
                question={question}
                viewer={viewer}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function Shell({ crumb, children }: { crumb: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[940px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8">
      <div className="mb-5">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Ask Verified", href: "/ask" },
            { label: crumb },
          ]}
        />
      </div>
      {children}
    </section>
  );
}
