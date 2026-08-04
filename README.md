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

OpinionHQ has three modes. The first two are kept separate from each other
because a forced choice and a sentiment reading must never be averaged together.
The third is kept separate from both because it is not a measurement at all —
it is one person's situation, read by people who have proved they know the
territory:

- **Topics** — one subject, measured on a positive / neutral / negative scale
  plus its own aspect questions.
- **Polls** — two to four options, one choice, no middle ground. Where earlier
  readings exist, the split is also plotted over time.
- **Ask Verified** — one personal question, answered independently by people
  whose relevant proof has been checked. Public by default, private in a click,
  and never aggregated into anything.

- **Landing page** (`/`) — hero, the two public modes side by side with working
  miniatures of each output, an animated pipeline diagram, a section on the
  written half (opinions, one-level replies, poll reasons), and the full
  taxonomy with live counts. Scroll reveals and the animated diagrams respect
  `prefers-reduced-motion`. Nav points at the two modes plus the two questions
  a first-time visitor actually has.
- **Polls** (`/polls`, `/polls/[slug]`, `/polls/new`) — two to four options on
  anything. Two is the sharpest question; past four a split bar stops being
  readable and a "winner" on 26% is a statement about a crowded field rather
  than about the option. The margin is measured against the runner-up, not the
  whole field. Signed-in participants publish their own from the composer, with a live
  preview built through the same derivation the real page uses. Each poll
  carries the split with its margin in words, cross-tabs by region, age and
  occupation, a vote panel with an optional written reason, and reasons in a
  column per option. No threads: nobody replies to anybody in a poll.
- **Poll history** — a line per option across time, each labelled at its
  right-hand end with the option and where it finished, plus a crosshair that
  snaps to a recorded reading and reads every option at that date. Dated events
  are marked on the plot and listed underneath, because a movement with a
  reason attached is worth something and a wiggle without one is noise dressed
  as a finding. **Not derived.** Every other aggregate in the app is computed
  from the current counts; a past reading cannot be, so
  [`derive-history.ts`](src/lib/derive-history.ts) only ever shapes readings
  somebody recorded and returns null when nobody did — a poll with no history
  says so and draws nothing. A single reading is also refused: one point is a
  fact, not a trend.
- **Approval ratings** (`/polls`, Politicians) — named Indian politicians,
  approve/disapprove, with the movement plotted. See the warning below.
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
  margin, every option and the case for each, the region/age/occupation
  cross-tabs, and the written reasons by option.
- **Replies** — post a reply under any written opinion from the Discussion tab.
- **Follow, share, helpful, report** — wired to prototype state and toasts.
- **Interactive charts** — the sentiment donut highlights both ways round (ring
  to legend and legend to ring, with the centre reading out whatever is under
  the pointer), the 30-day trend snaps a crosshair to the nearest sampled day
  and reads both lines, the participation bars report an apportioned count, and
  every poll bar names its option with the share and the vote count. Segments
  are real buttons, so the detail is reachable by keyboard; the full series
  stays in each chart's `aria-label`, so nothing is available only on hover.

Session, profile, votes, aspect answers, follows, helpful marks, replies,
created topics, Pro contributions and embedded-block answers persist in
`localStorage` under `opinionhq.prototype.v5`.
Ask Verified state lives separately under `opinionhq.ask.v6` — the key carries
the schema, so a record whose shape changed is never handed to newer code. Both
keys have been bumped for exactly this reason: a v3 question predates
`visibility` and would have dropped silently out of the browse list, a v4 thread
predates `privateOpenedAt` so every private channel would have read as closed,
and v5 stored likes as two id lists that could not express a dislike. Clearing
site data resets the prototype.

**Every page has a back button.** It leads the breadcrumb, names where it goes
("← Back to Ask Verified"), and is a link to the declared parent rather than
`router.back()` — history is not the page hierarchy, and somebody arriving from
a shared link would otherwise be thrown off the site.

## Pro contributions — richer posts in the same conversation

A Pro contribution is a **format**, not a place. It is written with structured
sections and can carry an interactive block, and it appears in the Opinions list
and the Discussion view beside every ordinary opinion. There is no Pro tab, no
Pro column, no Pro feed and no Pro discussion system.

**One model, one list.** `Opinion` in [`types.ts`](src/lib/types.ts) *is* the
contribution record — it already carried id, topic, author, sentiment and
timestamp — and `format: "pro"` plus an ordered `sections[]` is the entire
difference. Absent means standard, so every opinion written before Pro existed
is already a valid record and there is nothing to migrate. Replies key off the
same id, so a Pro post uses the reply system that was already there.

