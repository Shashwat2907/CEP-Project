-- ============================================================================
-- Migration: 20261004000016_kedar_clubs_full.sql
-- Description: Clubs Core — clubs, club_members, club_notices with RLS
-- Source of truth: src/features/clubs/README.md, documents/PLAN.md §5.8
-- Owner: Kedar
-- ============================================================================

-- 1. Enum for club member status
do $$ begin
  create type club_member_status as enum (
    'requested',
    'payment_pending',
    'member',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

-- 2. Clubs table
create table if not exists public.clubs (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  description      text,
  tagline          text check (char_length(tagline) <= 120),
  cover_image_path text,
  fee              numeric(10, 2) not null default 0,
  currency         text not null default 'INR',
  lead_id          uuid not null references public.profiles(id) on delete restrict,
  community_id     uuid references public.communities(id) on delete set null,
  active           boolean not null default true,
  member_count     integer not null default 0,
  created_at       timestamptz not null default now()
);

-- 3. Club members table
create table if not exists public.club_members (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references public.clubs(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  status              club_member_status not null default 'requested',
  payment_ref         text,
  payment_verified_at timestamptz,
  joined_at           timestamptz,
  created_at          timestamptz not null default now(),
  unique (club_id, user_id)
);

-- 4. Club notices table
create table if not exists public.club_notices (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. Indexes
create index if not exists idx_club_members_club_id  on public.club_members(club_id);
create index if not exists idx_club_members_user_id  on public.club_members(user_id);
create index if not exists idx_club_members_status   on public.club_members(status);
create index if not exists idx_club_notices_club_id  on public.club_notices(club_id);
create index if not exists idx_clubs_active          on public.clubs(active);

-- 6. Enable RLS
alter table public.clubs         enable row level security;
alter table public.club_members  enable row level security;
alter table public.club_notices  enable row level security;

-- 7. RLS Policies — clubs
create policy "clubs_select_active"
  on public.clubs for select
  using (active = true);

create policy "clubs_lead_all"
  on public.clubs for all
  using (lead_id = auth.uid())
  with check (lead_id = auth.uid());

-- 8. RLS Policies — club_members
create policy "club_members_own_select"
  on public.club_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  );

create policy "club_members_self_insert"
  on public.club_members for insert
  with check (user_id = auth.uid());

create policy "club_members_self_delete"
  on public.club_members for delete
  using (user_id = auth.uid());

create policy "club_members_lead_update"
  on public.club_members for update
  using (
    exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  );

-- 9. RLS Policies — club_notices
create policy "club_notices_select_members"
  on public.club_notices for select
  using (
    exists (
      select 1 from public.club_members m
      where m.club_id = club_notices.club_id
        and m.user_id = auth.uid()
        and m.status = 'member'
    )
    or exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  );

create policy "club_notices_lead_write"
  on public.club_notices for all
  using (
    exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  );

-- 10. Helper RPC to safely decrement member count
create or replace function public.decrement_club_member_count(_club_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.clubs
  set member_count = greatest(0, member_count - 1)
  where id = _club_id;
end;
$$;
