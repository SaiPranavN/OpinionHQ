import { SuggestionQueue } from "@/components/admin/SuggestionQueue";

/**
 * Subjects members have asked for.
 *
 * An editor's screen, not an admin's: deciding what the site covers is the
 * editorial job, and it is the same person who would then write the topic. The
 * two audited functions behind the buttons check `is_editor()` themselves, so
 * this page being reachable is not what grants the power.
 */
export const metadata = { title: "Suggestions · Editorial desk" };
export const dynamic = "force-dynamic";

export default function AdminSuggestions() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 font-display text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.018em] text-cream-bright">
          Suggestions
        </h2>
        <p className="m-0 max-w-[72ch] text-[13px] leading-[1.6] font-light text-muted">
          Approving creates an <em>unpublished</em> draft carrying the suggester&rsquo;s
          name, and drops you into the editor to finish it. Nothing here reaches the
          site on its own.
        </p>
      </div>

      <SuggestionQueue />
    </div>
  );
}
