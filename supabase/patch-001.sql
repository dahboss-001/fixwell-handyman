-- ============================================================
-- FIXWELL patch 001 - run once in the SQL editor after schema.sql
-- 1) Lets an approved artisan claim an open booking (fixes
--    "Accept this job" doing nothing).
-- 2) Hardens the admin flag: the self-promotion guard now also
--    covers INSERT, and the SQL editor can still grant admin.
-- ============================================================

drop policy if exists "bookings update" on bookings;
create policy "bookings update" on bookings for update using (
  customer_id = auth.uid() or artisan_id = auth.uid() or is_admin()
  or (status = 'received' and exists (
    select 1 from artisan_applications a
    where a.user_id = auth.uid() and a.status = 'approved'))
);

create or replace function protect_admin_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and new.is_admin is distinct from coalesce(old.is_admin, false)
     and not is_admin() then
    new.is_admin := coalesce(old.is_admin, false);
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_admin on profiles;
create trigger trg_protect_admin before insert or update on profiles
  for each row execute function protect_admin_flag();

-- OPTIONAL: make yourself admin. Sign up on the site first, then
-- uncomment these two lines, put your email in, and Run:
-- update profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
