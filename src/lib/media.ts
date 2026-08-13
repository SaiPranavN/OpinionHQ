/**
 * Attachments on a contribution, shared by the server read and the browser write.
 *
 * NO `"use client"`, deliberately. `queries.ts` maps media rows during a server
 * render and the composer uploads them in the browser, so the URL rule has to be
 * reachable from both. Putting it in the client module and importing it back
 * into a server component is the kind of thing that works until a build steps on
 * it.
 *
 * The public URL is composed from the project URL rather than asked for through
 * `storage.getPublicUrl()`, which needs a client instance. For a public bucket
 * that call is a string join with extra steps, and this way there is no client
 * to construct on a path that only needs to format a string.
 */

import type { ContributionMedia } from "@/lib/types";

export const MEDIA_BUCKET = "contributions";

/** What the bucket accepts. Mirrored in `allowed_mime_types` on the bucket. */
export const MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
/** Four. A contribution is an argument with pictures, not an album. */
export const MEDIA_MAX_COUNT = 4;

export function mediaUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export interface MediaRow {
  id: string;
  opinion_id?: string | null;
  poll_reason_id?: string | null;
  storage_path: string;
  kind: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export function toMedia(row: MediaRow): ContributionMedia {
  return {
    id: row.id,
    url: mediaUrl(row.storage_path),
    kind: row.kind === "gif" ? "gif" : "image",
    alt: row.alt ?? "",
    width: row.width,
    height: row.height,
  };
}
