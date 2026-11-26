-- ============================================================
-- FIXWELL HANDYMAN - PATCH 009
-- Artisan team accounts: a company (owner artisan) with several
-- workers (approved artisans with their own logins).
-- ADDITIVE ONLY: new tables/functions/policies, nothing dropped
-- or rewritten. Safe to run after patches 001-008, and safe to
-- re-run: tables use IF NOT EXISTS and every policy is dropped
-- (if present) before it is created.
-- ============================================================

-- ---------- 1) tables first ----------
create table if not exists artisan_teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique (owner_id)
);

-- member_name is a snapshot of the worker's profile name at add time
-- (profiles rows are only readable by their owner or an admin).
create table if not exists artisan_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references artisan_teams(id) on delete cascade,
  member_id uuid references profiles(id) on delete cascade,
  member_name text,
  created_at timestamptz default now(),
  unique (team_id, member_id)
);

alter table artisan_teams enable row level security;
alter table artisan_team_members enable row level security;

-- ---------- 2) policies (after BOTH tables exist) ----------
drop policy if exists "teams insert approved owner" on artisan_teams;
create policy "teams insert approved owner" on artisan_teams for insert
  with check (
    owner_id = auth.uid() and not is_suspended()
    and exists (select 1 from artisan_applications
                where user_id = auth.uid() and status = 'approved')
  );

drop policy if exists "teams read owner member admin" on artisan_teams;
create policy "teams read owner member admin" on artisan_teams for select
  using (
    owner_id = auth.uid() or is_admin()
    or id in (select team_id from artisan_team_members where member_id = auth.uid())
  );

drop policy if exists "teams update owner" on artisan_teams;
create policy "teams update owner" on artisan_teams for update
  using (owner_id = auth.uid() and not is_suspended());

drop policy if exists "teams delete owner" on artisan_teams;
create policy "teams delete owner" on artisan_teams for delete
  using (owner_id = auth.uid() and not is_suspended());

drop policy if exists "members read owner member admin" on artisan_team_members;
create policy "members read owner member admin" on artisan_team_members for select
  using (
    member_id = auth.uid() or is_admin()
    or team_id in (select id from artisan_teams where owner_id = auth.uid())
  );

drop policy if exists "members delete owner or self" on artisan_team_members;
create policy "members delete owner or self" on artisan_team_members for delete
  using (
    member_id = auth.uid()
    or team_id in (select id from artisan_teams where owner_id = auth.uid())
  );

-- ---------- 3) owner adds a worker by email ----------
-- Looks up the account in auth.users (not client-readable), requires the
-- worker to be an approved artisan, and snapshots their display name.
create or replace function add_team_member_by_email(p_team_id uuid, p_email text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_user uuid;
  v_name text;
begin
  select owner_id into v_owner from artisan_teams where id = p_team_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Only the team owner can add workers.';
  end if;
  if is_suspended() then raise exception 'Account suspended.'; end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No account with that email. Ask the worker to sign up first.';
  end if;
  if v_user = v_owner then
    raise exception 'You are the team owner already.';
  end if;
  if not exists (select 1 from artisan_applications
                 where user_id = v_user and status = 'approved') then
    raise exception 'That account is not an approved artisan yet.';
  end if;

  select full_name into v_name from profiles where id = v_user;

  insert into artisan_team_members (team_id, member_id, member_name)
    values (p_team_id, v_user, coalesce(v_name, 'Team member'))
    on conflict (team_id, member_id) do nothing;

  return coalesce(v_name, 'Team member');
end;
$$;

-- ---------- 4) workers can SEE their company's jobs (read-only) ----------
-- Company jobs stay assigned to the owner account; members get visibility.
drop policy if exists "bookings team member read" on bookings;
create policy "bookings team member read" on bookings for select
  using (
    artisan_id in (
      select t.owner_id from artisan_teams t
      join artisan_team_members m on m.team_id = t.id
      where m.member_id = auth.uid()
    )
  );
