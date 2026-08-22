"use client";

/**
 * The subject map: a catalogue as a bounded, draggable, zoomable field of
 * circles. Used as the Topic map and the Poll map; the only difference
 * between them is the accent and what the arcs mean.
 *
 * Division of labour, deliberately strict:
 *   lib/subject-map/layout.ts  — where every circle is (pure, tested)
 *   lib/subject-map/camera.ts  — what the camera may do (pure, tested)
 *   lib/subject-map/flight.ts  — how it moves (pure, tested)
 *   useMapCamera               — the engine that drives it, at frame rate
 *   useMapGestures             — pointers, pinches, taps vs drags
 *   this file                  — selection, detail tiers, entrances/exits,
 *                                search flights, URL, accessibility
 *
 * The one performance rule everything here obeys: THE CAMERA NEVER RENDERS
 * REACT. Panning and zooming write one transform to the world element and a
 * few CSS variables to circles near the viewport; React re-renders only when
 * something coarse changes — the detail tier crossing a threshold, a
 * selection, the subject list itself.
 */

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MapControls } from "@/components/subject-map/MapControls";
import { SubjectCircle } from "@/components/subject-map/SubjectCircle";
import {
  useMapCamera,
  type CameraEnv,
} from "@/components/subject-map/useMapCamera";
import {
  useMapGestures,
  type GestureCallbacks,
} from "@/components/subject-map/useMapGestures";
import {
  detailTier,
  focusZoom,
  inspectZoom,
  lensScale,
  zoomAtPoint,
  zoomLimits,
  clampZoom,
  LENS_EDGE,
  LENS_EDGE_OPACITY,
  type CameraState,
  type DetailTier,
  type Viewport,
} from "@/lib/subject-map/camera";
import {
  CIRCLE_DIAMETER,
  layoutCluster,
  type CirclePosition,
} from "@/lib/subject-map/layout";
import type { MapSubject } from "@/lib/subject-map/subjects";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

/** Above this many circles the per-frame lens switches off. */
const FLOURISH_LIMIT = 280;
/** Screen margin (px) beyond which a circle just gets the edge lens value. */
const LENS_MARGIN = 260;
/**
 * Below this many circles nothing is ever culled. Mounting a hundred small
 * divs costs less than the bookkeeping to avoid it, and a catalogue that
 * small is entirely on screen at most zoom levels anyway.
 */
const CULL_THRESHOLD = 120;
/** Extra world-space margin mounted around the viewport, in viewport-widths. */
const OVERSCAN = 0.6;

interface WorldRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** The world rectangle the viewport currently shows, grown by the overscan. */
function overscanRect(camera: CameraState, viewport: Viewport): WorldRect {
  const halfW = viewport.width / (2 * camera.z);
  const halfH = viewport.height / (2 * camera.z);
  return {
    minX: camera.x - halfW * (1 + OVERSCAN * 2),
    maxX: camera.x + halfW * (1 + OVERSCAN * 2),
    minY: camera.y - halfH * (1 + OVERSCAN * 2),
    maxY: camera.y + halfH * (1 + OVERSCAN * 2),
  };
}

function rectContains(outer: WorldRect, inner: WorldRect): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

