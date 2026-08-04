/**
 * The extra warning that sits on approval polls about named real people.
 *
 * Everything in this prototype is invented, and the standing "Sample data"
 * badge says so. These polls need more than a badge.
 *
 * An invented cross-tab on a chai-versus-coffee poll is obviously a mock-up.
 * An invented approval series against a named living politician, drawn as a
 * clean time series with dated events beside it, is the exact visual grammar
 * real polling uses — a screenshot of it, separated from the badge in the
 * corner, is indistinguishable from a real tracker. The repository's topics
 * fixtures avoid this by naming offices instead of people; these polls
 * deliberately do not, so the disclaimer has to be part of the content rather
 * than part of the chrome.
 *
 * It is placed above the chart, not below it, and it is not dismissible.
 */
export function ApprovalNotice() {
  return (
    <aside
      className="flex items-start gap-3 rounded-[14px] border p-4 sm:p-5"
      style={{
        borderColor: "color-mix(in oklab, #F0A83C 40%, transparent)",
        background: "color-mix(in oklab, #F0A83C 8%, transparent)",
      }}
    >
      <span aria-hidden className="mt-px shrink-0 text-[15px] text-[#F0A83C]">
        ⚠
      </span>
      <p className="m-0 text-[13px] leading-[1.6] text-soft">
        <strong className="font-semibold text-[#F0A83C]">
          These numbers are invented.
        </strong>{" "}
        This is a design prototype. No survey was conducted, nobody was sampled,
        and every figure and dated event below was written to demonstrate the
        chart — including the approval percentages attached to a real, named
        person. Nothing here should be quoted, screenshotted or cited as
        polling, and no inference about anybody&rsquo;s actual public standing
        can be drawn from it.
      </p>
    </aside>
  );
}
