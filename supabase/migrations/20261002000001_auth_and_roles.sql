-- ==============================================================================
-- Migration: 20261002000001_auth_and_roles.sql
-- Description: Foundation schema for roster, profiles, user_roles, and login_attempts
-- Source of truth: documents/PLAN.MD §4, §4.1, §6 and documents/TEAM_TASKS.MD
-- ==============================================================================

-- 1. ROSTER IMPORT
-- Authoritative list of college members imported by admins.
-- Sign-in is restricted to emails present in this table with status != 'inactive'.
CREATE TABLE IF NOT EXISTS public.roster_import (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_email text UNIQUE NOT NULL,
  college_id text UNIQUE NOT NULL, -- enrollment number or faculty/staff ID
  full_name text NOT NULL,
  branch text,
  year int,
  division text,
  batch text,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_email ON public.roster_import(college_email);
CREATE INDEX IF NOT EXISTS idx_roster_college_id ON public.roster_import(college_id);
CREATE INDEX IF NOT EXISTS idx_roster_status ON public.roster_import(status);

-- 2. USER PROFILES
-- 1-to-1 profile created from the roster on first successful OTP sign-in.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  college_email text UNIQUE NOT NULL,
  college_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  photo_url text,
  role_primary text NOT NULL CHECK (role_primary IN ('student', 'teacher', 'admin')),
  branch text,
  year int,
  division text,
  batch text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(college_email);
CREATE INDEX IF NOT EXISTS idx_profiles_college_id ON public.profiles(college_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_primary);

-- 3. USER ROLES
-- Stores multiple roles per user (e.g. teacher who is also "Hostel warden" or "HOD").
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'authority')),
  scope text, -- domain name or title (e.g., 'Hostel Warden', 'Class Coordinator')
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, scope)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 4. LOGIN ATTEMPTS
-- Security audit and rate limiting log for OTP requests and verification attempts.
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('code_request', 'code_verify')),
  success boolean NOT NULL DEFAULT false,
  error_reason text
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email, at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts(ip, at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.roster_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the requesting user has the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Roster import policies:
-- Only admins can read and manage the college roster directly.
CREATE POLICY "Admins have full access to roster"
  ON public.roster_import
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profiles policies:
-- Authenticated users can view basic public profiles (needed for directory, chat, collab).
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own profile non-roster fields (e.g. photo_url).
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile.
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- User roles policies:
-- Users can read their own assigned roles.
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view and manage all roles.
CREATE POLICY "Admins can manage all user roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Login attempts policies:
-- Only admins can read login attempt audit logs.
CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
