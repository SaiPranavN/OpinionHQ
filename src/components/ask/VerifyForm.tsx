"use client";

/**
 * `/ask/verify` — one page, no queue.
 *
 * There is no separate contributor sign-up. This adds proof to the account you
 * already have: pick the area, say what you do, tick what you can show. In the
 * prototype it approves instantly, because a review step sits between you and
 * the workflow you are trying to see. In production these same submissions go
 * to a reviewer who approves each label individually — what gets published does
 * not change, only who decides it.
 *
 * The form asks for the *class* of proof, never the proof. There is no upload
 * field here because there is no field for a document on `Credential` either.
 */

import Link from "next/link";
import { useState } from "react";

import { useAsk } from "@/components/ask/AskProvider";
import {
  AskCategoryIcon,
  CredentialChip,
  Field,
  LockIcon,
  PRIVATE_COLOR,
  PRIVATE_LINE,
  PRIVATE_SOFT,
  ShieldIcon,
  askInput,
  askPrimary,
  askQuiet,
  askSecondary,
} from "@/components/ask/primitives";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Brand } from "@/components/ui/Brand";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { relativeTime } from "@/lib/ask/derive";
import { ASK_CATEGORIES, askCategory } from "@/lib/ask/taxonomy";
import { proofKindsFor } from "@/lib/ask/verification";
import type { AskCategoryId, ProofType } from "@/lib/ask/types";

