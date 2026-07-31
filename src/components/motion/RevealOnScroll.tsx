"use client";

/**
 * Releases scroll-reveal elements as they enter the viewport, and plays the
 * two data-driven chart animations that go with them:
 *
 *   [data-reveal]  — fades/slides the element in (see .ohq-reveal in globals)
 *   [data-bar]     — grows a distribution bar to its `data-bar` percentage
 *   [data-line]    — draws an SVG path using a stroke-dashoffset sweep
 *
 * A timed fallback paints everything even if the observer never fires (e.g. a
 * short page where nothing crosses the threshold).
 */

import { useEffect } from "react";

function paint(el: Element) {
  if (el instanceof HTMLElement || el instanceof SVGElement) {
    el.setAttribute("data-shown", "true");
  }

  el.querySelectorAll<HTMLElement>("[data-bar]").forEach((bar) => {
    bar.style.width = `${bar.dataset.bar ?? 0}%`;
  });

  el.querySelectorAll<SVGPathElement>("[data-line]").forEach((path) => {
    try {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.transition = "none";
      path.style.strokeDashoffset = String(length);
      requestAnimationFrame(() => {
        path.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.2,.7,.2,1)";
        path.style.strokeDashoffset = "0";
      });
    } catch {
      // getTotalLength throws on a detached node; the path stays fully drawn.
    }
  });
}

export function RevealOnScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(document.querySelectorAll("[data-reveal]"));

    if (reduced) {
      targets.forEach(paint);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          paint(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "-8% 0px -12% 0px", threshold: 0.08 },
    );

    targets.forEach((el) => observer.observe(el));

    const fallback = window.setTimeout(() => {
      document.querySelectorAll("[data-reveal]").forEach(paint);
    }, 2200);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return null;
}
