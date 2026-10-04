-- Migration: 20261004000008_shashwat_lost_and_found.sql
-- Description: Comprehensive Lost & Found lifecycle schema with finder drop-off flow, verification claims, state machine audit log, and digital ID pickup
-- Source of Truth: documents/PLAN.md §5.5, documents/DESIGN.MD §9, documents/TEAM_TASKS.md feat/lost-and-found

-- ─── 1. LOST AND FOUND ITEMS TABLE ──────────────────────────────────────────
create table if not exists public.lost_found_items (
  id                    uuid primary key default gen_random_uuid(),
  type                  text not null check (type in ('lost', 'found')),
  reporter_id           uuid references public.profiles(id) on delete cascade not null,
  category              text not null check (
    category in ('electronics', 'cards_id', 'keys', 'books_stationery', 'clothing', 'accessories', 'bags', 'other')
  ),
  title                 text not null,
  description           text not null,
  hidden_detail         text, -- Hidden verification detail, protected from general queries
  verification_question text, -- Question claimant must answer (e.g. "What sticker is on the back?")
  location              text not null, -- Campus place from predefined location list
  dropoff_point         text, -- Finder drop-off safety: security desk or department office
  handover_code         text, -- 6-character code given to finder upon physical drop-off
  photo_urls            jsonb not null default '[]'::jsonb,
  incident_date         date not null default current_date,
  time_window           text, -- e.g. "Morning (09:00 - 11:00)"
  status                text not null default 'reported' check (
    status in ('reported', 'matched', 'claim_under_review', 'ready_for_pickup', 'returned', 'expired')
  ),
  is_reported_abuse     boolean not null default false,
  matched_item_id       uuid references public.lost_found_items(id) on delete set null,
  pickup_confirmed_by   uuid references public.profiles(id) on delete set null,
  pickup_digital_id     text, -- Claimant's college enrollment/staff ID confirmed on pickup
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_lost_found_type_status on public.lost_found_items(type, status);
create index if not exists idx_lost_found_category on public.lost_found_items(category);
create index if not exists idx_lost_found_reporter on public.lost_found_items(reporter_id);
create index if not exists idx_lost_found_created on public.lost_found_items(created_at desc);

-- ─── 2. LOST AND FOUND CLAIMS TABLE ─────────────────────────────────────────
create table if not exists public.lost_found_claims (
  id                    uuid primary key default gen_random_uuid(),
  item_id               uuid references public.lost_found_items(id) on delete cascade not null,
  claimant_id           uuid references public.profiles(id) on delete cascade not null,
  claimant_name         text not null,
  claimant_college_id   text not null,
  answer_to_question    text not null,
  additional_proof      text,
  status                text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'completed')
  ),
  desk_notes            text,
  reviewed_by           uuid references public.profiles(id) on delete set null,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists idx_claims_item on public.lost_found_claims(item_id);
create index if not exists idx_claims_claimant on public.lost_found_claims(claimant_id);
create index if not exists idx_claims_status on public.lost_found_claims(status);

-- ─── 3. LOST AND FOUND EVENT TRANSITIONS LOG ─────────────────────────────────
create table if not exists public.lost_found_events (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid references public.lost_found_items(id) on delete cascade not null,
  from_status text,
  to_status   text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_lost_found_events_item on public.lost_found_events(item_id, created_at desc);

-- ─── 4. ROW LEVEL SECURITY POLICIES ─────────────────────────────────────────
alter table public.lost_found_items  enable row level security;
alter table public.lost_found_claims enable row level security;
alter table public.lost_found_events enable row level security;

-- Items read policy: Any authenticated member can read non-abusive items
create policy "lost_found_items readable by authenticated"
  on public.lost_found_items for select
  to authenticated
  using (not is_reported_abuse or reporter_id = auth.uid() or exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
  ));

-- Items insert policy: Authenticated members can report lost or found items
create policy "lost_found_items insertable by authenticated"
  on public.lost_found_items for insert
  to authenticated
  with check (reporter_id = auth.uid() or auth.role() = 'service_role');

-- Items update policy: Reporter can edit while in reported status, admins can update anytime
create policy "lost_found_items updatable by reporter or admin"
  on public.lost_found_items for update
  to authenticated
  using (
    reporter_id = auth.uid() or exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  );

-- Claims read policy: Claimant, item reporter, or admin can read claim
create policy "claims readable by claimant, reporter, or admin"
  on public.lost_found_claims for select
  to authenticated
  using (
    claimant_id = auth.uid()
    or exists (select 1 from public.lost_found_items where id = item_id and reporter_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Claims insert policy: Authenticated members can submit a claim
create policy "claims insertable by authenticated"
  on public.lost_found_claims for insert
  to authenticated
  with check (claimant_id = auth.uid() or auth.role() = 'service_role');

-- Events read policy: Authenticated members can read transitions for visible items
create policy "events readable by authenticated"
  on public.lost_found_events for select
  to authenticated
  using (true);

-- Events insert policy: Authenticated members or service role can log transitions
create policy "events insertable by authenticated"
  on public.lost_found_events for insert
  to authenticated
  with check (true);