**One card, two views.** [`ContributionCard`](src/components/topic/ContributionCard.tsx)
takes `view: "opinions" | "discussion"`. Opinions collapses the breakdown behind
"Read full contribution" and keeps replies behind a count; Discussion opens both
and orders by thread activity. A reply posted in one shows in the other's count
immediately, because there is nothing duplicated to keep in sync.

**Ranking is blind to format.** `relevanceScore` in
[`contributions.ts`](src/lib/contributions.ts) reads upvotes, replies, saves,
reactions and age — and not `format`. The moment ranking reads it, the feed
stops being a record of what people think and becomes a list of who paid. A test
holds the line, and the fixtures demonstrate it rather than asserting it: the
seeded contribution on `iphone18` is deliberately quieter than the plain
opinions above it, so the rule is visible on screen. "Rich contributions" is a
**filter**, never a tab — a permanent tab of its own would split the
conversation and leave the standard opinions as the leftovers.

**Embedded interactions are contribution-scoped.** A block's answers live in
`blockChoices`, keyed `contributionId:blockId`, in a field of their own beside
`votes` rather than inside it. Nothing in that path can reach the topic's
sentiment split, its participation count, or any poll in the Polls section — and
the card says so on screen, because a reader who has just answered something
that looks like the topic vote deserves to know which number they moved. Two
tests hold it: one on the arithmetic, one asserting an `InteractiveBlock` has no
field a future aggregate could read by mistake.

**Only a headline is required.** The composer opens with one field and an "Add
section" row. Showing all six fields at once would turn a contribution into a
form to be completed, and a form gets completed — people write a breakdown
because there is a breakdown box, not because they had one. Sections are
removable and reorderable, empty ones are dropped at publish rather than
shipped, and the preview renders the same card the feed does.

**Pro is not verification.** The label reads *Pro contribution*; independently
verified expertise renders as a separate badge beside it and never merges into
one. Paying for better tools is not evidence of knowing anything. Eligibility is
a toggle in this build for the same reason Ask Verified approves proof on
submit — a paywall between the reviewer and the workflow teaches nothing — and
the screen says so.

**Quality signals** (`qualitySignals`) are computed and deliberately not
rendered. Keeping the calculation out of the card means the day payouts are
wired to it, one function changes rather than a component tree. There is no
`posts` field, because the one thing a reward system must never pay for is
posting.

## Ask Verified — one-to-one guidance, public by default

Somebody asks a career, college or exam question; people who have proved they
know something relevant answer it, one at a time and independently. That is the
whole feature, and everything in it earns its place against that sentence.

**Questions are public by default and private in one click.** They used to be
private-only. Two things were wrong with that: the answer to "IIT or a state
college?" is worth reading by the next hundred people asking it, and a section
whose landing screen is empty until you contribute to it has nothing to show for
itself. Publishing a question does *not* publish the conversation, the rating,
or the person who asked — see the projection table below.

**One account.** There is no separate contributor sign-up and no contributor
record. A professional is a user with verified proof — same account, one extra
attribute. `Professional` is a view over an account (it carries no email, no
password, no profile fields), which is what keeps sign-up single.

The separation is structural rather than a promise. `src/lib/ask/` has its own
types, its own store and its own storage key; `lib/topics.ts` and `lib/polls.ts`
import nothing from it. Every `/ask` route stays `noindex, nofollow` — the
questions here are fixture data in one browser, and `/ask/questions/[id]` serves
public *and* private questions from one address, so it has no
`generateStaticParams` and no metadata derived from the question. Nothing
private is prerendered into a build artefact or leaked through a tab title.

Six routes, and each is one page:

| Route | What it does |
| --- | --- |
| `/ask` | Browse every public question. Readable signed out |
| `/ask/questions/[id]` | The question, the answers, and — if it is yours — the threads |
| `/ask/new` | Area, question, context, your choices, who can read it — send |
| `/ask/answer` | Questions matched to your proof. Verified users only |
| `/ask/my-questions` | What you asked, split by answered / still waiting |
| `/ask/verify` | Show what you can prove |

Every screen carries the same side rail, so the section never changes shape as
you move through it: *ask a question*, *answer questions* or *verify yourself*
depending on whether you hold proof, and *my questions* with a dot when an
answer has landed.

