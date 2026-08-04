import { SectionPurpose } from "@/components/landing/SectionPurpose";

/**
 * The pipeline, as a diagram.
 *
 * Four stages from a scattered argument to a readable result. The connector is
 * an animated dashed path so the direction of travel is obvious at a glance;
 * the global reduced-motion rule freezes it.
 */
export function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Editors publish a subject",
      body: "A topic or a poll, with a plain description and sourced context. Nothing is measured until somebody has written down what is actually being asked.",
    },
    {
      n: "02",
      title: "You answer in one click",
      body: "A sentiment vote and its aspect questions, or a side in a head-to-head. Reading needs no account; voting needs one, because one vote counts per person.",
    },
    {
      n: "03",
      title: "Answers become a distribution",
      body: "Every vote rolls into one continuous measurement instead of a thousand scattered comments — with the sample size stated next to it, always.",
    },
    {
      n: "04",
      title: "The result stays readable",
      body: "Verified events plotted on the trend, cross-tabs by region and age, and written reasons kept separate from sourced fact.",
    },
  ];

  return (
    <section
      id="how"
      className="relative border-t border-veil/5 px-5 py-[clamp(72px,11vw,140px)] sm:px-10 lg:px-20"
    >
      <div className="mx-auto max-w-[1200px]">
        <div data-reveal className="ohq-reveal mx-auto max-w-[720px] text-center">
          <span className="ohq-eyebrow">How it works</span>
          <h2 className="mt-4 mb-5 font-serif text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[1.02] font-normal tracking-[-0.025em] text-balance text-cream-bright">
            From an argument to a <em className="italic">number you can trust.</em>
          </h2>
          <p className="m-0 text-[16px] leading-[1.6] font-light text-pretty text-muted">
            Public opinion already exists — it is just scattered across replies,
            quote-tweets and group chats where nobody can read it. Four steps turn that
            into something with a shape.
          </p>
          <div className="mt-5">
            <SectionPurpose
              problem="Most polls tell you a number and nothing about who was asked"
              solution="Every result breaks down by region, age and occupation"
            />
          </div>
        </div>

        <FlowDiagram />

        <ol className="m-0 mt-[clamp(30px,4vw,48px)] grid list-none grid-cols-1 gap-[clamp(16px,2vw,22px)] p-0 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.n}
              data-reveal
              className="ohq-panel ohq-reveal flex flex-col gap-3 p-5 sm:p-6"
              style={{ transitionDelay: `${80 + i * 90}ms` }}
            >
              <span className="font-mono text-[11px] tracking-[0.16em] text-positive-light">
                {step.n}
              </span>
              <h3 className="m-0 text-[16px] leading-[1.25] font-semibold tracking-[-0.015em] text-cream-bright">
                {step.title}
              </h3>
              <p className="m-0 text-[13.5px] leading-[1.6] font-light text-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Scattered dots on the left, funnelled along a moving path into a clean
 * distribution on the right. It is the whole product in one picture.
 */
function FlowDiagram() {
  // Deterministic scatter — a random one would reflow on every render.
  const scatter = [
    [18, 26],
    [42, 14],
    [30, 52],
    [58, 38],
    [14, 70],
    [46, 82],
    [70, 62],
    [24, 96],
    [62, 106],
    [36, 120],
  ];

  const bars = [
    { x: 468, h: 22, color: "#1DB954" },
    { x: 492, h: 40, color: "#1DB954" },
    { x: 516, h: 74, color: "#9BA1A6" },
    { x: 540, h: 108, color: "#E5484D" },
    { x: 564, h: 84, color: "#E5484D" },
  ];

  return (
    <figure
      data-reveal
      className="ohq-reveal m-0 mt-[clamp(34px,5vw,58px)] overflow-hidden rounded-[20px] border border-veil/8 bg-surface-sunken p-5 sm:p-8"
    >
      <svg
        viewBox="0 0 640 180"
        role="img"
        aria-label="Diagram: scattered individual opinions on the left are collected through OpinionHQ and become a single readable distribution on the right."
        className="block h-auto w-full"
      >
        <defs>
          <linearGradient id="ohqFlowFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1DB954" stopOpacity="0.15" />
            <stop offset="0.55" stopColor="#1DB954" stopOpacity="0.7" />
            <stop offset="1" stopColor="#1DB954" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Left: the scatter. */}
        {scatter.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy! + 22}
            r={i % 3 === 0 ? 3.4 : 2.4}
            fill="#8F8C86"
            opacity={0.5 + (i % 4) * 0.12}
          />
        ))}
        <text x="8" y="172" fill="#8F8C86" fontSize="10" fontFamily="monospace">
          SCATTERED OPINION
        </text>

        {/* Middle: the funnel. */}
        {[0, 1, 2].map((row) => (
          <path
            key={row}
            d={`M96 ${44 + row * 46} C 190 ${44 + row * 46}, 210 90, 300 90`}
            fill="none"
            stroke="url(#ohqFlowFade)"
            strokeWidth="1.4"
            strokeDasharray="5 9"
            className="animate-flow"
            style={{ animationDelay: `${row * 0.4}s` }}
          />
        ))}

        <rect
          x="300"
          y="66"
          width="112"
          height="48"
          rx="10"
          fill="rgba(29,185,84,0.1)"
          stroke="rgba(29,185,84,0.45)"
        />
        <text
          x="356"
          y="87"
          fill="#4ED27C"
          fontSize="10.5"
          fontFamily="monospace"
          textAnchor="middle"
        >
          ONE VOTE
        </text>
        <text
          x="356"
          y="101"
          fill="#4ED27C"
          fontSize="10.5"
          fontFamily="monospace"
          textAnchor="middle"
        >
          PER PERSON
        </text>

        <path
          d="M412 90 H452"
          stroke="url(#ohqFlowFade)"
          strokeWidth="1.4"
          strokeDasharray="5 9"
          className="animate-flow"
        />

        {/* Right: the distribution. */}
        {bars.map((bar, i) => (
          <rect
            key={bar.x}
            x={bar.x}
            y={140 - bar.h}
            width="16"
            height={bar.h}
            rx="3"
            fill={bar.color}
            opacity="0.9"
            className="origin-bottom"
            style={{
              animation: `ohq-grow-y 900ms cubic-bezier(.2,.7,.2,1) ${300 + i * 110}ms both`,
            }}
          />
        ))}
        <line x1="460" y1="140" x2="592" y2="140" stroke="color-mix(in oklab, var(--color-veil) 12%, transparent)" />
        <text x="632" y="172" fill="#8F8C86" fontSize="10" fontFamily="monospace" textAnchor="end">
          ONE READABLE RESULT
        </text>
      </svg>
    </figure>
  );
}
