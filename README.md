# OpinionHQ

Topic-centric public-opinion intelligence platform.

This repository currently holds a **clickable prototype** of the MVP journey
described in [`docs/ProjectBrief.md`](docs/ProjectBrief.md), built on the stack
the production app will use (see
[`docs/OpinionHQ-Technical-Roadmap.md`](docs/OpinionHQ-Technical-Roadmap.md)).
Its purpose is to settle features and workflows before the database, auth and
admin systems are built.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

| Script              | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Dev server                              |
| `npm run build`     | Production build (`output: standalone`) |
| `npm run typecheck` | `tsc --noEmit`                          |
| `npm run lint`      | ESLint                                  |
| `npm test`          | Vitest unit tests                       |

## What works today

OpinionHQ has two modes, kept deliberately separate because a forced choice and
a sentiment reading must never be averaged together:

- **Opinion intelligence** — one subject, measured on a positive / neutral /
  negative scale plus its own aspect questions.
- **Polling** — two options, one choice, no middle ground.

- **Landing page** (`/`) — hero, the two modes side by side with working
  miniatures of each output, an animated pipeline diagram, a section on the
  written half (opinions, one-level replies, poll reasons), and the full
  taxonomy with live counts. Scroll reveals and the animated diagrams respect
  `prefers-reduced-motion`. Nav points at the two modes plus the two questions
  a first-time visitor actually has.
- **Polls** (`/polls`, `/polls/[slug]`, `/polls/new`) — head-to-head on anything.
  Signed-in participants publish their own from the composer, with a live
  preview built through the same derivation the real page uses. Each poll
  carries the split with its margin in words, cross-tabs by region, age and
  occupation, a vote panel with an optional written reason, and reasons in two
  columns. No threads: nobody replies to anybody in a poll.
- **Explore / topic catalog** (`/topics`) — breadcrumb, search across name,
  category, tag, status and summary, seven sort orders, horizontally scrolling
  category chips with counts, and a simplified "Hot right now" ticker that
  pauses on hover, on focus, when the tab is hidden, and on demand.
- **Topic dashboard** (`/topics/[slug]`) — description and tags under the
  name, sentiment donut, 30-day trend with verified developments plotted on it,
  daily participation, KPI row, category-specific rating dimensions, geographic
  and demographic breakdowns, and Overview / Opinions / Discussion / Timeline
  tabs.
- **Aspects — sub-opinions under the headline vote** — a plain up/neutral/down
  vote says little about a film or an exam, so every topic carries four or
  five one-click questions written *for that topic*: Kalki 2898 AD asks about
  its second half, its runtime and whether the IMAX upcharge was worth it; the
  NEET topic asks whether the leak claims are credible and whether there should
  be a re-exam. Every answer carries a sentiment tone so it still rolls into the
  headline distribution. Authored in
  [`src/lib/sample-data/aspects.ts`](src/lib/sample-data/aspects.ts); the
  category sets in [`src/lib/facets.ts`](src/lib/facets.ts) are only a fallback.
- **Topic creation** (`/topics/new`) — a signed-in participant publishes a
  topic in three steps: what it is, what to ask, review. It is not publishable
  without at least two aspects of its own. New topics appear in the catalog
  immediately, get a real dashboard, and honestly report "no votes yet" rather
  than a fabricated split.
- **Sign in and account creation** — the nav Sign in button opens the sheet
  directly and drops you into the catalog with voting rights. Account creation
  collects name, email, date of birth, mobile, occupation, country, state and
  city, with everything past name and email optional and a privacy disclaimer
  attached. There is no password field anywhere.
- **Voting with contextual auth** — pick a stance and write an explanation while
  signed out; sign-in is only requested at submit, and the held vote and draft
  are shown back to you and applied afterwards. Votes can be updated or
  withdrawn, and your own written opinion appears in the Opinions list.
- **PDF export** — "Export PDF" on any topic dashboard *or poll* downloads a
  multi-page report. Both are drawn with the shared vector kit in
  [`pdf-kit.ts`](src/lib/export/pdf-kit.ts). The topic report covers:
  the headline result, sentiment donut, 30-day trend with its verified
  developments, daily participation, every aspect with its shares, the audience
  breakdowns and the sourced timeline. The poll report covers the split with its
  margin, both options and the case for each, the region/age/occupation
  cross-tabs, and the written reasons by side.
- **Replies** — post a reply under any written opinion from the Discussion tab.
- **Follow, share, helpful, report** — wired to prototype state and toasts.

Session, profile, votes, aspect answers, follows, helpful marks, replies and
created topics persist in `localStorage` under `opinionhq.prototype.v3`.
Clearing site data resets the prototype.

## Topic taxonomy

Thirteen published types, defined once in
[`src/lib/taxonomy.ts`](src/lib/taxonomy.ts): Entertainment, Brands, Sports,
Technology, National &amp; International Events, National Politics, Government
Policies, Politicians, Colleges, Exams, Career Streams, Food &amp; Dining,
Controversies.