### Comments and private follow-ups

A public answer carries a **threaded comment section** — third parties adding
what the answer is missing, or what happened when they were in the same
position — and a **Message privately** button beside it.

The split is the point, and it is stated on screen rather than assumed:

| | Who | Visible to |
| --- | --- | --- |
| Comment | Anyone signed in; the answer's author may reply but not open one | Everyone reading the question |
| Like / dislike | Anyone signed in, never their own writing | Everyone reading the question |
| Message privately | The asker only | The asker and that one professional |

The button is a signposted route into the *existing* one-to-one thread rather
than a second channel, so there is still exactly one place a confidential
follow-up can live. The rules sit in `access.ts`: comments never exist on a
private question, the author of an answer cannot *open* a comment under it (a
new note from them belongs *in* the answer) though they may reply to one, and a
third party never reaches the private thread — a passer-by reading a published
answer is a reader, not a client.

**Threading reversed an earlier decision**, which is worth recording rather than
quietly overwriting. Comments were flat to stop a page of considered assessments
turning into a forum. What happened instead is that people replied anyway —
inside a new top-level comment, quoting the one they meant — so the conversation
existed with its structure thrown away. Nesting does not create the discussion;
it stops the page lying about which comment answers which.
`MAX_COMMENT_DEPTH` (4) is where the forum argument still bites and holds the
line: past the cap replies keep threading and stop stepping right, so nothing is
hidden or flattened and a long exchange does not walk off the edge of a phone.
Every level is ordered **oldest first** rather than by score — ranking would
reorder a conversation under the reader, and drop a reply posted a second ago
several screens below the thing it answers.

**The thread connectors are structural, not decoration** — and they are lines
that *land somewhere*, not a bar running alongside a column. A hairline drops
out of a comment's monogram, runs down the gutter, and curves into each reply's
own monogram, so a reply four levels down still visibly hangs off one specific
comment. A bar only says "these are indented", which the indent already said.

Three details carry it (`.ohq-thread` in `globals.css`):

- The elbow is two 1px borders and one corner radius on `li::before` — no SVG,
  so it costs nothing, scales with the text and inherits the theme.
- `li:not(:last-child)::after` carries the line on past that reply's entire
  sub-thread. Its **absence on the last child** is what makes the line stop at
  the final reply rather than running into empty space.
- Replies are a **sibling** of their parent's row, not a child of its content
  column, so the parent's gutter segment ends exactly where the first elbow
  begins.

The geometry is tied to the gutter and moves with it: 28px monogram + 10px gap =
38px of indent per level, so the parent's line sits 24px left of a reply's box
and the elbow drops 34px before it turns — which lands on the monogram's centre.
The gutter segment is also the collapse control: a 28px-wide target around a 1px
line. Two collapse levels exist — a branch of replies, and the whole comment
section from its heading.

**Likes and dislikes are not the rating.** The asker's rating is one person
saying whether the advice worked for their situation, and it stays private;
these are readers saying an answer was or was not worth reading. An answer can
be liked by fifty people and still be wrong for the one person who asked, which
is exactly why they are kept apart — and why votes exist on public questions
only, where there is an audience to be one of.

They are held as **two counts rather than one net score**. A score of zero could
be nobody voting or fifty people disagreeing, and those are not the same page;
disagreement under a considered answer is the most interesting thing that can
happen to it, so it gets its own number instead of cancelling out. The seeded
Big Four answer takes 27 likes against 31 dislikes for exactly that reason.

One vote per person per thing, stored as a single value, so like and dislike are
mutually exclusive by the shape of the data rather than by a rule somebody has
to remember; pressing the side you hold withdraws it. The viewer's own vote is
held separately from the counts rather than folded in, so a seeded number stays
somebody else's and one of them is never you.

### The private channel is the asker's door

A `Thread` record exists from the moment somebody is matched — it is how the
pair's status is tracked. The private channel *inside* it starts closed and
opens only when the asker opens it (`privateOpenedAt`). Being matched to a
question is permission to answer it, not permission to start a private
conversation with the person who asked.

A reply box under every answer by default was making a promise the asker never
made: it read as an open line to somebody who had done nothing but answer a
question, and it made an answer that needed no follow-up look unfinished. Now
the asker sees a closed door with a **Message privately** button; the
professional sees one line saying only the person who asked can open one.
`reply()` refuses to write into a channel that was never opened, so the rule
survives the next component that forgets it.

