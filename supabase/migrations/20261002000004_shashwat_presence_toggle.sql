-- Migration: 20261002000003_presence_toggle.sql
-- Description: Campus Zones (geofencing boundaries) and Presence Consent & State with RLS
-- Source of Truth: documents/PLAN.md §5.1, documents/CONTRACT.md §6, documents/TEAM_TASKS.md

-- 1. Campus Zones Table (Polygons for campus boundary and named zones)
create table if not exists public.campus_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'campus' check (kind in ('campus', 'zone', 'building')),
  -- GeoJSON-like polygon coordinates: array of [lng, lat] vertices or [{ lat, lng }]
  polygon jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed default college campus boundary polygon (sample coordinates for university campus)
insert into public.campus_zones (id, name, kind, polygon, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'Main Campus',
  'campus',
  '[
    {"lat": 12.9710, "lng": 79.1580},
    {"lat": 12.9760, "lng": 79.1585},
    {"lat": 12.9770, "lng": 79.1660},
    {"lat": 12.9715, "lng": 79.1655}
  ]'::jsonb,
  true
)
on conflict (id) do nothing;

-- 2. Presence Consent Table (Explicit student privacy opt-in, pause, and revoke)
create table if not exists public.presence_consent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  consent_given boolean not null default false,
  is_paused boolean not null default false,
  visibility text not null default 'nobody' check (visibility in ('nobody', 'friends', 'everyone')),
  consented_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Presence Status Table (Evaluated state only; coordinates are NEVER stored)
create table if not exists public.presence_status (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state text not null check (state in ('in', 'out', 'checking', 'denied', 'offline')),
  zone_id uuid references public.campus_zones(id) on delete set null,
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  accuracy_meters numeric,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.campus_zones enable row level security;
alter table public.presence_consent enable row level security;
alter table public.presence_status enable row level security;

-- Policies for campus_zones
create policy "Anyone authenticated can view active campus zones"
  on public.campus_zones for select
  to authenticated
  using (is_active = true);

create policy "Admins can manage campus zones"
  on public.campus_zones for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role_primary = 'admin'
    )
  );

-- Policies for presence_consent
create policy "Users can view own presence consent"
  on public.presence_consent for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert or update own presence consent"
  on public.presence_consent for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policies for presence_status
create policy "Users can view own presence status"
  on public.presence_status for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can view presence of others when visibility is everyone"
  on public.presence_status for select
  to authenticated
  using (
    exists (
      select 1 from public.presence_consent
      where presence_consent.user_id = presence_status.user_id
        and presence_consent.consent_given = true
        and presence_consent.is_paused = false
        and presence_consent.visibility = 'everyone'
    )
  );

create policy "Users can update own presence status"
  on public.presence_status for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Indexes for performance
create index if not exists idx_campus_zones_active on public.campus_zones (is_active);
create index if not exists idx_presence_consent_user on public.presence_consent (user_id);
create index if not exists idx_presence_status_verified on public.presence_status (verified_at);

-- Rollback instructions:
-- drop table if exists public.presence_status cascade;
-- drop table if exists public.presence_consent cascade;
-- drop table if exists public.campus_zones cascade;
