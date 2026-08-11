# The database

OpinionHQ runs on Supabase — Postgres, its auth service, and row-level security.
This document is the source of truth for the schema; the migrations in
[`supabase/migrations`](../supabase/migrations) are the source of truth for the
database.

**This supersedes the Backend/Auth choices in
[`OpinionHQ-Technical-Roadmap.md`](OpinionHQ-Technical-Roadmap.md) §1.** That
document specified Prisma, Auth.js and a self-hosted Postgres. The phases in §3
still describe the order of the work; the stack under them changed, and §4's
argument about avoiding Vercel is unaffected — the app is still a plain Node
container that talks to a Postgres over the network.

---

## Why Supabase, and what that decision actually bought

The roadmap's original stack put every access rule in application code. That is
fine for topics and polls, which are public measurement objects: the worst a
missed check can do is show somebody a page they could have loaded anyway.

It is not fine for Ask Verified. A question can be private, a thread inside it
is private until the asker opens it, and the asker's rating of an answer is
never shown to anybody — including the professional it is about. Those are three
different rules over the same tables, and in an application-only model each one
is enforced at every call site that touches them. The rule that gets forgotten
is not the one you wrote today; it is the one you wrote today being called from
a route somebody adds in March.

Row-level security moves the rule to the data. `ask_ratings` has exactly one
`select` policy, and it names the asker. There is no route, no query and no
mistake that reads somebody else's rating with a user's key, because the
database does not have a row to return.

The cost is real and worth stating: policies are harder to read than a
`if (viewer.id !== question.askerId) return null`, they run on every row, and a
recursive policy will deadlock a table. The rules in `src/lib/ask/access.ts`
still exist and are still tested — they now describe what the UI should offer,
while the policies decide what the database will hand over.

---

## Setup

```bash
cp .env.example .env.local
```

Fill in `.env.local` from the Supabase dashboard, then:

```bash
npm run db:link
```

```bash
npm run db:push
```

```bash
npm run db:types
```

```bash
npm run db:verify
```

| Script                     | What it does                                                     |
| -------------------------- | ---------------------------------------------------------------- |
| `npm run db:link`          | Points the CLI at the project                                     |
| `npm run db:push`          | Applies pending migrations                                        |
| `npm run db:diff`          | Shows drift between the migrations and the live schema            |
| `npm run db:lint`          | Type-checks every function body against the live schema           |
| `npm run db:types`         | Regenerates `src/lib/supabase/database.types.ts` from live schema |
| `npm run db:gen-reference` | Writes a new reference-data migration from the TypeScript         |
| `npm run db:verify`        | Round-trips against the live project, including that RLS refuses  |
| `npm run auth:configure`   | Applies the auth settings that must agree with the code (`-- --dry` to preview) |

Two of these are load-bearing rather than convenient.

`db:verify` does not check that a client constructs — that succeeds against a
typo'd URL. It checks that the places tree nested correctly, that the read models
resolve, and that an anonymous caller is *refused* when it reaches for
`profile_private`, `topic_stats` and `ask_ratings`.

**`db:lint` is the only thing that type-checks a `plpgsql` body.** Postgres does
not resolve the statements inside one until it is first called, so a migration
containing a genuine type error applies perfectly and fails months later, on the
first admin who tries the feature. That is not hypothetical here — it is exactly
how `review_credential` shipped assigning a `text` literal to an enum column, and
how the linter caught it. Run it after every push.

---

## The keys

Three, and confusing them is the only way to get this badly wrong.

| Key                                    | Ships to the browser | Bypasses RLS |
| -------------------------------------- | -------------------- | ------------ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes, by design       | No           |
| `SUPABASE_SECRET_KEY`                  | Never                | **Yes**      |
| `SUPABASE_ACCESS_TOKEN`                | Never                | CLI only     |

The publishable key is public. It is compiled into every page and always has
been; treating it as a secret leads people to reach for the secret key "to be
safe", which is the actual mistake. What protects the data is the policies.

`src/lib/supabase/admin.ts` imports `server-only`, so importing it from a client
component is a build error rather than a leak. Its docstring lists the four
things it is for. Nothing else belongs on that list.

---

## Shape of the schema

Four groups, and the boundaries between them are deliberate.

### Reference — the editorial vocabularies