**Resolving moved out of that panel** and into the answer's own footer. Closing
is how the asker ends the whole exchange with one person — it marks the thread
and revokes their access — and burying it inside a conversation most answers
never have left them no way to finish one.

`isPrivateOpen` treats a thread carrying messages as open even without the
stamp. That is deliberate and it fails in the safe direction: such a record can
only have been written before the field existed, and hiding a conversation that
already happened from the two people who had it is the worse failure.

### What each scope can read

| | Question | Answers | Thread | Rating | Who asked |
| --- | --- | --- | --- | --- | --- |
| Asker | ✓ | all | all | own | ✓ |
| Matched professional | ✓ | own, then all if public | own | own | ✓ |
| Anyone (public question) | ✓ | all | — | — | **—** |
| Anyone (private question) | — | — | — | — | — |

Three rules carry the product's integrity claim, and all three are enforced in
[`access.ts`](src/lib/ask/access.ts) rather than in a component:

- **Threads are never public.** A one-to-one discussion is between the asker and
  one professional. Publishing it would make this a forum, and the people who
  agreed to answer did not agree to that.
- **A professional cannot read other answers until they have written their own.**
  Making questions public created a way to read three opinions and then write a
  fourth that claims to be independent. The promise did not move; the gate did.
- **The private channel opens only when the asker opens it.** Being matched to a
  question is permission to answer it, not permission to start a private
  conversation with the person who asked.

- **Scope** — careers, colleges and exams only, because the proof behind each is
  checkable. Medical, legal, financial, tax, immigration, relationship and
  mental-health questions have no area to land in.
- **Authorization** ([`access.ts`](src/lib/ask/access.ts)) — four scopes on one
  screen, per the table above. Somebody with no claim on a *private* question
  gets *"no such question"*, not *"forbidden"* — confirming a question exists at
  an address is itself a disclosure. A missing `visibility` on a stored record
  resolves to **private**, never public: the cost of being wrong one way is a
  question somebody has to re-publish, and the other way is a question they
  never agreed to publish at all.
- **Matching is the grant** ([`matching.ts`](src/lib/ask/matching.ts)) — a
  question goes to up to three people with relevant proof, and that is the
  access. There is no preview, no accept step and no second state to move
  through. Matching reads the title and the choices only; the context box is
  never used, because it is the most personal thing on the record.
- **Proof is per area** — somebody verified on employment answers career
  questions and nothing else. A CAT score grants nothing on GATE. Ineligible
  people are not ranked low; `score()` returns null and they are not candidates.
- **Independent answers** — a professional sees their own answer and thread and
  nothing else on that question. Three anchored opinions are worth less than one
  independent one. The asker gets a side-by-side view; nobody else does.
- **The asker sets the structure** ([`assessments.ts`](src/lib/ask/assessments.ts))
  — you write the question and the two to four choices you are weighing, and
  each professional scores *those* on one fixed five-point scale plus the one
  they would take. Fixed dimensions ("Overall", "Profile fit", "Risk") were too
  general to be worth much: every career question got the same three questions
  asked of it. Scoring the actual choices makes the side-by-side view the rows
  of your own decision, and disagreement shows up as two people scoring the same
  option differently. A read of one situation, never aggregated across
  questions. Not a poll.
- **Proof labels** ([`verification.ts`](src/lib/ask/verification.ts)) — never a
  bare tick. Each states the claim, the class of evidence behind it, and what it
  does *not* establish. `Credential` has no field for an address, a number or a
  document, which is the enforcement rather than a promise.
- **Bounded** — five replies each way per person, counted on screen. The asker
  marks a thread resolved or not useful, which ends that person's access. A
  professional can close a thread but cannot mark their own answer a success.

**Verification is instant in this build.** A review queue sits between a
reviewer and the workflow you are trying to walk, so `/ask/verify` approves on
submit. In production the same submission creates pending records and a human
approves each label individually — what gets published does not change, only who
decides it. The screens say so.

## Approval polls: a deliberate exception

The topics fixtures frame political subjects **by office rather than by name**,
for a stated reason: invented approval figures against a named individual read
as real polling. The approval polls in `polls.ts` override that decision, on
request, because approval tracking is what the history chart exists for and an
anonymised version demonstrates nothing.

Two rules make it survivable, and both must hold for anything added there:

