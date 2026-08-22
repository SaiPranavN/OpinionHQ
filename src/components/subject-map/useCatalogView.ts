"use client";

/**
 * Which rendering of a catalogue this browser prefers, remembered.
 *
 * THE LIST IS THE DEFAULT. It is the plain, scannable, linkable form of the
 * catalogue and the one that works everywhere without explanation; the map is
 * the richer way to explore, and somebody who wants it can say so once and
 * have it remembered. Defaulting the other way put an interactive canvas in
 * front of readers who only wanted to see what was published.
 *
 * The choice is shared across both catalogues on purpose: somebody who prefers
 * the map on Topics wants it on Polls too, and making them ask twice is the
 * kind of thing that reads as the preference not having been taken seriously.
 *
 * `useSyncExternalStore` rather than an effect. localStorage is an external
 * store and this is exactly the primitive for reading one: the server
 * snapshot is the default, the client snapshot is whatever was saved, and
 * React reconciles the two itself instead of us painting one and correcting
 * it a frame later.
 */

import { useCallback, useSyncExternalStore } from "react";

export type CatalogViewMode = "map" | "list";

const KEY = "ohq-catalog-view";

/** Same-tab writes need their own notification; `storage` only fires cross-tab. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStored(): CatalogViewMode {
  try {
    return window.localStorage.getItem(KEY) === "map" ? "map" : "list";
  } catch {
    // Private mode, or storage disabled entirely. A catalogue that throws on
    // load because of a view preference would be absurd.
    return "list";
  }
}

/** The server has no storage, and the list is what it renders. */
const serverSnapshot = (): CatalogViewMode => "list";

export function useCatalogView(): [CatalogViewMode, (next: CatalogViewMode) => void] {
  const view = useSyncExternalStore(subscribe, readStored, serverSnapshot);

  const setView = useCallback((next: CatalogViewMode) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* the toggle still works for this session; it just will not persist */
    }
    for (const listener of listeners) listener();
  }, []);

  return [view, setView];
}
