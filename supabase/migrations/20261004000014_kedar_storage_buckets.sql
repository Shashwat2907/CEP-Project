-- ============================================================================
-- Migration: 20261004000014_kedar_storage_buckets.sql
-- Description: Create Supabase Storage bucket for academic resources with RLS
-- ============================================================================

-- 1. Create resources bucket if it does not exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resources',
  'resources',
  true,
  52428800, -- 50MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

-- 2. Storage RLS Policies
-- Allow authenticated users to upload resources
drop policy if exists "Authenticated users can upload resources" on storage.objects;
create policy "Authenticated users can upload resources"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resources');

-- Allow authenticated users to view/download resources
drop policy if exists "Authenticated users can view resources" on storage.objects;
create policy "Authenticated users can view resources"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resources');

-- Allow resource uploaders and teachers to update/delete their objects
drop policy if exists "Users can delete their own uploaded resources" on storage.objects;
create policy "Users can delete their own uploaded resources"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resources' and auth.uid()::text = (storage.foldername(name))[1]);