Plus one **reserved** type — *Something else* — for subjects that genuinely fit
none of the above. Editors never publish into it, so it carries no fixtures and
stays hidden from the catalog chips and the landing grid until a participant
creates something there. Both composers surface it in its own "Fits none of
these" group, and the topic composer warns that the suggested aspects will be
generic. Status colours and sentiment colours live in the same
file so nothing is hard-coded per component.

## PDF export

[`pdf-kit.ts`](src/lib/export/pdf-kit.ts) holds the shared page furniture and
drawing primitives; `topic-report.ts` and `poll-report.ts` compose them. Both
redraw the charts with jsPDF vector primitives from the same derived values the screen
uses, rather than rasterising the DOM. That keeps the output crisp at any zoom,
keeps every number selectable and searchable, and sidesteps the fact that the
common screenshot libraries cannot parse Tailwind v4's `oklch` colours.

`buildTopicReport()` and `buildPollReport()` return the document without
touching the DOM, so output can be rendered and inspected outside a browser;
`exportTopicReport()` / `exportPollReport()` wrap them and trigger the download. jsPDF is imported
dynamically, so nobody pays for it until they click Export.

## Authoring aspects: the hybrid model

Aspects can be written two ways. Today only the manual path is built: an editor
authors them in `aspects.ts`, or a participant writes them in the composer.

The agent-assisted path plugs into `suggestAspects()` in
[`TopicComposer.tsx`](src/components/create/TopicComposer.tsx). It currently
seeds the category's generic set as a starting point; the intended
implementation sends the topic's description and sources to an extraction
agent that proposes aspects for a human to edit and approve. Only the source of
the suggestions changes — the shapes, the validation and the publish path stay
as they are.

## What is deliberately not built

No database, no server-side auth, no admin panel, no moderation queue, no rate
limiting. Those are Phases 1–6 of the roadmap. Sign-in completes immediately
without an identity provider and never asks for a password; account details
stay in the browser and are transmitted nowhere.

## Sample data

Everything under [`src/lib/sample-data/`](src/lib/sample-data/) is **fixture
data, not production data**. The subjects are real, publicly discussed topics so
the copy reads realistically, but every participant count, percentage, delta,
participant name, written opinion and reply is invented for the prototype.

Per `AGENTS.md`, real user-generated content is never fabricated in the product
itself. These fixtures exist only so layouts and workflows can be reviewed with
realistic density, and must be deleted when server-side aggregates land.

Topics in the **Politicians** category are framed by office ("Union Finance
Ministry: Budget 2026 Record") rather than by personal name. Publishing invented
approval percentages against a named individual would read as real polling;
switch to named topics once the numbers come from actual votes.

Poll cross-tabs and verdicts are suppressed below ten votes: one vote is not a
landslide, and a regional breakdown of a single voter would be invention rather
than a placeholder. Above that, cross-tabs are derived from the poll's own
headline split, then re-centred
so the share-weighted average lands back on that split — segments that quietly
contradicted the top-line number would make the whole breakdown untrustworthy.
Where the real-world pattern is common knowledge, an editor pins it explicitly
via `regionOverrides`: a reader who sees "Tamil Nadu: 94% chai" is right to
discount every other number on the page.

Fixture aspect tallies are derived from the topic's headline sentiment, as a
stand-in for the server aggregates that will replace them. They are deliberately
**never** applied to a topic a participant created in the browser: with no
server counting anyone's answers, a derived "92% said None given" off a single
response would be fabrication rather than a placeholder. Created topics show
real answers only, and say "no answers yet" until there are some.

The UI keeps the brief's §5.5 sample-transparency rules throughout: every
percentage is captioned as describing OpinionHQ participants, never the public.

## Layout

```
src/
  app/                     routes: /, /topics, /topics/new, /topics/[slug],
                           /polls, /polls/new, /polls/[slug]
  components/
    landing/               landing page sections
    catalog/               ticker, search, sort, filters, topic cards
    polls/                 poll cards, split bar, cross-tabs, vote, reasons
    topic/                dashboard panels, facet panel, vote composer, tabs
    prototype/             session/vote state, auth sheet, toasts
    ui/                    StatusBadge, SentimentBar/Legend, MetricChange,
                           CategoryIcon, Breadcrumb, PrototypeDataBadge
    motion/                scroll reveal, particle field
    site/                  nav, footer
  lib/
    types.ts               domain types (mirror the planned Prisma models)
    taxonomy.ts            categories, status colours, sentiment colours, sorts
    facets.ts              category-specific opinion dimensions
    derive.ts              presentation derivations over an Topic
    derive-poll.ts         poll split, verdict and cross-tab derivations
    topics.ts            read model: fetch, filter, sort
    polls.ts               read model for polls
    sample-data/           fixtures — see above
```

`src/lib/topics.ts` is the seam: its function signatures are what the UI
depends on, so swapping fixtures for Prisma queries does not touch components.
