-- ============================================================
-- FIXWELL HANDYMAN - PATCH 010
-- Hotfix for patch-009: the team policies referenced each other
-- (teams policy reads members, members policy reads teams), which
-- made Postgres report "infinite recursion detected in policy"
-- on every bookings/teams read for signed-in users.
-- Fix: security-definer helper functions read the team tables
-- without re-entering RLS, and the policies use them instead.
-- ADDITIVE + RE-RUNNABLE: replaces only the four team policies.
-- ============================================================

-- ---------- 1) helper functions (bypass RLS safely) ----------
create or replace function is_team_member(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from artisan_team_members
                 where team_id = p_team and member_id = auth.uid());
$$;

create or replace function is_team_owner(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from artisan_teams
                 where id = p_team and owner_id = auth.uid());
$$;

create or replace function is_worker_for(p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from artisan_team_members m
                 join artisan_teams t on t.id = m.team_id
                 where m.member_id = auth.uid() and t.owner_id = p_owner);
$$;

-- ---------- 2) rebuild the four team policies on the helpers ----------
drop policy if exists "teams read owner member admin" on artisan_teams;
create policy "teams read owner member admin" on artisan_teams for select
  using (owner_id = auth.uid() or is_admin() or is_team_member(id));

drop policy if exists "members read owner member admin" on artisan_team_members;
create policy "members read owner member admin" on artisan_team_members for select
  using (member_id = auth.uid() or is_admin() or is_team_owner(team_id));

drop policy if exists "members delete owner or self" on artisan_team_members;
create policy "members delete owner or self" on artisan_team_members for delete
  using (member_id = auth.uid() or is_team_owner(team_id));

drop policy if exists "bookings team member read" on bookings;
create policy "bookings team member read" on bookings for select
  using (is_worker_for(artisan_id));