`places`, `categories`, `ask_categories`, `proof_kinds`, `occupations`, and the
facet library (`facet_sets` → `facet_set_facets` → `facet_set_options`).

World-readable, editor-writable, and **generated**. `npm run db:gen-reference`
emits a migration from `src/lib/places.ts`, `src/lib/taxonomy.ts`,
`src/lib/facets.ts`, `src/lib/ask/taxonomy.ts`, `src/lib/ask/verification.ts` and
`src/lib/demographics.ts`. Change the TypeScript, re-run, commit the new file.
Hand-editing the generated migration means the next regeneration reverts you.

`places.path` is materialised by trigger: Bengaluru's is
`{bengaluru,karnataka,india,worldwide}`. That is what makes "everything in
Karnataka" one GIN-indexed array test instead of a recursive CTE per query — and
it preserves the one-directional containment the product needs. Filtering to
India does **not** return `worldwide` artifacts. A place filter that quietly
widens itself is a filter you stop trusting.

## Auth

Accounts are real. Everything else in the app is still the prototype.

### The sign-up flow, and why its order survived

Four steps: name and address → prove the address → set a password → demographics.
Verifying before the password means a mistyped address fails while nobody has
invested anything, and no account can exist against an address its owner never
confirmed. On a product whose claim is "one account, one vote", an unverified
account is a vote somebody manufactured.

The obvious mapping onto Supabase — `signUp({ email, password })` — forces the
password one step earlier and reorders the screens.
`signInWithOtp({ shouldCreateUser: true })` does not: it creates the account from
the address alone, emails a code, and leaves the password to `updateUser`
afterwards. The four steps map one to one.

One consequence worth knowing: if the address **already** has an account, step
two is a passwordless login to it and step three sets a new password. That is a
password reset wearing a sign-up's clothes — legitimate, because both require
reading a code sent to that address. `alreadyHadAccount` is how the UI notices
and avoids claiming it created something it did not. "Forgot password?" routes
here deliberately rather than to a second screen that emails a second code.

### Where each call runs

| | Runs | Why |
|---|---|---|
| Sign-up, verify, set password, save details | Browser | The session cookie is written by `@supabase/ssr`; the server adds nothing |
| **Sign-in** | **Server action** | The field accepts a username, and resolving one to an address is a question a browser must not be able to ask |
| OAuth callback | Route handler | PKCE code exchange needs to write cookies; a Server Component cannot |
| Session refresh | Middleware | The only place that can read the request's cookies *and* write the response's |

`email_for_username` is execute-revoked from `anon` and `authenticated` — it is an
enumeration oracle, and only the service role holds the key. Its single caller
returns the **same sentence** for a missing username and a wrong password, so the
oracle is not rebuilt one layer above the function that was locked to prevent it.

### What is configured, and by what

`npm run auth:configure` applies the settings that have to agree with constants
in the code. Three of them do, and a setting that has to agree with code is a
setting that drifts:

| Setting | Value | Agrees with |
|---|---|---|
| `mailer_otp_length` | 6 | `CODE_LENGTH` |
| `password_min_length` | 10 | `MIN_PASSWORD_LENGTH` |
| `uri_allow_list` | localhost + theopinionhq.com callbacks | `/auth/callback` |
| email templates | carry `{{ .Token }}` | **refused — see below** |

The OTP length is the sharp one. Six boxes rendered for an eight-digit code
rejects every submission, and nobody looks at a dashboard field when the error
says "invalid token". `signup.test.ts` asserts `CODE_LENGTH` is 6 for that reason.

### Two things still need a person

**Email templates are plan-blocked.** Supabase will not let a free-tier project on
the built-in sender change them, and the default template carries a magic link
with no `{{ .Token }}`. **So no code is emailed and step two of sign-up has nothing
to type.** Configuring custom SMTP lifts the restriction — and fixes the
few-emails-an-hour cap on the built-in sender at the same time. Until then,
sign-up cannot be completed by a real person through the UI.

**Google is switched off.** It needs a Google Cloud client ID and secret in
Authentication → Sign In / Providers. The button is not rendered while the
provider is off: `signInWithOAuth` navigates before it can report an
unconfigured provider, so a button shown regardless hands the visitor a page of
JSON on Supabase's domain. `enabledProviders()` asks `/auth/v1/settings` once per
mount, so the button appears on its own the moment the provider is configured —
no code change, no environment variable to remember.