1. **Every event label is procedural** — a session, a budget, a result, a
   reshuffle. Never an allegation, never a scandal, never anything a named
   living person could be defamed by. The numbers are invented; the *claims
   about people* must not be. A test enforces this with a keyword deny-list, so
   it fails loudly if somebody later writes an event that reads like a news
   story.
2. **Both sides appear.** A set of approval polls covering one party would be a
   statement in itself, whatever the numbers said.

These pages carry [`ApprovalNotice`](src/components/polls/ApprovalNotice.tsx)
above the fold — a non-dismissible, in-content warning, not the corner badge.
The badge is enough for a chai-versus-coffee cross-tab; a clean time series with
dated events beside a real person's name is the exact visual grammar real
polling uses, and a screenshot of it separated from the chrome is
indistinguishable from a real tracker.

**If this ships anywhere real, those six rows are the first thing to delete.**

## Topic taxonomy

Fourteen published types, defined once in
[`src/lib/taxonomy.ts`](src/lib/taxonomy.ts): Entertainment, Brands, Sports,
Technology, National &amp; International Events, National Politics, Government
Policies, Politicians, Colleges, Exams, Career Streams, Food &amp; Dining,
Places &amp; Travel, Controversies.

**Places &amp; Travel** covers hotels, monuments and destinations — somewhere you
went, rather than something you watched or bought. It is deliberately separate
from Food &amp; Dining: a restaurant is judged on a meal, a place on the whole
visit, and its `place` facet set asks the dimensions a review site usually
buries — whether the crowd ruined it, what it cost once you were inside, and
whether anyone is looking after it.

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

