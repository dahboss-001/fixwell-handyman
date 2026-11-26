-- ============================================================
-- FIXWELL patch 004 - run once in the SQL editor after patch 003
-- Backward-compatible: adds columns/tables only, changes nothing
-- existing.
-- 1) bookings: preferred_date, appointment fields.
-- 2) booking_photos (booking + completion photos on Supabase Storage).
-- 3) artisan_rejections (artisan can pass on a lead).
-- 4) disputes (customer/artisan complaints) + admin resolve function.
-- 5) storage bucket "job-photos" (private) + policies.
-- 6) notifications: new dispute -> admins; appointment set -> customer.
-- ============================================================

alter table bookings add column if not exists preferred_date date;
alter table bookings add column if not exists appointment_at timestamptz;
alter table bookings add column if not exists appointment_note text;

create table if not exists booking_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  uploader_id uuid references profiles(id) on delete cascade,
  kind text not null default 'booking',   -- booking | completion
  path text not null,                     -- storage path in job-photos bucket
  created_at timestamptz default now()
);

alter table booking_photos enable row level security;
create policy "photos read parties" on booking_photos for select using (
  is_admin() or exists (
    select 1 from bookings b where b.id = booking_id
    and (b.customer_id = auth.uid() or b.artisan_id = auth.uid()))
);
create policy "photos insert parties" on booking_photos for insert with check (
  uploader_id = auth.uid() and not is_suspended() and exists (
    select 1 from bookings b where b.id = booking_id
    and (b.customer_id = auth.uid() or b.artisan_id = auth.uid()))
);

create table if not exists artisan_rejections (
  booking_id uuid references bookings(id) on delete cascade,
  artisan_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (booking_id, artisan_id)
);

alter table artisan_rejections enable row level security;
create policy "rejects insert own" on artisan_rejections for insert
  with check (artisan_id = auth.uid() and not is_suspended());
create policy "rejects read own or admin" on artisan_rejections for select
  using (artisan_id = auth.uid() or is_admin());

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  user_name text,
  booking_id uuid references bookings(id) on delete set null,
  text text not null,
  status text not null default 'open',    -- open | resolved
  resolution_note text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table disputes enable row level security;
create policy "disputes insert own" on disputes for insert
  with check (user_id = auth.uid() and not is_suspended());
create policy "disputes read own or admin" on disputes for select
  using (user_id = auth.uid() or is_admin());
-- resolution only via admin_resolve_dispute (audit-logged)

create or replace function admin_resolve_dispute(p_dispute uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_admin text; v_summary text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_note is null or btrim(p_note) = '' then raise exception 'A resolution note is required'; end if;
  select coalesce(user_name, 'user') || ': ' || left(text, 60) into v_summary
    from disputes where id = p_dispute and status = 'open';
  if not found then raise exception 'Dispute not found or already resolved'; end if;
  update disputes set status = 'resolved', resolution_note = p_note, resolved_at = now() where id = p_dispute;
  select full_name into v_admin from profiles where id = auth.uid();
  insert into admin_actions (admin_id, admin_name, action, target, reason)
    values (auth.uid(), v_admin, 'resolve_dispute', v_summary, p_note);
end $$;

-- ---------- storage (private bucket, party-gated) ----------
insert into storage.buckets (id, name, public)
  values ('job-photos', 'job-photos', false)
  on conflict (id) do nothing;

-- path layout: <uploader uid>/<booking id>/<file>
drop policy if exists "job photos insert own folder" on storage.objects;
create policy "job photos insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "job photos read parties" on storage.objects;
create policy "job photos read parties" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and (
    is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from bookings b
      where b.id::text = (storage.foldername(name))[2]
      and (b.customer_id = auth.uid() or b.artisan_id = auth.uid()))
  ));

-- ---------- notifications ----------
create or replace function trg_notify_dispute() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify_admins('dispute',
    'New complaint from ' || coalesce(new.user_name, 'a user') ||
    coalesce((select ' on ' || b.ref from bookings b where b.id = new.booking_id), '') || '.', '#/admin');
  return new;
end $$;
drop trigger if exists trg_disputes_notify on disputes;
create trigger trg_disputes_notify after insert on disputes
  for each row execute function trg_notify_dispute();

create or replace function trg_notify_appointment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.appointment_at is distinct from old.appointment_at and new.appointment_at is not null then
    perform notify(new.customer_id, 'appointment',
      'Booking ' || new.ref || ': appointment set for ' ||
      to_char(new.appointment_at at time zone 'Africa/Lagos', 'Dy DD Mon, HH24:MI') ||
      coalesce(' (' || new.appointment_note || ')', '') || '.', '#/dashboard');
  end if;
  return new;
end $$;
drop trigger if exists trg_bookings_notify_appt on bookings;
create trigger trg_bookings_notify_appt after update on bookings
  for each row execute function trg_notify_appointment();