### The account hierarchy — two axes, not one ladder

This is the thing to hold on to:

| | Meaning |
|---|---|
| **role** — `member` / `editor` / `admin` | what you are *permitted* to do |
| **pro** — a live `subscriptions` row | what you have *paid for* |

A Pro subscriber is a member who pays. An admin may or may not be Pro, and it
does not matter either way. Folding them into one ladder would mean a declined
card could touch somebody's permissions, and an admin would need a subscription
granted to them to use the feature they are meant to be administering.

| | member | editor | admin |
|---|:--:|:--:|:--:|
| Vote, write opinions, reply, ask | ● | ● | ● |
| Answer questions (with verified proof) | ● | ● | ● |
| Create and publish topics and polls | | ● | ● |
| Timeline, status, moderation | | ● | ● |
| Archive a topic | | ● | ● |
| **Delete** a topic or poll | | | ● |
| Grant roles, suspend accounts | | | ● |
| Delete accounts | | | ● |
| Approve verification proof | | | ● |
| Read the audit log | | | ● |

Editor and admin are separate because a new teammate needs to publish topics on
their first day, and no version of that job also requires the power to delete
somebody's account. Editors *archive*; `archived_at` takes a topic off the site
and keeps the measurements. Deleting one destroys every opinion attached to it,
which is why the button is further away.

**Deleting an account is a hard delete.** It removes their votes and opinions,
and the topic's participant count and sentiment split move to match — a
percentage published yesterday can read differently today, and a PDF exported
before the deletion will no longer agree with the live page. It also removes
**answers they wrote to other people's questions**: if a verified professional
deletes their account, the askers they helped lose the advice. `topic_daily_stats`
is not rewritten, so a trend chart shows a step where the deletion landed. That
is honest; silently editing past measurements to match a present-day deletion
would be worse.

Reach for `set_account_suspended` first. It is reversible, stops the account
writing anything (checked in the insert policies, so a token issued before the
suspension does not get a grace period), and destroys nothing.

Every irreversible admin action writes to `admin_actions` in the same
transaction, before the thing it describes stops existing.

**One thing the admin UI must get right:** a DELETE that RLS refuses does not
raise an error — it silently affects zero rows. Check the returned count, not
just the absence of an error, or the screen will report success on a refusal.

#### The first admin

There is a chicken and egg that cannot be solved in SQL: every privileged
function requires an admin, and a fresh database has none. A self-service "claim
admin if there are none" call would close it and would also mean whoever signs up
first — including somebody who found the site before you did — becomes the
administrator.

So it is done by hand, once, in the Supabase SQL editor, after signing up
through the app:

```sql
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'you@example.com');
```

Every grant after that goes through `set_account_role`, which is audited. This is
the only privileged change in the system that is not.

### Identity — split, and the split is the privacy model

`profiles` is what other people see: name, monogram, headline, expertise, role.
World-readable, because every opinion and answer joins to it for a name.

`profile_private` is date of birth, phone, occupation, location. Readable by its
owner and by admins, and by nothing else.

Two tables rather than one table behind a carefully-worded view, because a view
that exposes a subset is one `select *` away from exposing everything, and the
column that leaks is always the one somebody added later.

**The demographics are never read by a chart.** They are read once, by a trigger,
at the moment a vote is cast, and the resulting *bucket* is stamped onto the vote
(`age_band`, `occupation`, `place_id`). Every cross-tab in the product is a
group-by over those buckets. A date of birth is not in the query plan. The
snapshot is also more correct: a vote's age band should not silently move when
its author has a birthday.

### Public measurement — topics and polls

`topics` is what editors publish. `opinions` is what participants write, and it
is **one table**: a bare vote, a written opinion and a Pro contribution are the
same row with more of it filled in. `format` is the only difference. There is no
second feed and no second reply system.

`unique (topic_id, author_id)` is the one-account-one-vote claim, enforced by the
database rather than by whichever handler happened to run.

Aggregates live in `topic_stats` and `poll_stats`, maintained incrementally by
trigger, and `authenticated` has no insert, update or delete privilege on either.
A client cannot post its own participant count. Percentages are *not* stored:
rounding three shares so they sum to 100 is a presentation decision and stays in
`src/lib/derive.ts`.

