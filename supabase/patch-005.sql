-- ============================================================
-- FIXWELL HANDYMAN - PATCH 005
-- Home Care: customer properties, service history, plan requests.
-- ADDITIVE ONLY: new tables/columns/triggers, nothing dropped or
-- rewritten. Safe to run after patches 001-004.
-- ============================================================

-- ---------- 1) properties (customer's saved homes/shops) ----------
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  label text not null,
  address text,
  type text default 'house',          -- house | flat | shop | office | other
  notes text,
  created_at timestamptz default now()
);

alter table properties enable row level security;
create policy "properties owner all" on properties for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not is_suspended());
create policy "properties admin read" on properties for select
  using (is_admin());

-- bookings can point at a saved property (optional)
alter table bookings add column if not exists property_id uuid references properties(id) on delete set null;

-- ---------- 2) service history ----------
create table if not exists service_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  booking_ref text,
  service text not null,
  summary text,
  done_at timestamptz default now(),
  created_at timestamptz default now()
);

-- one history row per booking
create unique index if not exists service_history_booking_uidx
  on service_history(booking_id) where booking_id is not null;

alter table service_history enable row level security;
create policy "history read own or admin" on service_history for select
  using (user_id = auth.uid() or is_admin());
create policy "history insert own" on service_history for insert
  with check (user_id = auth.uid() and not is_suspended());

-- auto-log when a booking is completed
create or replace function trg_log_service_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into service_history (user_id, property_id, booking_id, booking_ref, service, summary, done_at)
      values (new.customer_id, new.property_id, new.id, new.ref, new.service, left(coalesce(new.description, ''), 120), now())
      on conflict (booking_id) where booking_id is not null do nothing;
  end if;
  return new;
end $$;
drop trigger if exists trg_bookings_log_history on bookings;
create trigger trg_bookings_log_history after update of status on bookings
  for each row execute function trg_log_service_history();

-- ---------- 3) Home Care plan requests ----------
-- new subscriptions are recorded as 'requested' (admin follows up);
-- nothing changes for existing 'active' rows.
create or replace function trg_notify_sub_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.status = 'requested' then
    select full_name into v_name from profiles where id = new.user_id;
    perform notify_admins('plan_request',
      'Home Care plan request: ' || coalesce(new.plan, '?') || ' (' || coalesce(new.billing, '') || ') from ' || coalesce(v_name, 'a user') || '.', '#/admin');
  end if;
  return new;
end $$;
drop trigger if exists trg_subscriptions_notify on subscriptions;
create trigger trg_subscriptions_notify after insert on subscriptions
  for each row execute function trg_notify_sub_request();

-- admin marks a request active (after arranging with the customer) or closed
create or replace function admin_set_subscription_status(p_sub uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_admin text; v_target text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('active', 'closed') then raise exception 'Status must be active or closed'; end if;
  select coalesce(s.plan, '?') || ' for ' || coalesce(pr.full_name, 'user') into v_target
    from subscriptions s left join profiles pr on pr.id = s.user_id
    where s.id = p_sub and s.status = 'requested';
  if not found then raise exception 'Subscription request not found or already handled'; end if;
  update subscriptions set status = p_status where id = p_sub;
  select full_name into v_admin from profiles where id = auth.uid();
  insert into admin_actions (admin_id, admin_name, action, target, reason)
    values (auth.uid(), v_admin, 'subscription_' || p_status, v_target, null);
end $$;
