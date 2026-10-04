-- Migration: 20261004000007_shashwat_digital_id.sql
-- Description: Digital ID status, instant revocation/suspension, and verification audit trail
-- Source of Truth: documents/PLAN.md §5.4, documents/DESIGN.MD §8, documents/TEAM_TASKS.md feat/digital-id

-- ─── 1. Add Digital ID Status to Profiles ──────────────────────────────────────
alter table public.profiles
  add column if not exists digital_id_status text not null default 'active' 
    check (digital_id_status in ('active', 'suspended', 'revoked')),
  add column if not exists digital_id_revoked_at timestamptz,
  add column if not exists digital_id_revocation_reason text,
  add column if not exists digital_id_updated_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_digital_id_status on public.profiles(digital_id_status);

-- ─── 2. Verification Audit Log ────────────────────────────────────────────────
-- Logs every digital ID verification performed at security gates, labs, library, etc.
create table if not exists public.digital_id_verifications (
  id                  uuid primary key default gen_random_uuid(),
  subject_user_id     uuid references public.profiles(id) on delete cascade,
  college_id          text not null,
  verifier_id         uuid references public.profiles(id) on delete set null,
  verification_method text not null default 'qr' check (verification_method in ('qr', 'manual')),
  status              text not null check (status in ('valid', 'expired', 'revoked', 'suspended', 'not_found', 'tampered')),
  checkpoint          text not null default 'Main Gate',
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_verifications_subject on public.digital_id_verifications(subject_user_id);
create index if not exists idx_verifications_college_id on public.digital_id_verifications(college_id);
create index if not exists idx_verifications_created on public.digital_id_verifications(created_at desc);

-- ─── 3. Row Level Security for Verifications ───────────────────────────────────
alter table public.digital_id_verifications enable row level security;

-- Read policy: Admins can view all verification logs, users can view their own verifications
create policy "verifications readable by admin and subject"
  on public.digital_id_verifications for select
  to authenticated
  using (
    subject_user_id = auth.uid()
    or verifier_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Insert policy: Any authenticated user (or service role) can record a verification log
create policy "verifications insertable by authenticated"
  on public.digital_id_verifications for insert
  to authenticated
  with check (true);
