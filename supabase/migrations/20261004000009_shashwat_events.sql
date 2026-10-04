-- Migration: 20261004000009_shashwat_events.sql
-- Description: Schema for College and External Events, RSVPs, Team Formation, and Approval Workflow
-- Source of Truth: documents/PLAN.md §5.9, documents/DESIGN.MD §8, documents/TEAM_TASKS.md feat/events

-- ─── 1. EVENTS TABLE ────────────────────────────────────────────────────────
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('college', 'external')),
  title             text not null,
  description       text not null,
  organizer_name    text not null,
  organizer_type    text not null check (organizer_type in ('club', 'department', 'admin', 'external')),
  created_by        uuid references public.profiles(id) on delete set null,
  location          text not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  registration_link text,
  capacity          int,
  banner_url        text,
  tags              text[] not null default '{}',
  allow_teams       boolean not null default false,
  min_team_size     int not null default 1,
  max_team_size     int not null default 4,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint valid_event_dates check (ends_at >= starts_at)
);

create index if not exists idx_events_kind_status on public.events(kind, status);
create index if not exists idx_events_starts on public.events(starts_at asc);
create index if not exists idx_events_organizer on public.events(organizer_name);

-- ─── 2. EVENT RSVPS TABLE ───────────────────────────────────────────────────
create table if not exists public.event_rsvps (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid references public.events(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  status       text not null default 'attending' check (status in ('attending', 'waitlist', 'cancelled')),
  team_name    text,
  team_members text[] not null default '{}',
  created_at   timestamptz not null default now(),
  unique(event_id, user_id)
);

create index if not exists idx_rsvps_event on public.event_rsvps(event_id);
create index if not exists idx_rsvps_user on public.event_rsvps(user_id);

-- ─── 3. EVENT TEAMS TABLE (HACKATHONS & COMPETITIONS) ──────────────────────
create table if not exists public.event_teams (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid references public.events(id) on delete cascade not null,
  name                text not null,
  leader_id           uuid references public.profiles(id) on delete cascade not null,
  looking_for_members boolean not null default true,
  desired_skills      text[] not null default '{}',
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_event_teams_event on public.event_teams(event_id);

-- ─── 4. ROW LEVEL SECURITY POLICIES ─────────────────────────────────────────
alter table public.events      enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_teams enable row level security;

-- Events read: Approved events are public to all authenticated users. Pending events visible to creator and admins.
create policy "approved events readable by all authenticated"
  on public.events for select
  to authenticated
  using (
    status = 'approved'
    or created_by = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Events insert: Authenticated users can submit an event (which goes to approval queue unless admin)
create policy "events insertable by authenticated"
  on public.events for insert
  to authenticated
  with check (created_by = auth.uid() or auth.role() = 'service_role');

-- Events update: Creator can edit pending event, admins can approve/reject/update anytime
create policy "events updatable by creator or admin"
  on public.events for update
  to authenticated
  using (
    (created_by = auth.uid() and status = 'pending')
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- RSVPs read: Users can read RSVPs for events they can see
create policy "rsvps readable by authenticated"
  on public.event_rsvps for select
  to authenticated
  using (true);

-- RSVPs insert: Authenticated users can RSVP for themselves
create policy "rsvps insertable by owner"
  on public.event_rsvps for insert
  to authenticated
  with check (user_id = auth.uid() or auth.role() = 'service_role');

-- RSVPs update/delete: Users manage their own RSVP status
create policy "rsvps updatable by owner"
  on public.event_rsvps for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Teams policies
create policy "event teams readable by all authenticated"
  on public.event_teams for select
  to authenticated
  using (true);

create policy "event teams insertable by leader"
  on public.event_teams for insert
  to authenticated
  with check (leader_id = auth.uid());

create policy "event teams updatable by leader"
  on public.event_teams for update
  to authenticated
  using (leader_id = auth.uid());

-- ─── 4. EVENT MESSAGES TABLE (EVENT CHAT & Q&A) ─────────────────────────────
create table if not exists public.event_messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid references public.events(id) on delete cascade not null,
  author_id  uuid references public.profiles(id) on delete cascade not null,
  author_name text not null,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_messages_event on public.event_messages(event_id, created_at asc);

alter table public.event_messages enable row level security;

create policy "event messages readable by authenticated"
  on public.event_messages for select
  to authenticated
  using (true);

create policy "event messages insertable by author"
  on public.event_messages for insert
  to authenticated
  with check (author_id = auth.uid() or auth.role() = 'service_role');

