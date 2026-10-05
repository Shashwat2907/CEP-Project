-- Migration: 20261004000005_shashwat_presence_monitoring.sql
-- Description: Presence heartbeats, sessions, daily summary, campus IP ranges, and monitoring config
-- Source of Truth: documents/PLAN.md §5.1, documents/TEAM_TASKS.md feat/presence-monitoring
-- Privacy contract:
--   - Raw coordinates are NEVER stored (server evaluates; only state/zone/confidence stored)
--   - Heartbeats outside campus store state='outside', zone_id=NULL
--   - Sessions are the primary retention unit; raw heartbeats are deleted after retention_days
--   - Consent must be given and not paused before any heartbeat is recorded

-- ─── 1. Monitoring Config Table ────────────────────────────────────────────
create table if not exists public.presence_monitoring_config (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz not null default now()
);

insert into public.presence_monitoring_config (key, value, description) values
  ('heartbeat_interval_seconds', '120', 'How often the client sends a heartbeat (seconds).'),
  ('heartbeat_timeout_seconds',  '300', 'Close session as signal_lost after this many seconds without a heartbeat.'),
  ('heartbeat_retention_days',   '7',   'Delete raw heartbeats older than this many days.'),
  ('session_retention_days',     '365', 'Sessions kept for one academic year then deleted.'),
  ('daily_retention_days',       '365', 'Daily summaries kept for one academic year.')
on conflict (key) do nothing;

-- ─── 2. Campus Network IP Ranges ──────────────────────────────────────────
create table if not exists public.campus_ip_ranges (
  id         uuid primary key default gen_random_uuid(),
  cidr       text not null unique,
  label      text not null,
  is_active  boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- DEV SEED: replace with real campus IP ranges before launch
insert into public.campus_ip_ranges (cidr, label) values
  ('127.0.0.0/8', '[DEV SEED] Localhost — replace with real campus IP ranges before launch')
on conflict (cidr) do nothing;

-- ─── 3. Presence Heartbeats Table ─────────────────────────────────────────
create table if not exists public.presence_heartbeats (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  session_id      uuid,
  state           text not null check (state in ('inside', 'outside', 'unknown')),
  zone_id         uuid references public.campus_zones(id) on delete set null,
  confidence      text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  accuracy_meters numeric,
  source          text not null default 'browser' check (source in ('browser', 'native', 'qr')),
  ip_on_campus    boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists presence_heartbeats_user_created_idx
  on public.presence_heartbeats (user_id, created_at desc);

create index if not exists presence_heartbeats_session_idx
  on public.presence_heartbeats (session_id);

-- ─── 4. Presence Sessions Table ───────────────────────────────────────────
create table if not exists public.presence_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  zone_id           uuid references public.campus_zones(id) on delete set null,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  last_heartbeat_at timestamptz not null default now(),
  close_reason      text check (close_reason in ('verified_out', 'signal_lost', 'consent_revoked', 'admin_closed')),
  duration_minutes  numeric,
  created_at        timestamptz not null default now()
);

-- Trigger to calculate duration_minutes when session ends
create or replace function public.calculate_presence_session_duration()
returns trigger as $$
begin
  if new.ended_at is not null then
    new.duration_minutes := round((extract(epoch from (new.ended_at - new.started_at)) / 60)::numeric, 2);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_presence_session_duration on public.presence_sessions;
create trigger trg_presence_session_duration
before insert or update on public.presence_sessions
for each row execute function public.calculate_presence_session_duration();

create index if not exists presence_sessions_user_active_idx
  on public.presence_sessions (user_id, ended_at)
  where ended_at is null;

create index if not exists presence_sessions_user_started_idx
  on public.presence_sessions (user_id, started_at desc);

-- Add FK from heartbeats → sessions now that sessions table exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'presence_heartbeats_session_id_fk'
  ) then
    alter table public.presence_heartbeats
      add constraint presence_heartbeats_session_id_fk
      foreign key (session_id) references public.presence_sessions(id) on delete set null;
  end if;
end $$;

