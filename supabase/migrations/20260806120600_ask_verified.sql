-- =============================================================================
-- Ask Verified — private one-to-one guidance.
--
-- The whole feature is one sentence: a person asks a private question, and
-- people who have proved they know something relevant answer it.
--
-- THIS IS THE FILE WHERE RLS EARNS ITS KEEP. Topics and polls are public
-- measurement objects; these are consultations. A bug in a handler that forgets
-- to check `viewer.userId` leaks somebody's job situation to a stranger, and the
-- policies below are the reason such a bug returns an empty set instead. The
-- rules in `src/lib/ask/access.ts` are restated here as policies deliberately:
-- one of the two can be forgotten at a call site, and it is not this one.
-- =============================================================================

-- =============================================================================
-- Proof
-- =============================================================================

-- One verified claim.
--
-- `public_label` is the only field ever rendered to another user. THERE IS NO
-- COLUMN HERE FOR A DOCUMENT, AN ADDRESS OR AN IDENTITY NUMBER, and that absence
-- is the enforcement rather than a promise. The evidence goes to
-- `credential_submissions`, which is admin-only and purged on review.
create table public.credentials (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  category          public.ask_category not null,
  proof_type        public.proof_type not null references public.proof_kinds (id) on update cascade,
  -- Copied from the proof kind at approval, so re-wording the vocabulary later
  -- does not silently restate a claim somebody was verified against.
  public_label      text not null,
  evidence_category text not null,
  status            public.credential_status not null default 'pending',
  submitted_at      timestamptz not null default now(),
  verified_at       timestamptz,
  reviewed_by       uuid references public.profiles (id) on delete set null,
  review_note       text,
  -- Verification is not permanent. A current-student claim stops being true.
  expires_at        timestamptz,
  unique (user_id, category, proof_type)
);

create index credentials_user_idx on public.credentials (user_id);
create index credentials_live_idx on public.credentials (user_id, category)
  where status = 'verified';

revoke insert (status, public_label, evidence_category, verified_at, reviewed_by)
  on public.credentials from authenticated, anon;
revoke update on public.credentials from authenticated, anon;

-- The evidence itself. Separate table, admin-only, and deleted when the review
-- is done — `storage_path` points at a private Storage object, never at
-- something a public URL could reach.
create table public.credential_submissions (
  credential_id uuid primary key references public.credentials (id) on delete cascade,
  storage_path  text not null,
  submitted_at  timestamptz not null default now(),
  -- Set when the reviewer has finished and the object has been destroyed.
  purged_at     timestamptz
);

-- Which areas somebody may answer in.
--
-- Per area, and literal about it: proof of employment qualifies you on careers
-- and on nothing else. A verified software engineer has no standing on college
-- admissions, and a CAT score says nothing about GATE.
create or replace function public.is_verified_for(area public.ask_category, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.credentials c
    where c.user_id = uid
      and c.category = area
      and c.status = 'verified'
      and (c.expires_at is null or c.expires_at > now())
  );
$$;

-- =============================================================================
-- Questions
-- =============================================================================

create table public.ask_questions (
  id           uuid primary key default gen_random_uuid(),
  asker_id     uuid not null references public.profiles (id) on delete cascade,
  -- Public is the default, because a good answer to "IIT or a state college?" is
  -- worth reading by the next hundred people asking it. Private is one checkbox
  -- away and changes nothing else about the flow.
  visibility   public.question_visibility not null default 'public',
  category     public.ask_category not null,
  -- Coarse on purpose — a state, or the country, never an address. It is shown
  -- publicly, and anything finer would identify somebody who chose to publish a
  -- question and not themselves.
  place_id     text not null references public.places (id) on update cascade,
  title        text not null,
  -- One box. The placeholder prompts for situation, goal and constraints.
  context      text not null default '',
  -- Free text. Empty when there is no deadline.
  deadline     text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  closed_at    timestamptz,

  constraint ask_questions_title check (length(trim(title)) between 8 and 200),
  constraint ask_questions_context check (length(context) <= 4000)
);

