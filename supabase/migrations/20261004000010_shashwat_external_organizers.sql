-- Migration: 20261004000010_shashwat_external_organizers.sql
-- Description: External Organizers, Access Portal, Approval Queue, and Event Abuse Reports
-- Source of Truth: documents/PLAN.md §4.1, documents/DESIGN.MD, documents/TEAM_TASKS.md feat/organizer-access

-- ─── 1. EXTERNAL ORGANIZERS TABLE ──────────────────────────────────────────
create table if not exists public.external_organizers (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  organization   text not null,
  org_type       text not null check (org_type in ('company', 'club', 'college', 'community')),
  contact_name   text not null,
  contact_email  text unique not null,
  phone          text,
  website        text,
  purpose        text not null,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  trusted        boolean not null default false,
  approved_by    uuid references public.profiles(id) on delete set null,
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_external_organizers_status on public.external_organizers(status);
create index if not exists idx_external_organizers_email on public.external_organizers(contact_email);

-- ─── 2. EVENT ABUSE REPORTS TABLE ───────────────────────────────────────────
create table if not exists public.event_reports (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references public.events(id) on delete cascade not null,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reason      text not null,
  details     text,
  status      text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_event_reports_event on public.event_reports(event_id);
create index if not exists idx_event_reports_status on public.event_reports(status);

-- ─── 3. ROW LEVEL SECURITY POLICIES ─────────────────────────────────────────
alter table public.external_organizers enable row level security;
alter table public.event_reports       enable row level security;

-- Organizers can view and edit their own organizer registration record
create policy "organizers view own profile"
  on public.external_organizers for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "organizers insert own record"
  on public.external_organizers for insert
  to authenticated
  with check (user_id = auth.uid() or auth.role() = 'service_role');

create policy "organizers update own profile or admin"
  on public.external_organizers for update
  to authenticated
  using (
    (user_id = auth.uid() and status != 'suspended')
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Event reports: authenticated students can report events; admins can view and review
create policy "reports insertable by authenticated"
  on public.event_reports for insert
  to authenticated
  with check (reporter_id = auth.uid() or auth.role() = 'service_role');

create policy "reports readable by admin or reporter"
  on public.event_reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "reports updatable by admin"
  on public.event_reports for update
  to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