export function SubjectMap({
  subjects,
  accent,
  focusRequest,
  label,
}: {
  subjects: MapSubject[];
  accent: "positive" | "poll";
  /** A search landing: fly to this subject. `nonce` distinguishes repeats. */
  focusRequest: { id: string; nonce: number } | null;
  /** Accessible name for the map region. */
  label: string;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const lensCache = useRef(new Map<string, { s: number; o: number }>());

  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [tier, setTier] = useState<DetailTier>("dot");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [pointerFine, setPointerFine] = useState(false);
  const [ghosts, setGhosts] = useState<{ subject: MapSubject; position: CirclePosition }[]>([]);
  /**
   * The world-space rectangle currently mounted, or null for "all of it".
   *
   * Culling only earns its keep when zoomed in, where most of the cluster is
   * off-screen; at the overview every circle is visible and a window would be
   * pure bookkeeping. It is deliberately coarse — see `recull` for why it
   * updates a few times per pan rather than a few times per second.
   */
  const [window_, setWindow] = useState<WorldRect | null>(null);
  /**
   * Which circles should play the arrival animation. `null` is the opening
   * bloom — everything, staggered by ring — and it is replaced by a real set
   * a second later, after which only genuinely new subjects animate in.
   *
   * This has to be tracked rather than left to CSS: a keyframe plays whenever
   * its element is inserted, and culling inserts circles constantly as the
   * viewer pans. Without this the map would pop every circle into existence
   * as it scrolled past, which reads as the catalogue still loading.
   */
  const [entering, setEntering] = useState<Set<string> | null>(null);

  const layout = useMemo(() => layoutCluster(subjects), [subjects]);
  /* ------------------------------------------------------- live references */

  // Mirrors for the frame loop and event handlers, synced before paint. The
  // loop must never close over stale state, and must never render to read it.
  const reducedRef = useRef(reduced);
  const selectedRef = useRef(selectedId);
  const layoutRef = useRef(layout);
  const tierRef = useRef(tier);
  useLayoutEffect(() => {
    reducedRef.current = reduced;
    selectedRef.current = selectedId;
    layoutRef.current = layout;
    tierRef.current = tier;
  }, [reduced, selectedId, layout, tier]);

  const limits = useMemo(
    () =>
      viewport.width > 0
        ? zoomLimits(viewport, layout.bounds, CIRCLE_DIAMETER)
        : { min: 0.2, max: 3 },
    [viewport, layout.bounds],
  );

  const envRef = useRef<CameraEnv>({ viewport, bounds: layout.bounds, limits });
  useLayoutEffect(() => {
    envRef.current = { viewport, bounds: layout.bounds, limits };
  }, [viewport, layout.bounds, limits]);

  /* ------------------------------------------------------------ the camera */

  const autoFocusGuard = useRef(false);
  const windowRef = useRef<WorldRect | null>(null);

  const onFrame = useCallback((camera: CameraState, vp: Viewport) => {
    // Detail tier — a React render, but only at threshold crossings.
    const nextTier = detailTier(CIRCLE_DIAMETER * camera.z);
    if (nextTier !== tierRef.current) {
      tierRef.current = nextTier;
      setTier(nextTier);
    }

    /**
     * Culling, with hysteresis in both directions.
     *
     * Two things force a recount, and it needs both. Panning is the obvious
     * one: the visible rectangle escapes the overscanned one we last mounted.
     * Zooming IN is the one that is easy to miss — the visible rectangle only
     * ever shrinks *inside* the mounted one, so containment alone is happy to
     * keep the whole cluster mounted all the way to maximum zoom, which is
     * precisely the case culling exists for. So a window that has become far
     * larger than the view needs is also grounds for a recount.
     *
     * Between those two triggers a pan across the cluster re-renders a
     * handful of times rather than sixty times a second, and a small jiggle
     * re-renders nothing at all.
     */
    const placedCount = layoutRef.current.placed.length;
    if (placedCount > CULL_THRESHOLD) {
      const halfW = vp.width / (2 * camera.z);
      const halfH = vp.height / (2 * camera.z);
      const visible: WorldRect = {
        minX: camera.x - halfW,
        maxX: camera.x + halfW,
        minY: camera.y - halfH,
        maxY: camera.y + halfH,
      };
      const current = windowRef.current;
      const next = overscanRect(camera, vp);
      const escaped = !current || !rectContains(current, visible);
      const oversized =
        !!current && current.maxX - current.minX > (next.maxX - next.minX) * 2.5;
      if (escaped || oversized) {
        windowRef.current = next;
        setWindow(next);
      }
    } else if (windowRef.current) {
      windowRef.current = null;
      setWindow(null);
    }

    // Background parallax: the field drifts a little against the circles so
    // panning reads as moving through space, not sliding a poster.
    const bg = parallaxRef.current;
    if (bg) {
      bg.style.transform = `translate3d(${(-camera.x * camera.z * 0.045).toFixed(1)}px, ${(-camera.y * camera.z * 0.045).toFixed(1)}px, 0)`;
    }

    // The lens. Pure arithmetic per circle; DOM writes only on real change.
    const placed = layoutRef.current.placed;
    if (placed.length <= FLOURISH_LIMIT) {
      const cache = lensCache.current;
      for (const { subject, position } of placed) {
        const el = cellRefs.current.get(subject.id);
        if (!el) continue;
        const sx = (position.x - camera.x) * camera.z + vp.width / 2;
        const sy = (position.y - camera.y) * camera.z + vp.height / 2;
        let s: number;
        let o: number;
        if (subject.id === selectedRef.current) {
          // Selection outranks the lens: the chosen circle stays dominant.
          s = 1.09;
          o = 1;
        } else if (
          sx < -LENS_MARGIN ||
          sx > vp.width + LENS_MARGIN ||
          sy < -LENS_MARGIN ||
          sy > vp.height + LENS_MARGIN
        ) {
          s = LENS_EDGE;
          o = LENS_EDGE_OPACITY;
        } else {
          const lens = lensScale(sx, sy, vp);
          s = lens.scale;
          o = lens.opacity;
        }
        const prev = cache.get(subject.id);
        if (!prev || Math.abs(prev.s - s) > 0.004 || Math.abs(prev.o - o) > 0.008) {
          el.style.setProperty("--k-lens", s.toFixed(3));
          el.style.setProperty("--k-fade", o.toFixed(3));
          cache.set(subject.id, { s, o });
        }
      }
    }

    // Maximum zoom with nothing selected: adopt the circle nearest centre, so
    // the deepest zoom level always has a subject rather than a gap.
    if (
      !selectedRef.current &&
      camera.z >= envRef.current.limits.max * 0.98 &&
      !autoFocusGuard.current &&
      placed.length > 0
    ) {
      autoFocusGuard.current = true;
      let best: string | null = null;
      let bestDist = Infinity;
      for (const { subject, position } of placed) {
        const d = Math.hypot(position.x - camera.x, position.y - camera.y);
        if (d < bestDist) {
          bestDist = d;
          best = subject.id;
        }
      }
      if (best) setSelectedId(best);
    }
    if (camera.z < envRef.current.limits.max * 0.9) autoFocusGuard.current = false;
  }, []);

  const camera = useMapCamera({ worldRef, envRef, reducedRef, onFrame });

  /* --------------------------------------------------- selection machinery */

  const cameraHistory = useRef<CameraState[]>([]);

  const syncUrl = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("focus", id);
    else url.searchParams.delete("focus");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const select = useCallback(
    (id: string) => {
      const position = layoutRef.current.byId.get(id);
      if (!position) return;
      const env = envRef.current;
      const cam = camera.get();
      if (selectedRef.current !== id) {
        cameraHistory.current.push(cam);
        if (cameraHistory.current.length > 12) cameraHistory.current.shift();
        setSelectedId(id);
        syncUrl(id);
        camera.flyTo({
          x: position.x,
          y: position.y,
          z: inspectZoom(cam.z, env.viewport, CIRCLE_DIAMETER, env.limits),
        });
      } else {
        // A second tap on the chosen circle leans all the way in.
        camera.flyTo({
          x: position.x,
          y: position.y,
          z: focusZoom(env.viewport, CIRCLE_DIAMETER, env.limits),
        });
      }
    },
    [camera, syncUrl],
  );

  const deselect = useCallback(() => {
    if (!selectedRef.current) return;
    setSelectedId(null);
    syncUrl(null);
    // No camera jump: losing a selection must not yank the viewer anywhere.
  }, [syncUrl]);

  const escape = useCallback(() => {
    if (!selectedRef.current) return;
    setSelectedId(null);
    syncUrl(null);
    const previous = cameraHistory.current.pop();
    if (previous) camera.flyTo(previous);
  }, [camera, syncUrl]);

  const gestureCallbacks = useRef<GestureCallbacks>({
    onTapEmpty: () => {},
    onDoubleCircle: () => {},
    onDoubleEmpty: () => {},
  });
  useLayoutEffect(() => {
    gestureCallbacks.current = {
    onTapEmpty: deselect,
    onDoubleCircle: (id) => {
      const env = envRef.current;
      const position = layoutRef.current.byId.get(id);
      if (!position) return;
      const atFocus = camera.get().z >= env.limits.max * 0.92;
      if (id === selectedRef.current && atFocus && pointerFine) {
        // Desktop: a double-click on the already-focused circle walks in.
        const subject = subjects.find((s) => s.id === id);
        if (subject) router.push(subject.href);
        return;
      }
      if (selectedRef.current !== id) {
        cameraHistory.current.push(camera.get());
        setSelectedId(id);
        syncUrl(id);
      }
      camera.flyTo({
        x: position.x,
        y: position.y,
        z: focusZoom(env.viewport, CIRCLE_DIAMETER, env.limits),
      });
    },
    onDoubleEmpty: (sx, sy) => {
      const env = envRef.current;
      const cam = camera.get();
      const z = clampZoom(cam.z / 2.1, env.limits);
      camera.flyTo(zoomAtPoint(cam, z, sx, sy, env.viewport));
    },
    };
  }, [camera, deselect, pointerFine, router, subjects, syncUrl]);

  useMapGestures({
    containerRef,
    camera,
    reducedRef,
    callbacksRef: gestureCallbacks,
  });

  /* ------------------------------------------------ environment & lifecycle */

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewport((prev) =>
          Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1
            ? { width: rect.width, height: rect.height }
            : prev,
        );
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const sync = () => setPointerFine(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Ambient animation pauses whenever the map is scrolled out of view or the
  // tab is hidden — an idle catalogue must cost nothing.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = (visible: boolean) => {
      el.setAttribute("data-asleep", visible && !document.hidden ? "false" : "true");
    };
    const observer = new IntersectionObserver(
      (entries) => apply(entries[0]?.isIntersecting ?? true),
      { threshold: 0.02 },
    );
    observer.observe(el);
    const onVisibility = () => apply(true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // First real measurement: place the camera. Phones open slightly closer
  // than the full overview so circles arrive at a tappable size.
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current || viewport.width === 0 || subjects.length === 0) return;
    initialised.current = true;
    const env = envRef.current;
    const isPhone = viewport.width < 640;
    const startZ = isPhone
      ? clampZoom(env.limits.min * 1.5, env.limits)
      : env.limits.min;
    camera.jump({ x: env.bounds.centerX, y: env.bounds.centerY, z: startZ });

    // ?focus= deep link: arrive at the overview, then fly to the subject.
    const focusParam = new URL(window.location.href).searchParams.get("focus");
    if (focusParam && layoutRef.current.byId.has(focusParam)) {
      setSelectedId(focusParam);
      const position = layoutRef.current.byId.get(focusParam)!;
      camera.flyTo({
        x: position.x,
        y: position.y,
        z: inspectZoom(startZ, env.viewport, CIRCLE_DIAMETER, env.limits),
      });
    }
  }, [viewport, subjects.length, camera]);

  // Viewport or cluster changed: re-clamp and repaint under the new rules.
  useEffect(() => {
    if (initialised.current) camera.refresh();
  }, [viewport, limits, layout, camera]);

  /* --------------------------------------- arrivals, departures, reshuffles */

  const prevLayout = useRef<typeof layout | null>(null);

  useEffect(() => {
    const prev = prevLayout.current;
    prevLayout.current = layout;
    if (!prev) {
      // The opening bloom: everything enters once, staggered by ring. Cleared
      // shortly after so that circles panned into view later — which are new
      // to the DOM but not new to the catalogue — arrive without fanfare.
      const timer = window.setTimeout(() => setEntering(new Set()), 1000);
      return () => window.clearTimeout(timer);
    }

    const added = new Set<string>();
    for (const { subject } of layout.placed) {
      if (!prev.byId.has(subject.id)) added.add(subject.id);
    }
    setEntering(added);

    // Departures hold their last position briefly and fade out.
    const removed = prev.placed.filter((p) => !layout.byId.has(p.subject.id));
    if (removed.length > 0 && removed.length < 400) {
      setGhosts((current) => {
        const keep = current.filter((g) => !layout.byId.has(g.subject.id));
        const ids = new Set(keep.map((g) => g.subject.id));
        return [...keep, ...removed.filter((r) => !ids.has(r.subject.id))];
      });
      const removedIds = new Set(removed.map((r) => r.subject.id));
      window.setTimeout(() => {
        setGhosts((current) => current.filter((g) => !removedIds.has(g.subject.id)));
      }, 300);
    }

    // A genuinely new subject at the centre announces itself with a ripple.
    const centre = layout.placed[0];
    if (centre && !prev.byId.has(centre.subject.id)) {
      setPulseId(centre.subject.id);
      window.setTimeout(() => setPulseId(null), 1100);
    }

    // Selection outlived the filter change? Follow it to its new cell.
    // Otherwise let go and settle back to the fitted overview.
    const selected = selectedRef.current;
    if (selected) {
      const position = layout.byId.get(selected);
      if (position) {
        camera.flyTo({ x: position.x, y: position.y });
      } else {
        setSelectedId(null);
        syncUrl(null);
        camera.fitAll(true);
      }
    }
  }, [layout, camera, syncUrl]);

  /* ------------------------------------------------------- search landings */

  const lastFocusNonce = useRef(0);
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === lastFocusNonce.current) return;
    lastFocusNonce.current = focusRequest.nonce;
    const position = layout.byId.get(focusRequest.id);
    if (!position) return;
    const env = envRef.current;
    cameraHistory.current.push(camera.get());
    setSelectedId(focusRequest.id);
    syncUrl(focusRequest.id);
    setPulseId(focusRequest.id);
    window.setTimeout(() => setPulseId(null), 1100);
    // The "large inspection" level: full title territory, short of max zoom.
    const z = clampZoom(
      (0.55 * Math.min(env.viewport.width, env.viewport.height)) / CIRCLE_DIAMETER,
      env.limits,
    );
    camera.flyTo({ x: position.x, y: position.y, z: Math.max(z, camera.get().z) });
  }, [focusRequest, layout, camera, syncUrl]);

  /* ----------------------------------------------------------- keyboard */

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const env = envRef.current;
    const centre = { x: env.viewport.width / 2, y: env.viewport.height / 2 };
    switch (e.key) {
      case "ArrowLeft":
        camera.panBy(-70, 0);
        break;
      case "ArrowRight":
        camera.panBy(70, 0);
        break;
      case "ArrowUp":
        camera.panBy(0, -70);
        break;
      case "ArrowDown":
        camera.panBy(0, 70);
        break;
      case "+":
      case "=":
        camera.flyTo(zoomAtPoint(camera.get(), clampZoom(camera.get().z * 1.45, env.limits), centre.x, centre.y, env.viewport));
        break;
      case "-":
      case "_":
        camera.flyTo(zoomAtPoint(camera.get(), clampZoom(camera.get().z / 1.45, env.limits), centre.x, centre.y, env.viewport));
        break;
      case "Escape":
        escape();
        return; // do not preventDefault twice
      default:
        return;
    }
    e.preventDefault();
  };

  /* ------------------------------------------------------------- render */

  const selectedSubject = selectedId
    ? subjects.find((s) => s.id === selectedId) ?? null
    : null;
  const half = CIRCLE_DIAMETER / 2;

  /**
   * What actually gets mounted. The selected circle is always in the set
   * whatever the window says — losing the DOM node of the thing the camera is
   * flying toward would take its action pill and its accessible name with it.
   */
  const mounted = useMemo(() => {
    if (!window_) return layout.placed;
    return layout.placed.filter(
      ({ subject, position }) =>
        subject.id === selectedId ||
        (position.x + half >= window_.minX &&
          position.x - half <= window_.maxX &&
          position.y + half >= window_.minY &&
          position.y - half <= window_.maxY),
    );
  }, [layout, window_, selectedId, half]);

  const fieldA = accent === "poll" ? "var(--color-poll)" : "var(--color-positive)";
  const fieldB = accent === "poll" ? "var(--color-positive)" : "var(--color-poll)";

  return (
    <div
      ref={containerRef}
      role="application"
      aria-roledescription="Draggable, zoomable map"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      /* One cursor for the whole canvas, and the circles inherit it. Two
         cursors — grab on the field, pointer on each circle — flickered on
         every boundary crossing as the pointer swept the cluster, which is
         most of what read as the "pointer glitch". A map is one surface you
         drag; the circles announce themselves by lighting up, not by
         swapping the cursor out from under you. */
      className={`ohq-map relative isolate w-full cursor-grab touch-none overflow-hidden rounded-[22px] border border-veil/8 select-none active:cursor-grabbing focus-visible:ring-2 ${
        accent === "poll" ? "focus-visible:ring-poll/50" : "focus-visible:ring-positive/50"
      }`}
      style={{
        height: "clamp(460px, calc(100dvh - var(--ohq-nav-h) - 200px), 880px)",
        background: "var(--color-ink)",
      }}
    >
      {/* -------------------------------------------------- background */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div ref={parallaxRef} className="absolute -inset-[22%]">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(85% 70% at 28% 22%, color-mix(in oklab, ${fieldA} 7%, transparent), transparent 62%), radial-gradient(80% 70% at 76% 84%, color-mix(in oklab, ${fieldB} 5%, transparent), transparent 64%), radial-gradient(130% 110% at 50% 45%, var(--color-ink-soft), var(--color-ink))`,
            }}
          />
          {/* Faint depth particles, on the parallax layer so they drift. */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--color-veil) 1px, transparent 1.4px)",
              backgroundSize: "96px 96px",
            }}
          />
        </div>
        <div className="ohq-map-noise absolute inset-0" />
        {/* Soft spotlight under the camera centre. */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(46% 42% at 50% 50%, color-mix(in oklab, ${fieldA} 4%, transparent), transparent 100%)`,
          }}
        />
        {/* Vignette. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(115% 115% at 50% 50%, transparent 58%, rgb(0 0 0 / 0.38) 100%)",
          }}
        />
      </div>

      {/* ------------------------------------------------------ world */}
      <div ref={worldRef} className="absolute top-0 left-0" style={{ transformOrigin: "0 0" }}>
        {mounted.map(({ subject, position }) => {
          const ring = position.ring;
          return (
            <div
              key={subject.id}
              ref={(el) => {
                if (el) cellRefs.current.set(subject.id, el);
                else cellRefs.current.delete(subject.id);
              }}
              data-circle-id={subject.id}
              className="ohq-map-cell absolute top-0 left-0"
              style={
                {
                  width: CIRCLE_DIAMETER,
                  height: CIRCLE_DIAMETER,
                  transform: `translate3d(${position.x - half}px, ${position.y - half}px, 0)`,
                  zIndex: subject.id === selectedId ? 30 : Math.max(20 - ring, 1),
                  "--k-dim": selectedId && subject.id !== selectedId ? "0.62" : "1",
                } as React.CSSProperties
              }
            >
              <div
                className={`h-full w-full ${
                  entering === null || entering.has(subject.id) ? "ohq-map-enter" : ""
                }`}
                style={
                  entering === null || entering.has(subject.id)
                    ? { animationDelay: `${Math.min(ring * 55, 440)}ms` }
                    : undefined
                }
              >
                <div className="ohq-map-lens relative h-full w-full">
                  <SubjectCircle
                    subject={subject}
                    tier={tier}
                    selected={subject.id === selectedId}
                    dimmed={selectedId !== null && subject.id !== selectedId}
                    pulse={pulseId === subject.id}
                    onSelect={select}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Departing circles: their last position, fading. */}
        {ghosts.map(({ subject, position }) => (
          <div
            key={`ghost-${subject.id}`}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0"
            style={{
              width: CIRCLE_DIAMETER,
              height: CIRCLE_DIAMETER,
              transform: `translate3d(${position.x - half}px, ${position.y - half}px, 0)`,
            }}
          >
            <div className="ohq-map-exit h-full w-full rounded-full border border-veil/10 bg-surface" />
          </div>
        ))}
      </div>

      <MapControls
        accent={accent}
        onZoomIn={() => {
          const env = envRef.current;
          const cam = camera.get();
          camera.flyTo(
            zoomAtPoint(cam, clampZoom(cam.z * 1.6, env.limits), env.viewport.width / 2, env.viewport.height / 2, env.viewport),
          );
        }}
        onZoomOut={() => {
          const env = envRef.current;
          const cam = camera.get();
          camera.flyTo(
            zoomAtPoint(cam, clampZoom(cam.z / 1.6, env.limits), env.viewport.width / 2, env.viewport.height / 2, env.viewport),
          );
        }}
        onFit={() => camera.fitAll(true)}
      />

      {/* What just got selected, for people who cannot see the flight. */}
      <p aria-live="polite" className="sr-only">
        {selectedSubject ? `Selected: ${selectedSubject.aria}` : ""}
      </p>
      <p className="sr-only">
        Interactive map. Drag or use arrow keys to pan, pinch, scroll or press
        plus and minus to zoom, Escape to step back out. A list view of the
        same catalogue is available from the view toggle above the map.
      </p>
    </div>
  );
}
