-- ============================================================================
-- Migration: 20261004000015_kedar_community_full.sql
-- Description: Community Core, Realtime Chat, Upvotes, and Tag System
-- Source of truth: src/features/community/README.md, documents/PLAN.md §5.7
-- ============================================================================

-- 1. Create Enums
do $$ begin
  create type community_kind as enum ('year_branch', 'subject', 'batch', 'unofficial');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type community_member_role as enum ('member', 'moderator');
exception when duplicate_object then null;
end $$;

-- 2. Communities Table
create table if not exists public.communities (
  id           uuid primary key default gen_random_uuid(),
  kind         community_kind not null default 'unofficial',
  name         text not null,
  description  text,
  official     boolean not null default false,
  year         smallint,
  branch       text,
  subject_id   uuid references public.subjects(id) on delete set null,
  batch        text,
  private      boolean not null default false,
  member_count integer not null default 1,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- 3. Community Members Table
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         community_member_role not null default 'member',
  joined_at    timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- 4. Community Messages Table
create table if not exists public.community_messages (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references public.communities(id) on delete cascade,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  parent_id       uuid references public.community_messages(id) on delete cascade,
  body            text not null,
  attachment_path text,
  reactions       jsonb not null default '{}'::jsonb,
  upvote_count    integer not null default 0,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz
);

-- 5. Message Votes Table (Upvotes on replies feed the reputation tag system)
create table if not exists public.message_votes (
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- 6. Community Tags (Reputation badges: helper, doubt_solver, top_contributor)
create table if not exists public.community_tags (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  tag          text not null,
  awarded_at   timestamptz not null default now(),
  primary key (community_id, user_id, tag)
);

-- 7. Message Reports Table (Moderator review queue)
create table if not exists public.message_reports (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.community_messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  status      text not null default 'pending', -- pending, dismissed, actioned
  created_at  timestamptz not null default now()
);

-- 8. Indexes for High Performance
create index if not exists idx_communities_official on public.communities(official, kind);
create index if not exists idx_communities_year_branch on public.communities(year, branch);
create index if not exists idx_community_members_user on public.community_members(user_id);
create index if not exists idx_community_messages_community on public.community_messages(community_id, created_at desc);
create index if not exists idx_community_messages_parent on public.community_messages(parent_id) where parent_id is not null;
create index if not exists idx_message_votes_message on public.message_votes(message_id);
create index if not exists idx_community_tags_user on public.community_tags(community_id, user_id);

-- 9. Trigger Function: Upvotes & Automatic Reputation Tag Awarding
-- SEED VALUES per README §6: helper (10 votes), doubt_solver (25 votes), top_contributor (50 votes)
create or replace function public.handle_message_vote_tags()
returns trigger as $$
declare
  v_author_id    uuid;
  v_community_id uuid;
  v_is_reply     boolean;
  v_total_votes  integer;
begin
  -- Retrieve message details
  select author_id, community_id, (parent_id is not null)
  into v_author_id, v_community_id, v_is_reply
  from public.community_messages
  where id = NEW.message_id;

  -- Only reply votes count toward community reputation tags
  if v_is_reply and v_author_id is not null then
    -- Increment upvote_count on the message
    update public.community_messages
    set upvote_count = upvote_count + 1
    where id = NEW.message_id;

    -- Calculate total upvotes earned on replies in this community
    select coalesce(sum(m.upvote_count), 0)
    into v_total_votes
    from public.community_messages m
    where m.community_id = v_community_id
      and m.author_id = v_author_id
      and m.parent_id is not null;

    -- Award Helper badge (10 upvotes)
    if v_total_votes >= 10 then
      insert into public.community_tags (community_id, user_id, tag)
      values (v_community_id, v_author_id, 'helper')
      on conflict (community_id, user_id, tag) do nothing;
    end if;

    -- Award Doubt Solver badge (25 upvotes)
    if v_total_votes >= 25 then
      insert into public.community_tags (community_id, user_id, tag)
      values (v_community_id, v_author_id, 'doubt_solver')
      on conflict (community_id, user_id, tag) do nothing;
    end if;

    -- Award Top Contributor badge (50 upvotes)
    if v_total_votes >= 50 then
      insert into public.community_tags (community_id, user_id, tag)
      values (v_community_id, v_author_id, 'top_contributor')
      on conflict (community_id, user_id, tag) do nothing;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_award_community_tags on public.message_votes;
create trigger trigger_award_community_tags
  after insert on public.message_votes
  for each row execute function public.handle_message_vote_tags();

-- 10. Enable Row Level Security (RLS)
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;
alter table public.message_votes enable row level security;
alter table public.community_tags enable row level security;
alter table public.message_reports enable row level security;

-- Communities RLS
create policy "Public communities are viewable by all authenticated users"
  on public.communities for select
  to authenticated
  using (not private or id in (select community_id from public.community_members where user_id = auth.uid()));

create policy "Authenticated users can create unofficial communities"
  on public.communities for insert
  to authenticated
  with check (not official and created_by = auth.uid());

-- Community Members RLS
create policy "Members are viewable by community participants"
  on public.community_members for select
  to authenticated
  using (true);

create policy "Users can join public unofficial communities"
  on public.community_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can leave communities"
  on public.community_members for delete
  to authenticated
  using (user_id = auth.uid());

-- Messages RLS
create policy "Messages viewable by community members"
  on public.community_messages for select
  to authenticated
  using (community_id in (select community_id from public.community_members where user_id = auth.uid()));

create policy "Members can post messages"
  on public.community_messages for insert
  to authenticated
  with check (author_id = auth.uid() and community_id in (select community_id from public.community_members where user_id = auth.uid()));

create policy "Authors can edit own messages within deleted_at is null"
  on public.community_messages for update
  to authenticated
  using (author_id = auth.uid());

-- Message Votes RLS
create policy "Votes viewable by all members"
  on public.message_votes for select
  to authenticated
  using (true);

create policy "Members can cast one vote per message"
  on public.message_votes for insert
  to authenticated
  with check (user_id = auth.uid());

-- Community Tags RLS
create policy "Tags viewable by all users"
  on public.community_tags for select
  to authenticated
  using (true);

-- Message Reports RLS
create policy "Users can report messages"
  on public.message_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());