create index ask_questions_asker_idx on public.ask_questions (asker_id, created_at desc);
create index ask_questions_public_idx on public.ask_questions (category, created_at desc)
  where visibility = 'public';

create trigger ask_questions_set_updated_at
before update on public.ask_questions
for each row execute function public.set_updated_at();

-- The choices being weighed, two to four. These *are* the question: a
-- professional scores these, not a generic set of dimensions.
create table public.ask_question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.ask_questions (id) on delete cascade,
  slot        public.option_slot not null,
  label       text not null,
  unique (question_id, slot)
);

create index ask_question_options_question_idx on public.ask_question_options (question_id, slot);

-- ------------------------------------------------------------- entitlements
--
-- Derived from the questions actually asked rather than from a counter. A
-- counter can drift from the record it is supposed to describe; this cannot,
-- because it *is* the record.
create or replace function public.asks_used(uid uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.ask_questions q where q.asker_id = uid;
$$;

-- Two free, not one and not five. One is a trial you cannot learn anything from
-- — you get a single answer and no sense of whether a second opinion disagrees,
-- which is the entire proposition. Five would be enough that most people never
-- need to pay. Mirrors `FREE_ASKS` in `src/lib/entitlements.ts`.
create or replace function public.can_ask(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select uid is not null and (public.is_pro(uid) or public.asks_used(uid) < 2);
$$;

-- =============================================================================
-- Matching — no preview state and no accept step: matching *is* the grant.
-- =============================================================================

create table public.ask_matches (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references public.ask_questions (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  -- Why the rules picked them, in plain words, shown to both sides.
  reasons         text[] not null default '{}',
  matched_at      timestamptz not null default now(),
  -- Set when the asker resolves or closes the thread.
  revoked_at      timestamptz,
  unique (question_id, professional_id)
);

create index ask_matches_professional_idx on public.ask_matches (professional_id, matched_at desc)
  where revoked_at is null;

-- Three, the same as `MAX_MATCHES`. A question routed to twenty people is a
-- broadcast, and nobody answers a broadcast carefully.
create or replace function public.check_match_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.ask_matches
       where question_id = new.question_id and revoked_at is null) > 3 then
    raise exception 'a question routes to at most three professionals';
  end if;
  return null;
end;
$$;

create trigger ask_matches_bound
after insert on public.ask_matches
for each row execute function public.check_match_count();

-- Who may read this question.
--
-- SECURITY DEFINER so it can be used inside the policy on `ask_questions`
-- itself without re-entering that policy and recursing.
create or replace function public.can_view_question(qid uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ask_questions q
    where q.id = qid
      and (
        q.visibility = 'public'
        or q.asker_id = uid
        or exists (
          select 1 from public.ask_matches m
          where m.question_id = q.id and m.professional_id = uid and m.revoked_at is null
        )
      )
  );
$$;

-- =============================================================================
-- Answers
-- =============================================================================

create table public.ask_answers (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references public.ask_questions (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  -- Index of the option they would take, or -1 for "none of these".
  pick            integer not null default -1 check (pick between -1 and 3),
  -- One line at the top of the response.
  summary         text not null,
  reasoning       text not null default '',
  next_steps      text[] not null default '{}',
  -- Readers saying the answer was worth reading. Held as two counts rather than
  -- one net score: a score of zero could be nobody voting or fifty people
  -- disagreeing, and collapsing them throws away the more interesting one.
  likes           integer not null default 0 check (likes >= 0),
  dislikes        integer not null default 0 check (dislikes >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (question_id, professional_id),
  constraint ask_answers_summary check (length(trim(summary)) between 4 and 400)
);

create trigger ask_answers_set_updated_at
before update on public.ask_answers
for each row execute function public.set_updated_at();

revoke insert (likes, dislikes) on public.ask_answers from authenticated, anon;
revoke update (likes, dislikes, question_id, professional_id) on public.ask_answers from authenticated, anon;

-- One verdict per option. A table rather than an array aligned by index, so a
-- reordered option list cannot silently reassign somebody's assessment.
create table public.ask_answer_verdicts (
  answer_id uuid not null references public.ask_answers (id) on delete cascade,
  option_id uuid not null references public.ask_question_options (id) on delete cascade,
  -- 0–4, indexing VERDICT_LEVELS: Strongly avoid → Strongly recommend.
  level     integer not null check (level between 0 and 4),
  primary key (answer_id, option_id)
);

-- =============================================================================
-- Threads
--
-- Identified by (question, professional) rather than by an id of their own:
-- there is exactly one thread per pair, and giving it a separate identity
-- invited code that could accidentally join two professionals into one
-- conversation.
--
-- TWO THINGS LIVE IN ONE RECORD, and the distinction is the whole of
-- `private_opened_at`. The record exists from the moment somebody is matched,
-- because it is how this pair's status is tracked. The private *channel* inside
-- it is a separate thing that starts closed — a private conversation nobody
-- asked for is not a feature. This is the asker's door, and it stays shut until
-- they open it.
-- =============================================================================

create table public.ask_threads (
  question_id       uuid not null references public.ask_questions (id) on delete cascade,
  professional_id   uuid not null references public.profiles (id) on delete cascade,
  status            public.thread_status not null default 'Awaiting answer',
  private_opened_at timestamptz,
  outcome           public.thread_outcome,
  updated_at        timestamptz not null default now(),
  primary key (question_id, professional_id)
);

create trigger ask_threads_set_updated_at
before update on public.ask_threads
for each row execute function public.set_updated_at();

-- A match creates the thread, in the same transaction. A matched professional
-- with no thread row would be somebody the status board cannot describe.
create or replace function public.ensure_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ask_threads (question_id, professional_id)
  values (new.question_id, new.professional_id)
  on conflict do nothing;
  return null;
end;
$$;

create trigger ask_matches_ensure_thread
after insert on public.ask_matches
for each row execute function public.ensure_thread();

create table public.ask_messages (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null,
  professional_id uuid not null,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  sender_role     public.sender_role not null,
  body            text not null,
  created_at      timestamptz not null default now(),
  read_at         timestamptz,
  foreign key (question_id, professional_id)
    references public.ask_threads (question_id, professional_id) on delete cascade,
  constraint ask_messages_body check (length(trim(body)) between 1 and 4000)
);

create index ask_messages_thread_idx on public.ask_messages (question_id, professional_id, created_at);

-- Five replies per side, the same as `REPLY_CAP`. A cap is what keeps a
-- consultation a consultation rather than a chat client nobody staffed.
create or replace function public.check_reply_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.ask_messages
       where question_id = new.question_id
         and professional_id = new.professional_id
         and sender_role = new.sender_role) > 5 then
    raise exception 'reply cap reached for this side of the thread';
  end if;
  return null;
end;
$$;

create trigger ask_messages_cap
after insert on public.ask_messages
for each row execute function public.check_reply_cap();

-- =============================================================================
-- The asker's private rating.
--
-- NEVER SHOWN TO ANOTHER USER — not to the professional it is about, not to an
-- editor, not to an admin. It is one person saying whether the advice worked for
-- their situation, and the moment the person being rated can read it, it stops
-- being that and becomes feedback nobody writes honestly.
--
-- The aggregate that *is* public (a professional's helpful percentage) is
-- computed under the service role and withheld below five answers — "100%
-- helpful" off two ratings is noise wearing a statistic's clothes.
-- =============================================================================

create table public.ask_ratings (
  question_id     uuid not null,
  professional_id uuid not null,
  -- 0–3, indexing RATING_LEVELS: Not useful → Exactly what I needed.
  helpfulness     integer not null check (helpfulness between 0 and 3),
  created_at      timestamptz not null default now(),
  primary key (question_id, professional_id),
  foreign key (question_id, professional_id)
    references public.ask_threads (question_id, professional_id) on delete cascade
);

-- =============================================================================
-- Public comments on an answer.
--
-- Only ever exists on a public question. Threaded, because flat comments did not
-- stop the conversation — people replied anyway, inside a new top-level comment
-- quoting the one they meant, so the discussion existed with its structure
-- thrown away. Nesting does not create the discussion; it stops the page lying
-- about which comment answers which. The depth cap is where the "this is not a
-- forum" argument still bites, and it holds the line instead.
-- =============================================================================

create table public.ask_comments (
  id              uuid primary key default gen_random_uuid(),
  answer_id       uuid not null references public.ask_answers (id) on delete cascade,
  parent_id       uuid references public.ask_comments (id) on delete cascade,
  author_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null,
  -- Clamped at MAX_COMMENT_DEPTH (4) by trigger. Stored so a thread can be
  -- rendered without walking the chain per row.
  depth           integer not null default 0 check (depth between 0 and 4),
  likes           integer not null default 0 check (likes >= 0),
  dislikes        integer not null default 0 check (dislikes >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  hidden_at       timestamptz,
  constraint ask_comments_body check (length(trim(body)) between 1 and 2000)
);

create index ask_comments_answer_idx on public.ask_comments (answer_id, created_at);
create index ask_comments_parent_idx on public.ask_comments (parent_id);

create trigger ask_comments_set_updated_at
before update on public.ask_comments
for each row execute function public.set_updated_at();

revoke insert (depth, likes, dislikes) on public.ask_comments from authenticated, anon;
revoke update (depth, likes, dislikes, answer_id, parent_id, author_id) on public.ask_comments from authenticated, anon;

create or replace function public.set_comment_depth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_depth integer;
  parent_answer uuid;
begin
  if new.parent_id is null then
    new.depth := 0;
  else
    select c.depth, c.answer_id into parent_depth, parent_answer
      from public.ask_comments c where c.id = new.parent_id;
    if parent_answer is distinct from new.answer_id then
      raise exception 'a reply must hang off a comment on the same answer';
    end if;
    new.depth := least(coalesce(parent_depth, 0) + 1, 4);
  end if;

  -- Comments exist on public questions only. Enforced here as well as in the
  -- policy, so a service-role script cannot open a private consultation to
  -- comments by forgetting to check.
  if not exists (
    select 1 from public.ask_answers a
    join public.ask_questions q on q.id = a.question_id
    where a.id = new.answer_id and q.visibility = 'public'
  ) then
    raise exception 'comments exist on public questions only';
  end if;

  return new;
end;
$$;

create trigger ask_comments_depth
before insert on public.ask_comments
for each row execute function public.set_comment_depth();

-- ------------------------------------------------------------ reader votes
--
-- One entry per thing, so like and dislike are mutually exclusive by the shape
-- of the data rather than by a rule somebody has to remember.
create table public.ask_answer_votes (
  answer_id  uuid not null references public.ask_answers (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       public.reader_vote not null,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

create table public.ask_comment_votes (
  comment_id uuid not null references public.ask_comments (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       public.reader_vote not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create or replace function public.apply_reader_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  up integer := 0;
  down integer := 0;
begin
  if tg_op <> 'INSERT' then
    up   := up   - (old.vote = 'like')::int;
    down := down - (old.vote = 'dislike')::int;
  end if;
  if tg_op <> 'DELETE' then
    up   := up   + (new.vote = 'like')::int;
    down := down + (new.vote = 'dislike')::int;
  end if;

  if tg_table_name = 'ask_answer_votes' then
    update public.ask_answers set
      likes = greatest(likes + up, 0), dislikes = greatest(dislikes + down, 0)
     where id = coalesce(new.answer_id, old.answer_id);
  else
    update public.ask_comments set
      likes = greatest(likes + up, 0), dislikes = greatest(dislikes + down, 0)
     where id = coalesce(new.comment_id, old.comment_id);
  end if;

  return null;
end;
$$;

create trigger ask_answer_votes_count after insert or update or delete on public.ask_answer_votes
for each row execute function public.apply_reader_vote();

create trigger ask_comment_votes_count after insert or update or delete on public.ask_comment_votes
for each row execute function public.apply_reader_vote();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.credentials            enable row level security;
alter table public.credential_submissions enable row level security;
alter table public.ask_questions          enable row level security;
alter table public.ask_question_options   enable row level security;
alter table public.ask_matches            enable row level security;
alter table public.ask_answers            enable row level security;
alter table public.ask_answer_verdicts    enable row level security;
alter table public.ask_threads            enable row level security;
alter table public.ask_messages           enable row level security;
alter table public.ask_ratings            enable row level security;
alter table public.ask_comments           enable row level security;
alter table public.ask_answer_votes       enable row level security;
alter table public.ask_comment_votes      enable row level security;

-- A verified claim is public — it is the whole reason to believe the answer.
-- A pending or rejected one is between the applicant and the reviewer.
create policy "verified credentials are public" on public.credentials for select
  using (status = 'verified' or user_id = (select auth.uid()) or public.is_admin());
create policy "submit your own proof" on public.credentials for insert
  with check (user_id = (select auth.uid()));
create policy "admins review proof" on public.credentials for all
  using (public.is_admin()) with check (public.is_admin());

-- The evidence itself is admin-only, in both directions. An applicant can post
-- theirs and never read it back.
create policy "attach your own evidence" on public.credential_submissions for insert
  with check (exists (
    select 1 from public.credentials c
    where c.id = credential_id and c.user_id = (select auth.uid())
  ));
create policy "admins read evidence" on public.credential_submissions for all
  using (public.is_admin()) with check (public.is_admin());

-- Public, mine, or routed to me. Nothing else.
create policy "questions you may read" on public.ask_questions for select
  using (public.can_view_question(id));

create policy "ask within your allowance" on public.ask_questions for insert
  with check (asker_id = (select auth.uid()) and public.can_ask());

create policy "edit your own question" on public.ask_questions for update
  using (asker_id = (select auth.uid())) with check (asker_id = (select auth.uid()));
create policy "delete your own question" on public.ask_questions for delete
  using (asker_id = (select auth.uid()));

create policy "options follow the question" on public.ask_question_options for select
  using (public.can_view_question(question_id));
create policy "asker writes options" on public.ask_question_options for all
  using (exists (select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid())))
  with check (exists (select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid())));

-- Both sides see the routing and why it happened.
create policy "matches you are party to" on public.ask_matches for select
  using (
    professional_id = (select auth.uid())
    or exists (select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid()))
  );
-- Routing is the server's job: it applies the matching rules under the service
-- role. A client that could insert here could route a question to itself.
revoke insert, update, delete on public.ask_matches from authenticated, anon;

create policy "answers you may read" on public.ask_answers for select
  using (public.can_view_question(question_id));

-- Answering is free, and it requires exactly two things: being routed the
-- question, and holding verified proof in that area.
create policy "answer what you were routed" on public.ask_answers for insert
  with check (
    professional_id = (select auth.uid())
    and exists (
      select 1 from public.ask_matches m
      where m.question_id = ask_answers.question_id
        and m.professional_id = (select auth.uid())
        and m.revoked_at is null
    )
    and exists (
      select 1 from public.ask_questions q
      where q.id = ask_answers.question_id and public.is_verified_for(q.category)
    )
  );

create policy "edit your own answer" on public.ask_answers for update
  using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));

create policy "verdicts follow the answer" on public.ask_answer_verdicts for select
  using (exists (
    select 1 from public.ask_answers a
    where a.id = answer_id and public.can_view_question(a.question_id)
  ));
create policy "author writes verdicts" on public.ask_answer_verdicts for all
  using (exists (select 1 from public.ask_answers a where a.id = answer_id and a.professional_id = (select auth.uid())))
  with check (exists (select 1 from public.ask_answers a where a.id = answer_id and a.professional_id = (select auth.uid())));

create policy "threads you are party to" on public.ask_threads for select
  using (
    professional_id = (select auth.uid())
    or exists (select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid()))
  );

-- The asker opens the door and closes the thread; the professional may move the
-- status but cannot open the private channel and cannot decide the outcome.
create policy "asker manages the thread" on public.ask_threads for update
  using (exists (select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid())))
  with check (exists (select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid())));

revoke update (private_opened_at, outcome) on public.ask_threads from anon;

-- Messages are readable by the two people in the thread, and only once the
-- asker has opened the channel. Before that there is nothing to read, and this
-- policy means there is nothing to read even for somebody querying directly.
create policy "messages in your open thread" on public.ask_messages for select
  using (
    exists (
      select 1 from public.ask_threads t
      where t.question_id = ask_messages.question_id
        and t.professional_id = ask_messages.professional_id
        and t.private_opened_at is not null
        and (
          t.professional_id = (select auth.uid())
          or exists (select 1 from public.ask_questions q where q.id = t.question_id and q.asker_id = (select auth.uid()))
        )
    )
  );

create policy "write in your open thread" on public.ask_messages for insert
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.ask_threads t
      where t.question_id = ask_messages.question_id
        and t.professional_id = ask_messages.professional_id
        and t.private_opened_at is not null
        and (
          (ask_messages.sender_role = 'professional' and t.professional_id = (select auth.uid()))
          or (ask_messages.sender_role = 'asker' and exists (
                select 1 from public.ask_questions q
                where q.id = t.question_id and q.asker_id = (select auth.uid())))
        )
    )
  );

