"use client";

/**
 * Attaching images and GIFs. Pro only.
 *
 * THE UPLOAD HAPPENS ON SELECTION, not on publish. A file that only leaves the
 * browser when the form is submitted turns "publish" into an operation that can
 * fail slowly and halfway, and the author finds out after they thought they were
 * done. Uploading first means the picture is either there with a thumbnail or it
 * failed with a message, before anything else is at stake.
 *
 * The cost is orphans: a file uploaded and then abandoned sits in the bucket
 * with no row pointing at it. That is the right trade — storage is cheap and a
 * half-published contribution is not — but it does mean the bucket wants a sweep
 * for objects with no `contribution_media` row eventually.
 *
 * ALT TEXT IS ASKED FOR, NOT REQUIRED. Demanding it would get "image" typed into
 * every box, which is worse than nothing because a screen reader then announces
 * something confidently useless.
 */

import { useRef, useState } from "react";

import { MEDIA_MAX_COUNT, MEDIA_TYPES, mediaUrl } from "@/lib/media";
import { uploadMedia, type MediaDraft } from "@/lib/topics/contributions";

export function MediaPicker({
  media,
  onChange,
  accent = "#1DB954",
}: {
  media: MediaDraft[];
  onChange: (next: MediaDraft[]) => void;
  accent?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = media.length >= MEDIA_MAX_COUNT;

  async function take(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const room = MEDIA_MAX_COUNT - media.length;
      const next: MediaDraft[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        next.push(await uploadMedia(file));
      }
      onChange([...media, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That upload did not work.");
    } finally {
      setBusy(false);
      // Cleared so choosing the same file twice in a row still fires a change.
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={busy || full}
          onClick={() => input.current?.click()}
          className="cursor-pointer rounded-full border border-veil/14 px-3.5 py-2 text-[12.5px] font-medium text-muted transition-colors duration-300 outline-none hover:border-veil/34 hover:text-cream disabled:cursor-not-allowed disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-positive/50"
        >
          {busy ? "Uploading…" : full ? `${MEDIA_MAX_COUNT} is the limit` : "+ Image or GIF"}
        </button>
        <span className="text-[11.5px] text-dim">
          PNG, JPEG, WebP or GIF. Up to 5 MB each, {MEDIA_MAX_COUNT} at a time.
        </span>
        <input
          ref={input}
          type="file"
          accept={MEDIA_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => void take(e.target.files)}
        />
      </div>

      {error ? (
        <p className="m-0 text-[12.5px] text-negative-soft" role="alert">
          {error}
        </p>
      ) : null}

      {media.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
          {media.map((item, i) => (
            <li
              key={item.path}
              className="flex w-[168px] flex-col gap-1.5 rounded-[12px] border p-2"
              style={{ borderColor: `color-mix(in oklab, ${accent} 26%, transparent)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a just-uploaded
                  file at an unknown remote size; next/image wants a configured
                  domain and a known width, and this is a 168px thumbnail. */}
              <img
                src={mediaUrl(item.path)}
                alt={item.alt || "Attached image"}
                className="h-[104px] w-full rounded-[8px] object-cover"
              />
              <input
                value={item.alt}
                onChange={(e) => {
                  const next = [...media];
                  next[i] = { ...item, alt: e.target.value };
                  onChange(next);
                }}
                placeholder="Describe it"
                aria-label="Image description"
                className="w-full rounded-[7px] border border-veil/10 bg-surface-sunken px-2 py-1 text-[11.5px] text-cream outline-none focus:border-positive/50"
              />
              <button
                type="button"
                onClick={() => onChange(media.filter((_, n) => n !== i))}
                className="cursor-pointer self-start text-[11.5px] text-dim transition-colors hover:text-negative-soft"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