-- ─── 5. Presence Daily Summary Table ─────────────────────────────────────
create table if not exists public.presence_daily (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  day               date not null,
  zone_id           uuid references public.campus_zones(id) on delete set null,
  first_in          timestamptz,
  last_out          timestamptz,
  minutes_on_campus numeric not null default 0,
  session_count     int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists presence_daily_user_day_idx
  on public.presence_daily (user_id, day desc);

-- ─── 6. Row Level Security ────────────────────────────────────────────────
alter table public.presence_monitoring_config enable row level security;
alter table public.campus_ip_ranges           enable row level security;
alter table public.presence_heartbeats        enable row level security;
alter table public.presence_sessions          enable row level security;
alter table public.presence_daily             enable row level security;

create policy "monitoring config readable by authenticated"
  on public.presence_monitoring_config for select
  to authenticated using (true);

create policy "monitoring config writable by admin"
  on public.presence_monitoring_config for all
  to authenticated
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "campus ip ranges readable by authenticated"
  on public.campus_ip_ranges for select
  to authenticated using (true);

create policy "campus ip ranges writable by admin"
  on public.campus_ip_ranges for all
  to authenticated
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "heartbeats: own rows only"
  on public.presence_heartbeats for select
  to authenticated using (user_id = auth.uid());

create policy "sessions: own rows only"
  on public.presence_sessions for select
  to authenticated using (user_id = auth.uid());

create policy "daily: own rows or admin"
  on public.presence_daily for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- ─── 7. pg_cron Jobs ──────────────────────────────────────────────────────
-- Optional: Only schedules if pg_cron extension is installed and enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      EXECUTE $cron$
        SELECT cron.unschedule('presence-session-timeout') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'presence-session-timeout');
        SELECT cron.schedule(
          'presence-session-timeout',
          '* * * * *',
          $$
            update public.presence_sessions
            set ended_at = last_heartbeat_at, close_reason = 'signal_lost'
            where ended_at is null
              and last_heartbeat_at < now() - (
                (select value::int from public.presence_monitoring_config
                  where key = 'heartbeat_timeout_seconds')
                * interval '1 second'
              );
          $$
        );
      $cron$;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule presence-session-timeout: %', SQLERRM;
    END;

    BEGIN
      EXECUTE $cron$
        SELECT cron.unschedule('presence-daily-rollup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'presence-daily-rollup');
        SELECT cron.schedule(
          'presence-daily-rollup',
          '30 19 * * *',
          $$
            insert into public.presence_daily
              (user_id, day, zone_id, first_in, last_out, minutes_on_campus, session_count, updated_at)
            select
              user_id,
              (started_at at time zone 'Asia/Kolkata')::date as day,
              mode() within group (order by zone_id)          as zone_id,
              min(started_at)       as first_in,
              max(ended_at)         as last_out,
              sum(duration_minutes) as minutes_on_campus,
              count(*)              as session_count,
              now()
            from public.presence_sessions
            where ended_at is not null
              and (started_at at time zone 'Asia/Kolkata')::date < current_date
            group by user_id, (started_at at time zone 'Asia/Kolkata')::date
            on conflict (user_id, day) do update set
              zone_id           = excluded.zone_id,
              first_in          = excluded.first_in,
              last_out          = excluded.last_out,
              minutes_on_campus = excluded.minutes_on_campus,
              session_count     = excluded.session_count,
              updated_at        = now();
          $$
        );
      $cron$;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule presence-daily-rollup: %', SQLERRM;
    END;

    BEGIN
      EXECUTE $cron$
        SELECT cron.unschedule('presence-heartbeat-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'presence-heartbeat-cleanup');
        SELECT cron.schedule(
          'presence-heartbeat-cleanup',
          '30 20 * * *',
          $$
            delete from public.presence_heartbeats
            where created_at < now() - (
              (select value::int from public.presence_monitoring_config
                where key = 'heartbeat_retention_days')
              * interval '1 day'
            );
          $$
        );
      $cron$;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule presence-heartbeat-cleanup: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron extension not installed; skipping presence background cron schedules.';
  END IF;
END $$;