Two things are deliberately not derived, because they cannot be:
`topic_daily_stats` and `poll_history` are past readings, written by a scheduled
job. Reconstructing a plausible curve from today's counts would put a chart of
measurements on screen where no measurement was ever taken.

**An embedded interactive block's results are not the topic's results.** A block
belongs to the contribution carrying it. `interactive_responses` is a separate
table with no trigger into `topic_stats`, and `block_tallies()` is a separate
function from `aspect_tallies()`. If those ever merge, somebody has folded one
contributor's private question into the topic's headline number — which would
let anyone move it by wording a block to get the answer they wanted.

### Private consultation — Ask Verified

Where RLS earns its keep.

| Table                   | Who can read it                                      |
| ----------------------- | ---------------------------------------------------- |
| `ask_questions`         | Anyone if public; otherwise the asker and its matches |
| `ask_answers`           | Whoever can read the question                         |
| `ask_comments`          | Anyone — **public questions only**                    |
| `ask_messages`          | The two parties, and only once the channel is open    |
| `ask_ratings`           | The asker. Nobody else, at all                        |
| `credentials`           | Anyone, once verified; the applicant before that      |
| `credential_submissions`| Admins. The applicant can post and never read back    |

`ask_matches` has no insert policy for anyone. Routing runs under the service
role, because a client that could write there could route a question to itself.

`ask_threads.private_opened_at` carries the whole "the asker's door" rule: the
thread record exists from the moment somebody is matched, and the private channel
inside it starts closed. The message policies test that column, so before the
asker opens it there is nothing to read even for somebody querying directly.

`credentials` has **no column for a document, an address or an identity number**.
That absence is the enforcement, not a promise. Evidence goes to
`credential_submissions`, which is admin-only and purged after review.

---

## Conventions that are load-bearing

**Every table has RLS enabled.** A table with it off is a table the publishable
key reads in full. `src/lib/supabase/schema-sync.test.ts` fails the build if a
future migration adds a table and forgets the `alter table` line — the mistake is
invisible in review and total in effect.

**Every `security definer` function sets `search_path = ''` and schema-qualifies
everything.** A definer function with a mutable search path is the classic
Postgres privilege-escalation hole. Same test enforces it.

**Views are `security_invoker = on`.** A view without it runs as its owner and
silently bypasses the policies of everything it touches, which would undo the
schema one convenience view at a time.

**Column privileges do what policies cannot.** A policy cannot restrict a column,
so `revoke update (role) on public.profiles` is what stops "edit your own
profile" from meaning "make yourself an admin". Same pattern guards every
trigger-maintained counter.

**Server code calls `getUser()`, never `getSession()`.** The cookie is
attacker-controllable; only the auth server can say whether the token in it is
real.

**The enums restate the TypeScript unions, and a test asserts they agree.**
Adding a member to `StatusId` compiles and ships and then fails when an editor
saves. The same test checks the constants that policies hard-code — `FREE_ASKS`,
`MAX_MATCHES`, `REPLY_CAP`, `MAX_COMMENT_DEPTH` — because a policy cannot import
one.

---

## What is not built yet

- **The read models still return fixtures.** `src/lib/topics.ts`,
  `src/lib/polls.ts` and the Ask read model read from `src/lib/sample-data`. Their
  signatures were written to be swappable; swapping them is the next piece of
  work.
- **Votes, follows and drafts are still `localStorage`.** `PrototypeProvider`
  keeps them; only *who is signed in* moved to the database. That split is
  deliberate — moving the rest needs the read models rewritten, and this change
  did not want to be that too. `signOut` says "your votes stay recorded on this
  device", which is true today and stops being true the moment they move.
- **No admin UI.** Every admin power exists as a policy or an audited function
  and has no screen. Topics can only be created by SQL or the Supabase table
  editor until one exists.
- **No scheduled jobs.** `trend_score`, `topic_daily_stats`, `poll_history` and
  `professional_stats` have their columns and no writer. Each needs a job under
  the service role.
- **The bot check is still a placeholder.** Cloudflare Turnstile or hCaptcha, and
  the server-side verification call is the part that matters — a captcha
  validated only in the browser stops nobody, because a bot never runs the
  browser code.
- **Nothing seeds topics or polls.** By design: the reference migration contains
  no users, no votes and no engagement figures (AGENTS.md §7). The app starts
  genuinely empty and every number on screen will be a real one.
