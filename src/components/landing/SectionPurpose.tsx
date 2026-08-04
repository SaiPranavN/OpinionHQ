/**
 * The one-line "what this solves" statement that leads every landing section.
 *
 * A visitor who lands mid-page should be able to read one line and know what
 * problem the section is about. The sections already had prose, but prose
 * explains *how something works* to somebody who has already decided to care —
 * this is the sentence that earns the reading.
 *
 * Written as problem → answer, in that order and in that shape everywhere.
 * The problem half is the part people recognise themselves in; leading with
 * the solution asks them to take the problem on trust.
 */
export function SectionPurpose({
  problem,
  solution,
  align = "center",
}: {
  /** What is broken today, in the reader's words. */
  problem: string;
  /** What OpinionHQ does about it. */
  solution: string;
  align?: "center" | "left";
}) {
  return (
    <p
      className={`m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13.5px] leading-[1.5] ${
        align === "center" ? "justify-center text-center" : "text-left"
      }`}
    >
      <span className="text-dim">{problem}</span>
      <span aria-hidden className="text-positive/60">
        →
      </span>
      <span className="font-medium text-soft">{solution}</span>
    </p>
  );
}
