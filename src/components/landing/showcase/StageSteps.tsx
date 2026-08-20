"use client";

/**
 * The showcase stage, walked through one act at a time.
 *
 * The stage used to be one long panel: the reading, the cross-tabs, the aspects
 * and the written half, stacked, and a reader met all four at once and scrolled
 * past most of them. It is now four steps. The section pins, and the scroll
 * gesture advances the act rather than the page, so each part gets the screen to
 * itself and a sentence saying what it is for.
 *
 * ── Nothing is hidden from anybody ──────────────────────────────────────────
 *
 * On a phone, and under `prefers-reduced-motion`, `scrubbing` is false and every
 * act renders stacked exactly as it always did — with the one-line explanations
 * kept, because those turned out to be the better half of this change and cost
 * nothing. So the stepper is an enhancement on top of a page that is complete
 * without it, rather than a mode that some visitors are locked out of.
 *
 * ── Why the steps overlap ───────────────────────────────────────────────────
 *
 * Each act is placed by its *signed distance from the centre of its own band*,
 * not by a boolean "is this the current step". The difference is the whole feel
 * of the thing: a boolean gives you four hard cuts, whereas a distance gives a
 * continuous crossfade in which the outgoing act is still leaving as the next
 * one arrives, and both are moving in the same direction the page would be.
 */

import { FitBox } from "@/components/motion/FitBox";
import { activeStep, stepPlacement } from "@/lib/motion/scene";

export interface Step {
  n: string;
  title: string;
  /** One line saying what this act is for. Shown in both layouts. */
  line: string;
  body: React.ReactNode;
}

export function StageSteps({
  steps,
  progress,
  scrubbing,
}: {
  steps: Step[];
  progress: number;
  scrubbing: boolean;
}) {
  if (!scrubbing) {
    return (
      <div className="flex flex-col gap-[clamp(26px,3.4vw,42px)]">
        {steps.map((step) => (
          <section key={step.n} data-reveal className="ohq-reveal flex flex-col gap-3.5">
            <StepHeading step={step} />
            {step.body}
          </section>
        ))}
      </div>
    );
  }

  // Which act the reader is on, for the rail and the heading. Rounded from the
  // same number that places the acts, so the label can never disagree with what
  // is on screen.
  const active = activeStep(progress, steps.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <StepRail steps={steps} active={active} progress={progress} />

      {/* One heading slot, holding whichever act's heading is current. Keeping
          it out of the crossfade means the reader always has a stable place to
          look for "what am I being shown", rather than the title travelling with
          the panel it names. */}
      <StepHeading step={steps[active]!} />

      <div className="relative min-h-0 flex-1">
        {steps.map((step, i) => {
          const at = stepPlacement(progress, i, steps.length);
          if (!at.visible) return null;
          return (
            <div
              key={step.n}
              aria-hidden={i !== active}
              className="absolute inset-0 flex min-h-0 flex-col"
              style={{
                opacity: at.opacity,
                transform: `translateY(${at.y.toFixed(1)}px) scale(${at.scale.toFixed(4)})`,
                // The act that is on its way out must not swallow a click meant
                // for the one arriving — the cross-tabs are interactive, and two
                // overlapping copies of them would both respond.
                pointerEvents: i === active ? "auto" : "none",
                willChange: "transform, opacity",
              }}
            >
              <FitBox className="flex-1">{step.body}</FitBox>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepHeading({ step }: { step: Step }) {
  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-positive-light">
          {step.n}
        </span>
        <h3 className="font-display m-0 text-[15px] leading-[1.25] font-semibold tracking-[-0.015em] text-cream-bright sm:text-[16.5px]">
          {step.title}
        </h3>
        <span aria-hidden className="ohq-rule h-px min-w-0 flex-1 bg-veil/12" />
      </div>
      {/* The one-line explanation. The acts were numbered and titled before and
          a title is a label, not a reason — "Who took part" says what the panel
          contains and nothing about why a reader should care. */}
      <p className="m-0 text-[12.5px] leading-[1.5] text-dim">{step.line}</p>
    </header>
  );
}

/**
 * Where the reader is, and how far there is to go.
 *
 * A pinned section takes the scroll gesture away and gives back something else,
 * and the one thing that makes that acceptable rather than alarming is being
 * able to see that it is finite. Four segments, filling.
 */
function StepRail({
  steps,
  active,
  progress,
}: {
  steps: Step[];
  active: number;
  progress: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const fill = Math.min(1, Math.max(0, progress * steps.length - i));
        return (
          <span key={step.n} className="flex min-w-0 flex-1 items-center gap-2">
            <span className="relative h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-veil/10">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-positive"
                style={{ width: `${(fill * 100).toFixed(1)}%` }}
              />
            </span>
            <span
              className={`shrink-0 font-mono text-[9.5px] tracking-[0.12em] transition-colors duration-300 ${
                i <= active ? "text-positive-light" : "text-dim"
              }`}
            >
              {step.n}
            </span>
          </span>
        );
      })}
    </div>
  );
}
