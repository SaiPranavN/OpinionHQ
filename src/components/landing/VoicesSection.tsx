import { SectionPurpose } from "@/components/landing/SectionPurpose";
import { Brand } from "@/components/ui/Brand";
import { sentimentColor } from "@/lib/derive";
import { reasonsFor } from "@/lib/sample-data/poll-reasons";
import { opinionsFor } from "@/lib/sample-data/opinions";
import { POLL_A_COLOR, POLL_B_COLOR } from "@/lib/derive-poll";

/**
 * The written half of the product.
 *
 * Everything else on this page is about aggregation, which risks reading as
 * though OpinionHQ is only a chart. It is not: a percentage tells you what
 * people concluded, and only the writing tells you why. Both examples below
 * are real fixture records, so what the page promises is what the app renders.
 */
export function VoicesSection() {
  // A written opinion that carries a reply, and a pair of poll reasons taken
  // from opposite sides of the same question.
  const opinion = opinionsFor("upicharge").find((o) => o.thread && o.thread.length > 0)!;
  const reply = opinion.thread![0]!;
  const wfh = reasonsFor("wfh-office");
  const forA = wfh.find((r) => r.side === "a")!;
  const forB = wfh.find((r) => r.side === "b")!;

  const rules = [
    {
      title: "Every vote can carry its reasons",
      body: "A percentage is a conclusion. The written explanation underneath it is the argument, and it is the part people actually come back for.",
    },
    {
      title: "Replies go one level deep — and stop",
      body: "You can answer an opinion. You cannot answer the answer. Threads that nest forever stop being a discussion and become an argument with an audience.",
    },
    {
      title: "Polls carry reasons, not threads",
      body: "Two columns, one per side, nobody replying across the aisle. You read the best case for each choice instead of watching them fight.",
    },
    {
      title: "Opinion never gets dressed up as fact",
      body: "Participant writing is always labelled as somebody's view. Sourced developments sit on a separate, editor-published timeline. The two never share a surface.",
    },
  ];

  return (
    <section
      id="voices"
      className="relative border-t border-veil/5 px-5 py-[clamp(72px,11vw,140px)] sm:px-10 lg:px-20"
    >
      <div className="mx-auto max-w-[1200px]">
        <div data-reveal className="ohq-reveal mx-auto max-w-[760px] text-center">
          <span className="ohq-eyebrow">Opinions &amp; discussion</span>
          <h2 className="mt-4 mb-5 font-serif text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[1.02] font-normal tracking-[-0.025em] text-balance text-cream-bright">
            Numbers tell you <em className="italic">what.</em> Words tell you{" "}
            <em className="italic">why.</em>
          </h2>
          <p className="m-0 text-[16px] leading-[1.6] font-light text-pretty text-muted">
            &ldquo;73% negative&rdquo; is where the reading starts, not where it ends.
            Under every result on <Brand /> sits the writing that explains it — and the
            structure that keeps it worth reading.
          </p>
          <div className="mt-5">
            <SectionPurpose
              problem="A percentage tells you what people think, never why"
              solution="The written reasons stay attached to the number"
            />
          </div>
        </div>

        <div className="mt-[clamp(38px,6vw,66px)] grid grid-cols-1 gap-[clamp(16px,2vw,24px)] lg:grid-cols-2">
          {/* A topic opinion, with its single level of reply. */}
          <article
            data-reveal
            className="ohq-panel-raised ohq-reveal flex flex-col gap-4 p-6 delay-[80ms] sm:p-8"
          >
            <header className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
                On a topic · opinion + discussion
              </span>
              <span className="rounded-full border border-veil/10 px-2.5 py-[3px] text-[10.5px] text-dim">
                UPI charges
              </span>
            </header>

            <div className="flex flex-col gap-3 rounded-[16px] border border-veil/8 bg-surface-sunken p-5">
              <span className="flex flex-wrap items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] place-items-center rounded-full bg-avatar text-[11px] font-semibold text-soft"
                >
                  {opinion.initials}
                </span>
                <span className="text-[13.5px] font-semibold text-cream">
                  {opinion.name}
                </span>
                <span
                  className="rounded-full border px-2.5 py-[2px] text-[11px]"
                  style={{
                    color: sentimentColor(opinion.vote),
                    borderColor: `${sentimentColor(opinion.vote)}66`,
                  }}
                >
                  {opinion.vote}
                </span>
              </span>
              <p className="m-0 text-[14px] leading-[1.65] text-pretty text-soft">
                {opinion.text}
              </p>

              <div className="mt-1 ml-3 flex flex-col gap-2 border-l border-veil/10 pl-4">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden
                    className="grid h-[24px] w-[24px] place-items-center rounded-full bg-avatar-deep text-[9.5px] font-semibold text-muted"
                  >
                    {reply.initials}
                  </span>
                  <span className="text-[12.5px] font-semibold text-soft">
                    {reply.name}
                  </span>
                  <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-dim">
                    reply
                  </span>
                </span>
                <p className="m-0 text-[13px] leading-[1.6] text-muted">{reply.text}</p>
                <span className="text-[11.5px] text-dim">
                  Replies stop here. There is no second level.
                </span>
              </div>
            </div>
          </article>

          {/* Poll reasons: two sides, no thread between them. */}
          <article
            data-reveal
            className="ohq-panel-raised ohq-reveal flex flex-col gap-4 p-6 delay-[160ms] sm:p-8"
          >
            <header className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
                On a poll · reasons, no thread
              </span>
              <span className="rounded-full border border-veil/10 px-2.5 py-[3px] text-[10.5px] text-dim">
                WFH or office
              </span>
            </header>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { r: forA, name: "Work from home", color: POLL_A_COLOR },
                { r: forB, name: "Office, five days", color: POLL_B_COLOR },
              ].map(({ r, name, color }) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2.5 rounded-[14px] border p-4"
                  style={{ borderColor: `${color}3D`, background: `${color}0A` }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="truncate text-[12.5px] font-semibold text-cream">
                      {name}
                    </span>
                  </span>
                  <p className="m-0 text-[13px] leading-[1.6] text-soft">{r.text}</p>
                  <span className="text-[11px] text-dim">— {r.name}</span>
                </div>
              ))}
            </div>
            <span className="text-[11.5px] text-dim">
              Neither column can reply to the other. You read the strongest case for
              each side instead of watching them argue.
            </span>
          </article>
        </div>

        <ul className="m-0 mt-[clamp(20px,3vw,28px)] grid list-none grid-cols-1 gap-[clamp(14px,1.8vw,20px)] p-0 sm:grid-cols-2 xl:grid-cols-4">
          {rules.map((rule, i) => (
            <li
              key={rule.title}
              data-reveal
              className="ohq-panel ohq-reveal flex flex-col gap-2.5 p-5"
              style={{ transitionDelay: `${60 + i * 80}ms` }}
            >
              <h3 className="m-0 text-[15px] leading-[1.25] font-semibold tracking-[-0.015em] text-cream-bright">
                {rule.title}
              </h3>
              <p className="m-0 text-[13px] leading-[1.6] font-light text-muted">
                {rule.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
