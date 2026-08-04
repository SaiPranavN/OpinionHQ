"use client";

/**
 * The Ask Verified side rail.
 *
 * Four actions, and which of them appear depends on what the visitor has done
 * rather than on a role they picked at sign-up — one account, one rail:
 *
 *   Ask a question      always
 *   Answer questions    once they hold proof, with the count waiting
 *   Verify yourself     until they hold proof
 *   My questions        once signed in, with a dot when an answer has landed
 *
 * Shared by every `/ask` screen so the navigation never changes shape as you
 * move between them, and so there is one definition of what the section can do.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAsk } from "@/components/ask/AskProvider";
import {
  AskCategoryIcon,
  LockIcon,
  PRIVATE_COLOR,
  PRIVATE_LINE,
  PRIVATE_SOFT,
  ShieldIcon,
} from "@/components/ask/primitives";
import { usePrototype } from "@/components/prototype/PrototypeProvider";

export function AskRail() {
  const pathname = usePathname();
  const { signedIn, openAuth } = usePrototype();
  const { isProfessional, inbox, myQuestions, unansweredSeen, ready } = useAsk();

  if (!ready) return null;

  const waiting = inbox.length;
  const unread = unansweredSeen.size;

  return (
    <aside className="flex flex-col gap-3" aria-label="Ask Verified actions">
      <RailAction
        href="/ask/new"
        active={pathname === "/ask/new"}
        icon={<AskCategoryIcon category="career" size={15} />}
        label="Ask a question"
        note="Public by default, private if you choose"
        primary
      />

      {isProfessional ? (
        <RailAction
          href="/ask/answer"
          active={pathname === "/ask/answer"}
          icon={<ShieldIcon size={15} />}
          label="Answer questions"
          note={
            waiting === 0
              ? "Nothing waiting for you right now"
              : `${waiting} ${waiting === 1 ? "question" : "questions"} matched to your proof`
          }
          count={waiting}
        />
      ) : (
        <RailAction
          href="/ask/verify"
          active={pathname === "/ask/verify"}
          icon={<ShieldIcon size={15} />}
          label="Verify yourself"
          note="Prove what you know, then answer in that area"
        />
      )}

      {signedIn ? (
        <RailAction
          href="/ask/my-questions"
          active={pathname === "/ask/my-questions"}
          icon={<LockIcon size={14} />}
          label="My questions"
          note={
            myQuestions.length === 0
              ? "You have not asked anything yet"
              : `${myQuestions.length} asked`
          }
          dot={unread > 0}
        />
      ) : (
        <button
          type="button"
          onClick={() => openAuth("signin")}
          className="w-full cursor-pointer rounded-[14px] border border-veil/12 p-4 text-left text-[13.5px] text-muted transition-colors duration-300 outline-none hover:border-veil/26 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
        >
          <span className="block font-medium text-cream">Sign in</span>
          <span className="mt-1 block text-[12px] leading-[1.5] text-dim">
            To ask, to answer, and to see your own questions
          </span>
        </button>
      )}
    </aside>
  );
}

function RailAction({
  href,
  active,
  icon,
  label,
  note,
  count,
  dot,
  primary,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  note: string;
  /** Shown as a pill. Zero renders nothing rather than a "0". */
  count?: number;
  /** A single unread marker, where a number would be false precision. */
  dot?: boolean;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-spotlight
      className="flex items-start gap-3 rounded-[14px] border p-4 transition-[border-color,background,transform] duration-300 ease-ohq outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-positive/60"
      style={{
        borderColor: active || primary ? PRIVATE_LINE : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
        background: active || primary ? PRIVATE_SOFT : "transparent",
      }}
    >
      <span
        aria-hidden
        className="mt-px shrink-0"
        style={{ color: PRIVATE_COLOR }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium text-cream">{label}</span>
          {/* The dot carries no number on purpose: "you have something waiting"
              is the whole message, and a count invites counting rather than
              opening. */}
          {dot ? (
            <span
              aria-label="New answer"
              className="h-[7px] w-[7px] shrink-0 rounded-full bg-positive"
            />
          ) : null}
          {count !== undefined && count > 0 ? (
            <span className="rounded-full border border-positive/40 bg-positive/12 px-2 py-px font-mono text-[10.5px] text-positive-light">
              {count}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-[12px] leading-[1.5] text-dim">{note}</span>
      </span>
    </Link>
  );
}