-- THE ASKER, AND NOBODY ELSE. Not the professional it is about, not an editor,
-- not an admin. There is no select policy granting anyone else, and that is the
-- point rather than an omission.
create policy "your own rating" on public.ask_ratings for select
  using (exists (
    select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid())
  ));
create policy "rate an answer to your question" on public.ask_ratings for insert
  with check (exists (
    select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid())
  ));
create policy "change your rating" on public.ask_ratings for update
  using (exists (
    select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.ask_questions q where q.id = question_id and q.asker_id = (select auth.uid())
  ));

-- Comments live on public questions. `can_view_question` would also let a
-- matched professional read a private one, so the visibility test is repeated
-- explicitly rather than inherited.
create policy "comments on public questions" on public.ask_comments for select
  using (
    (hidden_at is null or author_id = (select auth.uid()) or public.is_editor())
    and exists (
      select 1 from public.ask_answers a
      join public.ask_questions q on q.id = a.question_id
      where a.id = answer_id and q.visibility = 'public'
    )
  );

create policy "comment on a public answer" on public.ask_comments for insert
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.ask_answers a
      join public.ask_questions q on q.id = a.question_id
      where a.id = answer_id and q.visibility = 'public'
    )
  );

create policy "edit your own comment" on public.ask_comments for update
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "delete your own comment" on public.ask_comments for delete
  using (author_id = (select auth.uid()));
create policy "editors moderate comments" on public.ask_comments for update
  using (public.is_editor()) with check (public.is_editor());

create policy "own answer vote" on public.ask_answer_votes for select
  using (user_id = (select auth.uid()));
create policy "vote on a readable answer" on public.ask_answer_votes for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.ask_answers a
      join public.ask_questions q on q.id = a.question_id
      where a.id = answer_id and q.visibility = 'public'
    )
  );
create policy "change your answer vote" on public.ask_answer_votes for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "withdraw your answer vote" on public.ask_answer_votes for delete
  using (user_id = (select auth.uid()));

create policy "own comment vote" on public.ask_comment_votes for select
  using (user_id = (select auth.uid()));
create policy "vote on a comment" on public.ask_comment_votes for insert
  with check (user_id = (select auth.uid()));
create policy "change your comment vote" on public.ask_comment_votes for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "withdraw your comment vote" on public.ask_comment_votes for delete
  using (user_id = (select auth.uid()));
