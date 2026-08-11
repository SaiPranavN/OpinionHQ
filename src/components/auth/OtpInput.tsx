"use client";

/**
 * The six-box verification code entry.
 *
 * Six boxes rather than one field because the code arrives as six digits and
 * people read it back in pairs; a single input makes them count characters.
 * The behaviours that make it not-annoying are the whole component: typing
 * advances, backspace on an empty box steps back and clears the previous one,
 * arrows move without editing, and a pasted code fills every box at once —
 * which is what nearly everybody actually does with a code they can see.
 *
 * One hidden detail worth keeping: each box is `inputMode="numeric"` with
 * `autoComplete="one-time-code"`, so a phone offers the code from its own
 * messages instead of making somebody switch apps to read it.
 */

import { useEffect, useRef } from "react";

import { shouldAutoSubmit } from "@/lib/auth/signup";

export function OtpInput({
  length,
  value,
  onChange,
  onComplete,
  invalid = false,
  describedBy,
}: {
  length: number;
  value: string;
  onChange: (next: string) => void;
  /** Fired when the last box is filled, so the form can submit itself. */
  onComplete?: (code: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  const write = (next: string) => {
    const digits = next.replace(/\D/g, "").slice(0, length);
    onChange(digits);
    // Only on the incomplete → complete transition. See `shouldAutoSubmit`:
    // firing whenever the field is full spends a verification attempt on every
    // keystroke someone makes while fixing a typo.
    if (shouldAutoSubmit(value, digits, length)) onComplete?.(digits);
    return digits;
  };

  const onBoxChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const next = (value.padEnd(length, " ").slice(0, index) + digit + value.slice(index + 1))
      .replace(/\s/g, "")
      .slice(0, length);
    const written = write(next);
    // Land on the first empty box rather than blindly index+1, so filling a
    // gap in the middle does not throw you to the end.
    const target = Math.min(Math.max(written.length, index + 1), length - 1);
    boxes.current[target]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) write(value.slice(0, index) + value.slice(index + 1));
      else if (index > 0) {
        write(value.slice(0, index - 1) + value.slice(index));
        boxes.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      boxes.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      boxes.current[index + 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const written = write(e.clipboardData.getData("text"));
    boxes.current[Math.min(written.length, length - 1)]?.focus();
  };

  return (
    <div
      className="flex gap-2 sm:gap-2.5"
      role="group"
      aria-label={`${length}-digit verification code`}
      aria-describedby={describedBy}
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => onBoxChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          className={`h-[54px] min-w-0 flex-1 rounded-[12px] border bg-surface-sunken text-center font-mono text-[20px] text-cream-bright outline-none transition-colors duration-200 ${
            invalid
              ? "border-negative/55"
              : value[i]
                ? "border-positive/45"
                : "border-veil/12"
          } focus:border-positive/70 focus-visible:ring-2 focus-visible:ring-positive/30`}
        />
      ))}
    </div>
  );
}