export function VerifyForm() {
  const { myCredentials, verifyMe, unverify, isProfessional, ready } = useAsk();
  const { signedIn, ready: sessionReady, openAuth, displayName } = usePrototype();

  const [category, setCategory] = useState<AskCategoryId>("career");
  const [proofs, setProofs] = useState<ProofType[]>([]);
  const [headline, setHeadline] = useState("");
  const [expertise, setExpertise] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!headline.trim()) return setError("Add the role or qualification you want shown.");
    if (proofs.length === 0) return setError("Tick at least one thing you can show.");
    setError(null);
    verifyMe(category, proofs, {
      headline: headline.trim(),
      expertise: expertise
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    });
    setProofs([]);
  };

  if (!ready || !sessionReady) return null;

  if (!signedIn) {
    return (
      <Shell>
        <div className="ohq-panel flex flex-col items-center gap-4 px-5 py-[clamp(48px,8vw,90px)] text-center">
          <span style={{ color: PRIVATE_COLOR }}>
            <ShieldIcon size={26} />
          </span>
          <h1 className="m-0 font-display font-bold text-[clamp(1.8rem,3.6vw,2.8rem)] tracking-[-0.02em] leading-[1.05] text-cream-bright">
            Sign in first
          </h1>
          <p className="m-0 max-w-[440px] text-[14px] leading-[1.6] font-light text-muted">
            Proof attaches to your account — the same one you ask questions with. There is
            no separate professional sign-up.
          </p>
          <button
            type="button"
            onClick={() => openAuth("signin", "/ask/verify")}
            className={askPrimary}
          >
            Sign in
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-col gap-3">
        <h1 className="m-0 font-display font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.04] tracking-[-0.024em] text-cream-bright">
          Show what you can <em className="italic">prove</em>
        </h1>
        <p className="m-0 max-w-[640px] text-[14px] leading-[1.6] font-light text-muted">
          Same account, one extra attribute. {displayName || "You"} can already ask
          questions — this is what lets you answer them. Proof is per area, and it is the
          claim rather than a generic tick that appears next to your answers.
        </p>
      </header>

      {myCredentials.length > 0 ? (
        <section
          className="mt-6 flex flex-col gap-3.5 rounded-[18px] border p-5"
          style={{ borderColor: PRIVATE_LINE, background: PRIVATE_SOFT }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2" style={{ color: PRIVATE_COLOR }}>
              <ShieldIcon size={14} />
              <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase">
                Verified — you can answer in{" "}
                {[...new Set(myCredentials.map((c) => askCategory(c.category).short))].join(", ")}
              </span>
            </span>
            {isProfessional ? (
              <Link href="/ask" className={askSecondary}>
                See questions for you
              </Link>
            ) : null}
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {myCredentials.map((credential) => (
              <li key={credential.id} className="flex flex-wrap items-center gap-3">
                <CredentialChip credential={credential} />
                <span className="text-[11.5px] text-dim">
                  {credential.evidenceCategory} · {relativeTime(credential.verifiedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => unverify(credential.id)}
                  className={`${askQuiet} ml-auto border-veil/14 text-muted hover:border-veil/28`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="ohq-panel flex flex-col gap-6 p-5 sm:p-7">
          <Field label="Which area can you answer in?">
            <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-3">
              {ASK_CATEGORIES.map((item) => {
                const active = category === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(item.id);
                        setProofs([]);
                      }}
                      aria-pressed={active}
                      className={`flex h-full w-full cursor-pointer flex-col gap-2 rounded-[14px] border p-3.5 text-left transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                        active
                          ? "border-positive/45 bg-positive/8"
                          : "border-veil/10 hover:border-veil/24"
                      }`}
                    >
                      <span style={{ color: active ? "#4ED27C" : PRIVATE_COLOR }}>
                        <AskCategoryIcon category={item.id} size={17} />
                      </span>
                      <span className="text-[13.5px] font-semibold text-cream-bright">
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <span className="text-[11.5px] leading-[1.5] text-dim">
              One area at a time. Being verified in one grants nothing in another — proof
              of employment says nothing about college admissions.
            </span>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="What do you do?" hint="Shown under your name on an answer">
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value.slice(0, 60))}
                placeholder="e.g. Senior Software Engineer"
                className={askInput}
              />
            </Field>
            <Field label="What do you know about?" hint="Comma separated — used for matching">
              <input
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="frontend, cloud, hiring"
                className={askInput}
              />
            </Field>
          </div>

          <Field label="What can you show?">
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {proofKindsFor(category).map((kind) => {
                const active = proofs.includes(kind.id);
                return (
                  <li key={kind.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setProofs((prev) =>
                          prev.includes(kind.id)
                            ? prev.filter((p) => p !== kind.id)
                            : [...prev, kind.id],
                        )
                      }
                      aria-pressed={active}
                      className={`flex w-full cursor-pointer items-start gap-3 rounded-[12px] border p-3.5 text-left transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                        active
                          ? "border-positive/45 bg-positive/8"
                          : "border-veil/10 hover:border-veil/24"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border text-[11px] ${
                          active ? "border-positive bg-positive text-positive-ink" : "border-veil/22"
                        }`}
                      >
                        {active ? "✓" : ""}
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className="text-[13px] font-semibold text-cream">
                          {kind.evidenceLabel}
                        </span>
                        <span className="text-[12px] leading-[1.5] text-muted">
                          Your answers would show:{" "}
                          <strong className="font-medium text-positive-light">
                            {kind.publicLabel}
                          </strong>
                        </span>
                        <span className="text-[11.5px] leading-[1.5] text-dim">
                          Does not establish: {kind.notVerified}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Field>

          {error ? (
            <p role="alert" className="m-0 text-[13px] text-negative-light">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
            <button type="button" onClick={submit} className={askPrimary}>
              <ShieldIcon size={14} />
              Verify me
            </button>
            <span className="text-[12px] text-dim">
              Instant in the prototype. Reviewed by a person in production.
            </span>
          </div>
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--ohq-nav-h)+24px)] lg:self-start">
          <div
            className="flex flex-col gap-3 rounded-[18px] border p-5"
            style={{ borderColor: PRIVATE_LINE, background: PRIVATE_SOFT }}
          >
            <span className="flex items-center gap-2" style={{ color: PRIVATE_COLOR }}>
              <LockIcon size={14} />
              <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase">
                What is never shown
              </span>
            </span>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12.5px] leading-[1.55] text-soft">
              {[
                "Your work email address",
                "Employee or student number",
                "ID card, certificate or scorecard image",
                "Rank or registration numbers",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="pt-px text-veil/25">
                    ·
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <p
              className="m-0 border-t pt-3 text-[11.5px] leading-[1.6] text-dim"
              style={{ borderColor: PRIVATE_LINE }}
            >
              Only the outcome sentence is published. <Brand /> checks credentials; it does
              not assess the quality of anybody&rsquo;s advice.
            </p>
          </div>

          <p className="m-0 rounded-[12px] border border-dashed border-veil/12 bg-veil/2 p-4 text-[12px] leading-[1.6] text-dim">
            <strong className="font-medium text-soft">Prototype.</strong> There is no
            upload in this build and nothing you type leaves the browser. Verification
            approves immediately so the whole workflow can be walked end to end.
          </p>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1080px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8">
      <div className="mb-5">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Ask Verified", href: "/ask" },
            { label: "Verify" },
          ]}
        />
      </div>
      {children}
    </section>
  );
}