The poll report carries the **ten most-endorsed written reasons for every
option**, not just the winning one — ranked by how many people marked each
helpful, with ties broken by original order so two exports of the same poll are
byte-identical. A column that gets truncated says so ("Top 10 of 12 written
reasons"), and an option nobody wrote about keeps its heading rather than
vanishing. Quoting only the winner would be a longer way of restating the
headline percentage; the case *against* it is the part a reader cannot
reconstruct from the numbers.

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

## Places — every artifact is somewhere

Topics, polls and questions each carry a required `place`, and
[`lib/places.ts`](src/lib/places.ts) is a **containment tree**, not a tag:
Bengaluru sits inside Karnataka, which sits inside India, which sits inside
Worldwide. Filtering follows the nesting, so asking for Karnataka returns
Bengaluru's artifacts too — a Bengaluru question *is* a Karnataka question. A
flat string field could only do that if every author remembered to tag both,
and they would not.

Two rules are worth stating because both are the kind that quietly go the other
way:

- **`worldwide` is a member of the tree, not a null.** An artifact with no place
  is one somebody forgot to place; an artifact placed `worldwide` is a
  deliberate statement that geography does not bear on it. `place` is required
  and the way to say "everywhere" is to say it. Both storage keys were bumped
  rather than defaulting old records, and both loaders drop a record without a
  valid place — decorating it as "Worldwide" would put a claim on screen its
  author never made.
- **Filtering to India does not return worldwide artifacts.** "Messi or
  Ronaldo?" is not an Indian question, and a place filter that quietly widens
  itself is a filter you stop trusting. The catalogs offer "Anywhere" for
  people who want everything, which is a different thing from "Worldwide".

The picker and the filter both list only places that hold something, plus their
ancestors, with cumulative counts — "Karnataka 3" means three artifacts in
Karnataka *or inside it*. A card shows a place chip only when the place is not
`worldwide`; a chip on every card saying "Worldwide" would mean nothing, and
the value of the field is that it marks the artifacts which are *not* about
everywhere.

**The place *filter* is on Topics and Polls only.** Ask Verified questions carry
a place — it is on the card, it routes the question and it is searchable — but
there is no filter control on `/ask`. Those are one-to-one consultations rather
than a measured population, and slicing a short list of personal questions by
geography answers a question nobody was asking.

## Duplicate polls — the flooding problem, solved at entry

A poll is only worth reading because a lot of people answered *the same*
question. Let anyone create one and a news event produces forty cards asking
the same thing in forty phrasings, each holding a fortieth of the sample.
Nothing on the page is then true — not the split, not the margin, not the
cross-tabs — and the section is destroyed not by bad polls but by redundant
ones, which is harder because every single one of them looks reasonable alone.

[`lib/signature.ts`](src/lib/signature.ts) reduces a poll to what it actually
is:

```
place :: the set of things you are choosing between :: what else is asked
```

Order-independent, punctuation-blind, filler-blind. "Messi or Ronaldo?",
"Ronaldo or Messi?" and "Who is genuinely better — Messi or Ronaldo?" produce
one signature. "Who should captain, Messi or Ronaldo?" keeps `captain` in the
residue and stays a different poll.

**The option set carries the weight**, because the question text is where the
variation lives and half its words are scaffolding. Two polls offering the same
choice in the same place are the same poll however the question is worded. Three
refinements make that hold up against real data:

- **Options match by containment, not equality.** The seeded poll writes
  "Lionel Messi"; nobody re-posting it will. The smaller token set has to sit
  inside the larger — which also keeps "iPhone 18 Pro" and "iPhone 19 Pro"
  apart, since neither contains the other.
- **Generic scales invert the weighting.** Six approval polls all offer
  Approve/Disapprove and are identical by option set, yet they are about six
  different people. When the options name a scale rather than a choice, the
  subject in the question carries the poll. Without this, publishing an
  approval poll about anybody would report the first one as a duplicate.
- **Numbers survive canonicalisation.** A signature that could not tell one
  model year from the next would be worse than useless.

**Two tiers, on purpose.** An exact match is refused outright — the publish
button is replaced by a link to the poll that exists, because the author's vote
belongs on that one. A near match is shown with the candidate and its
similarity score and the button reads "Publish anyway": "similar" is a
judgement, and a false positive that silently blocks a genuine new question is
worse than a duplicate that got through. Certainty blocks; suspicion asks.

The check runs live as the draft is written rather than at publish, and
`createPoll` re-checks it in the provider. A rule enforced on the button is a
rule that holds until somebody adds a second way to create a poll.

Deliberately scoped to polls. A topic is a subject rather than a choice and
needs a different signature; two people asking Ask Verified the same thing is
not a defect.

## Search

One [`SearchField`](src/components/ui/SearchField.tsx) across topics, polls and
Ask Verified, so the three cannot drift and the keyboard behaviour is written
once. It is a real combobox: arrows move a highlight, Enter opens it, Escape
closes the list before it clears the field, and `aria-activedescendant` names
the current row without moving focus.

Suggestions are **ranked, not filtered** — a hit at the start of a name beats
one in the middle, a name beats a tag, and shorter labels win ties, so `metro`
returns the poll about metro spending above the Bengaluru Metro topic. Artifact
rows carry an `href` and go straight there; places and tags fill the box in,
because they are queries rather than destinations. Nothing is returned below
two characters: one letter matches most of the catalog, and a list that changes
completely on the second keystroke reads as broken rather than fast.

Two animations doing different jobs. An empty field cycles through real queries
drawn from the catalog underneath it, so it advertises what is in there rather
than sitting blank — real artifacts, never invented ones, because a placeholder
promising something the catalog cannot answer teaches the wrong thing. A field
being typed into drops its matches in with a short stagger. Both stop under
`prefers-reduced-motion`.

## Sign-in

A standalone page at [`/signin`](src/app/signin/page.tsx) — two panels, with the
left one carrying the only argument on the page for why an account exists at
all. The sheet in `AuthModal` still exists and is still right when somebody
hits a wall mid-task, because it keeps their held vote and returns them to it.
Both run the same validation out of
[`CredentialForm`](src/components/auth/CredentialForm.tsx), so the two doors
into one account cannot disagree.

Sign-in takes **a username or an email** in one field — the `@` decides, a rule
a reader can predict, which is the only kind worth having in a login box.
Creating an account still needs an address.

**Continue with Google is simulated, and deliberately does not look like
Google's own screen.** A convincing replica of somebody else's account chooser
is a phishing page whatever it was built for, and the fact that this one is
harmless would not survive a screenshot. The panel is OpinionHQ's own surface,
in OpinionHQ's own typography, listing two invented accounts, and it says on its
face that no Google account is contacted. The real integration replaces one
function with an OAuth redirect and nothing else on the page changes.

**The password is never stored.** It is held in component state deliberately
outside the form object, checked for length, and dropped. `AccountDetails` has
no field it could travel in — that absence is the enforcement rather than a
promise, and anybody wiring a real backend has to add the field deliberately.

`?next=` is honoured only when it is a same-site absolute path. It comes from
the URL, so it is attacker-controlled by definition, and an open redirect is an
open redirect even in a prototype.

## What is deliberately not built

No database, no server-side auth, no rate limiting. Those are Phases 1–6 of the
roadmap. Sign-in asks for a credential and accepts any of them, because there is
no identity provider behind it to check one against; the password is validated
for length and discarded, and account details stay in the browser and are
transmitted nowhere.

**Duplicate detection covers polls only, and only at creation.** Topics and Ask
Verified questions are untouched, and nothing re-checks the existing catalog or
merges two polls that were already published — a merge would have to reconcile
two vote tallies taken on two different questions, which is an editor's
decision and not an algorithm's.

**The Ask Verified authorization is not a security boundary in this build.**
Every decision in `lib/ask/access.ts` runs in the browser, over data the browser
already holds, because there is no server and no session to run it on. The
functions are pure and take an explicit `Viewer` precisely so they can move
server-side unchanged — and they must, before any of this is deployed. Until
then a client-side check is a UI convenience, and every gated screen says so on
the screen rather than implying an enforcement it does not have.

There is no verification review queue and no admin panel. `/ask/verify` approves
on submit, because a manual approval step sits between a reviewer and the
workflow they are trying to walk. Production needs the queue, a server-side
reviewer role, and moderator reads gated on a stated reason and written to an
append-only log — none of which a browser-only build can honestly implement.

File upload does not exist. The verify form collects the *class* of proof, and
the prototype stores no document, address or identity number anywhere — matching
the production rule that evidence goes to a reviewer's queue and never onto the
record the product renders.

There is no simulated answer. Nothing writes a structured read and a page of
reasoning on a named person's behalf: that would be inventing expert advice and
attributing it to somebody, which is the one thing this feature must never do.
The seeded questions show what an answered question looks like. To watch an
answer being written, verify your own proof and answer one of the questions that
gets routed to you.

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

Ask Verified fixtures are private fixtures. The people, credentials, questions,
answers and threads in
[`src/lib/ask/sample-data/seed.ts`](src/lib/ask/sample-data/seed.ts) are entirely
invented, are seeded only into the browser of somebody signed in, and are keyed
to that visitor as the asker. No screen in Topics or Polls imports them.
Aggregate stats are simulated, carry a "simulated" label wherever shown, and are
withheld below five answers — "100% helpful" off three ratings is not a
statistic. People are rendered as initials monograms: attaching a stock face to
an invented credential is the one element here that would genuinely mislead a
reviewer about what they are looking at.

The area cards report the *supply* side — people available and the share holding
more than one independent check — and never a question or answer count. Counting
private questions in a public aggregate is a smaller version of the thing this
feature promises not to do.

## Theming

Two themes, one set of names, and **no `dark:` variant anywhere in the markup**.
The theme is a single `data-theme` attribute on `<html>`; every colour in the
product is a CSS custom property declared in
[`globals.css`](src/app/globals.css) and re-declared under
`:root[data-theme="light"]`, so flipping the attribute is the whole mechanism.

Dark is the default and where the design lives. Light is opt-in, remembered in
`localStorage`, and applied by a blocking script in `<head>` before first paint
— an effect would paint the default first and flash white-to-dark on every
navigation for exactly the people who chose light. The system preference is
deliberately *not* consulted: nobody should land on the theme they never asked
for.

Two rules keep it honest:

- **Surfaces and text flip. Data colours do not.** A poll's four option colours
  and the three sentiment colours mean something; a chart has to mean the same
  thing in a screenshot regardless of who took it. They stay put.
- **Except as type.** `#1DB954` is a 2.2:1 contrast on white — fine as a fill
  behind dark ink, unreadable as a word. So each data colour has a theme-aware
  companion for text: `dominantVar` beside `dominantColor`, `textColor` beside
  `color`, `sentimentVar()` beside `sentimentColor()`. The literal is what the
  PDF exports use, because jsPDF has no CSS engine and cannot resolve a `var()`.

Hairlines and hover washes are cut from `--color-veil` — white on dark,
near-black on light — so `border-veil/10` is a 10% hairline in both themes.
Nothing uses `white/x` or `black/x` directly.

## Ambient background

[`AmbientBackground`](src/components/ambient/AmbientBackground.tsx) is mounted
once in the root layout and is the **only** background in the product. It
composes four layers behind a metaphor: *individual signals moving through a
network and gradually forming collective opinion.*

| Layer | What it is | How it is drawn |
| --- | --- | --- |
| Mesh | Slow dark colour fields, ≤16% alpha | CSS radial-gradients, transform keyframes |
| Contours | Organic bands — what replaced the square grid | SVG paths from sums of sines |
| Nodes | Sparse signals, and brief curved links between them | one 2D canvas |
| Cursor | A trailing light | CSS custom properties |

No new dependencies — no Framer Motion, no Three.js. Canvas is used for exactly
one thing, because a curve redrawn each frame between two moving points has no
CSS expression, and one context drawing forty dots beats forty animated DOM
nodes.

**The grid is gone from every public page.** It survives only in the `minimal`
variant — composers and verification, where the page is a form and a faint
ruling helps — at a third of its former weight and always cut with contours.
A test asserts this rather than trusting it.

### Variants

Derived from the route in [`config.ts`](src/lib/motion/config.ts), so no page
file imports anything from the system:

- **landing** — richest. Green and purple, a lift behind the hero, nodes thinned
  through the middle third where the headline sits.
- **topics** — analytical. Green-led, one restrained sentiment accent.
- **polls** — two opposing fields. Nodes take their colour from their side, and
  only *cross-side* links are drawn: a link within one camp is agreement, not
  consensus.
- **ask** — calmest. Nodes bounded inside a soft disc rather than wandering, and
  no red anywhere; a private guidance screen must never carry a sentiment signal.
- **minimal / static** — forms, and the reduced-motion fallback.

### How much runs

One pure function, [`resolveLayers`](src/lib/motion/config.ts), owns the whole
decision — extracted from the component because it encodes an accessibility
promise and a battery promise, and a rule written as nested ternaries inside JSX
is a rule nobody can test.

- **Reduced motion wins over everything.** The canvas is never mounted, the
  pointer and scroll loops never start, every variant collapses to `static`. The
  page keeps its colour and contours and simply stops moving — stillness, not
  blankness.
- **Mobile** keeps the gradient and drops the canvas, parallax and pointer work.
- **Pointer effects** additionally require a fine pointer.

### Two traps worth recording

The page colour lives on `<html>` **alone**. A background on `<body>` paints as
a block-level descendant — *after* the negative z-index children of the root
stacking context — so setting it there buries the whole layer under a flat fill.

A zero `innerWidth` is treated as *unmeasured*, not as a small screen. A
background tab or a collapsed frame reports 0; classifying that as mobile
silently strips the system down and leaves it stripped, because nothing re-runs
until a resize.

## Layout

```
src/
  app/                     routes: /, /topics, /topics/new, /topics/[slug],
                           /polls, /polls/new, /polls/[slug],
                           /ask, /ask/new, /ask/questions/[id], /ask/verify
  components/
    landing/               landing page sections
    catalog/               ticker, search, sort, filters, topic cards
    polls/                 poll cards, split bar, cross-tabs, vote, reasons
    topic/                 dashboard panels, facet panel, vote composer, tabs
    ask/                   private-guidance screens, provider and chrome
    prototype/             session/vote state, auth sheet, toasts
    ui/                    StatusBadge, SentimentBar/Legend, MetricChange,
                           CategoryIcon, Breadcrumb, PrototypeDataBadge
    ambient/               the background system — see "Ambient background"
    motion/                scroll reveal, animated metrics
    site/                  nav, footer, theme provider/toggle
  lib/
    types.ts               public domain types (mirror the planned Prisma models)
    taxonomy.ts            categories, status colours, sentiment colours, sorts
    facets.ts              category-specific opinion dimensions
    derive.ts              presentation derivations over a Topic
    derive-poll.ts         poll split, verdict and cross-tab derivations
    topics.ts              read model: fetch, filter, sort
    polls.ts               read model for polls
    motion/                every value the background is allowed to use:
      config.ts            variants, densities, alphas, and resolveLayers
      contours.ts          contour geometry — pure, so it cannot mismatch
    ask/                   private guidance — separate types, store and rules:
      access.ts            authorization; every private read is a projection here
      matching.ts          routing on proof; matching is the access grant
      verification.ts      proof catalog: claim, evidence class, what it is not
      assessments.ts       the three ordered scales, per area
      read-model.ts        people and proof — deliberately no question read model
      sample-data/seed.ts  fixtures — see above
    sample-data/           public fixtures — see above
```

`src/lib/topics.ts` is the seam for public data: its function signatures are
what the UI depends on, so swapping fixtures for Prisma queries does not touch
components. `src/lib/ask/access.ts` is the equivalent seam for private data,
and its functions have to move server-side unchanged.
