"use client";

/**
 * A dropdown that matches the rest of the product.
 *
 * A native `<select>` is styled by the operating system, not by us: on macOS it
 * arrives with its own chrome, its own font and a light popup on a dark page,
 * which is why the sign-up form looked like two different applications stacked
 * on top of each other.
 *
 * So this is a real listbox rather than a prettier select — button plus popup,
 * with the keyboard contract written out: Up/Down move, Home/End jump, Enter
 * and Space choose, Escape closes, typing jumps to a matching option, and the
 * highlighted row is announced through `aria-activedescendant` without focus
 * ever leaving the button. That contract is the whole reason not to reach for a
 * div with a click handler.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  /** Renders as a non-selectable heading. Used to group a long list. */
  group?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  ariaLabel,
  id,
  invalid = false,
  describedBy,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Opening lands on the current choice, not on the top of the list — a
  // dropdown that forgets where you are makes you re-find it every time.
  useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!buttonRef.current?.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted row in view when it moves by keyboard.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  /** Type-ahead: "kar" jumps to Karnataka. Resets after a second of silence. */
  const jumpTo = (char: string) => {
    const now = Date.now();
    typed.current.text = now - typed.current.at > 1000 ? char : typed.current.text + char;
    typed.current.at = now;
    const needle = typed.current.text.toLowerCase();
    const found = options.findIndex((option) => option.label.toLowerCase().startsWith(needle));
    if (found >= 0) {
      setActive(found);
      if (!open) choose(found);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      e.preventDefault();
      jumpTo(e.key);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    }
  };

  return (
    <span className="relative block">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[11px] border bg-surface-sunken px-3.5 py-3 text-left text-[14px] outline-none transition-colors duration-200 ${
          invalid
            ? "border-negative/55"
            : open
              ? "border-positive/55"
              : "border-veil/12 hover:border-veil/24"
        } focus-visible:ring-2 focus-visible:ring-positive/40`}
      >
        <span className={`truncate ${selected ? "text-cream" : "text-dim"}`}>
          {selected?.label ?? placeholder}
        </span>
        <Chevron open={open} />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="ohq-suggestions absolute top-[calc(100%+6px)] right-0 left-0 z-50 m-0 max-h-[264px] list-none overflow-y-auto rounded-[14px] border border-veil/14 bg-surface-raised p-1.5 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.92)]"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-[13.5px] transition-colors duration-150 ${
                  i === active ? "bg-positive/12 text-cream-bright" : "text-soft"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Tick /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className={`shrink-0 text-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="shrink-0 text-positive-light">
      <path d="M2 6.5L4.8 9.2 10 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
