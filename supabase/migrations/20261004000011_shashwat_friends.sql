-- Migration: 20261004000011_shashwat_friends.sql
-- Description: Schema and Row-Level Security for Friendships and Presence Visibility
-- Source of Truth: documents/PLAN.md §5.10, §6, documents/TEAM_TASKS.md feat/friends

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  user_a       uuid references public.profiles(id) on delete cascade not null,
  user_b       uuid references public.profiles(id) on delete cascade not null,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint chk_no_self_friendship check (user_a != user_b),
  unique(user_a, user_b)
);

create index if not exists idx_friendships_user_a on public.friendships(user_a);
create index if not exists idx_friendships_user_b on public.friendships(user_b);
create index if not exists idx_friendships_status on public.friendships(status);

alter table public.friendships enable row level security;

-- Read: Users can only see friendships where they are user_a or user_b
create policy "users can view own friendships"
  on public.friendships for select
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- Insert: Users can send a request where they are the requester
create policy "users can insert friend requests"
  on public.friendships for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and (user_a = auth.uid() or user_b = auth.uid())
  );

-- Update: Participants can update status (accept, decline, block)
create policy "users can update own friendships"
  on public.friendships for update
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- Delete: Either participant can unfriend or cancel request
create policy "users can delete own friendships"
  on public.friendships for delete
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());
