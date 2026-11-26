-- ============================================================
-- FIXWELL patch 003 - run once in the SQL editor after patch 002
-- 1) Account suspension flag (admin-controlled) + enforcement.
-- 2) admin_actions audit log.
-- 3) Admin functions: cancel booking, reassign booking, suspend /
--    reinstate, remove review, manual wallet adjustment (reason
--    required). Every one writes an audit row.
-- 4) notifications table + triggers (new message, status change,
--    new booking/application/purchase alerts for admins).
-- ============================================================

-- ---------- 1) suspension ----------
alter table profiles add column if not exists suspended boolean default false;

create or replace function is_suspended() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select suspended from profiles where id = auth.uid()), false)
$$;

-- Only an existing admin (or the SQL editor) may change suspended,
-- same guard style as is_admin.
create or replace function protect_admin_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.is_admin is distinct from coalesce(old.is_admin, false)
       and not is_admin() then
      new.is_admin := coalesce(old.is_admin, false);
    end if;
    if new.suspended is distinct from coalesce(old.suspended, false)
       and not is_admin() then
      new.suspended := coalesce(old.suspended, false);
    end if;
  end if;
  return new;
end $$;

-- Suspended accounts cannot place bookings or send messages.
drop policy if exists "bookings insert own" on bookings;
create policy "bookings insert own" on bookings for insert
  with check (customer_id = auth.uid() and not is_suspended());

drop policy if exists "msgs insert parties" on messages;
create policy "msgs insert parties" on messages for insert with check (
  sender_id = auth.uid() and not is_suspended() and exists (
    select 1 from bookings b where b.id = booking_id
    and (b.customer_id = auth.uid() or b.artisan_id = auth.uid())
    and b.artisan_id is not null)
);

-- ---------- 2) audit log ----------
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  admin_name text,
  action text not null,
  target text,
  reason text,
  created_at timestamptz default now()
);

alter table admin_actions enable row level security;
create policy "audit read admin" on admin_actions for select using (is_admin());
-- no client insert/update/delete policies: rows are written only by
-- the security-definer admin functions below.

-- ---------- 3) admin functions ----------
create or replace function admin_cancel_booking(p_booking uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref text; v_name text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select ref into v_ref from bookings where id = p_booking and status not in ('completed', 'cancelled');
  if not found then raise exception 'Booking not found or already closed'; end if;
  update bookings set status = 'cancelled' where id = p_booking;
  select full_name into v_name from profiles where id = auth.uid();
  insert into admin_actions (admin_id, admin_name, action, target, reason)
    values (auth.uid(), v_name, 'cancel_booking', v_ref, p_reason);
end $$;

create or replace function admin_reassign_booking(p_booking uuid, p_artisan uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref text; v_artisan text; v_admin text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select full_name into v_artisan from profiles p
    where p.id = p_artisan
      and exists (select 1 from artisan_applications a
                  where a.user_id = p_artisan and a.status = 'approved');
  if v_artisan is null then raise exception 'That artisan is not approved'; end if;
  select ref into v_ref from bookings where id = p_booking and status in ('received', 'assigned', 'quote_sent', 'in_progress');
  if not found then raise exception 'Booking not found or already closed'; end if;
  update bookings set artisan_id = p_artisan, artisan_name = v_artisan,
                      status = 'assigned', quote_amount = null
    where id = p_booking;
  select full_name into v_admin from profiles where id = auth.uid();
  insert into admin_actions (admin_id, admin_name, action, target, reason)
    values (auth.uid(), v_admin, 'reassign_booking', v_ref || ' -> ' || v_artisan, p_reason);
end $$;

create or replace function admin_set_suspended(p_user uuid, p_suspended boolean, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_admin text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_user = auth.uid() then raise exception 'You cannot suspend your own account'; end if;
  select full_name into v_name from profiles where id = p_user and coalesce(is_admin, false) = false;
  if not found then raise exception 'User not found (admins cannot be suspended)'; end if;
  update profiles set suspended = p_suspended where id = p_user;
  select full_name into v_admin from profiles where id = auth.uid();
  insert into admin_actions (admin_id, admin_name, action, target, reason)
    values (auth.uid(), v_admin, case when p_suspended then 'suspend_user' else 'reinstate_user' end, v_name, p_reason);
end $$;

create or replace function admin_remove_review(p_review uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_summary text; v_admin text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select customer_name || ' (' || rating || '/5): ' || left(coalesce(comment, ''), 60)
    into v_summary from reviews where id = p_review;
  if not found then raise exception 'Review not found'; end if;
  delete from reviews where id = p_review;
  select full_name into v_admin from profiles where id = auth.uid();
  insert into admin_actions (admin_id, admin_name, action, target, reason)
    values (auth.uid(), v_admin, 'remove_review', v_summary, p_reason);
end $$;

create or replace function admin_adjust_wallet(p_user uuid, p_credits integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_admin text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_credits is null or p_credits = 0 then raise exception 'Credit amount must be non-zero'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'A reason is required for wallet adjustments'; end if;
  select full_name into v_name from profiles where id = p_user;
  if not found then raise exception 'User not found'; end if;
  insert into wallets (user_id, balance) values (p_user, 0) on conflict (user_id) do nothing;
  update wallets set balance = greatest(0, balance + p_credits), updated_at = now() where user_id = p_user;
  insert into credit_transactions (user_id, kind, credits, status, note)
    values (p_user, 'adjustment', p_credits, 'approved', 'Admin: ' || p_reason);
  select full_name into v_admin from profiles where id = auth.uid();
  insert into admin_actions (admin_id, admin_name, action, target, reason)
    values (auth.uid(), v_admin, 'adjust_wallet', v_name || ' ' || (case when p_credits > 0 then '+' else '' end) || p_credits || ' credits', p_reason);
end $$;

-- ---------- 4) notifications ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  kind text,
  text text not null,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;
create policy "notif read own" on notifications for select using (user_id = auth.uid());
create policy "notif update own" on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- inserts come only from the triggers below (security definer).

create or replace function notify(p_user uuid, p_kind text, p_text text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into notifications (user_id, kind, text, link) values (p_user, p_kind, p_text, p_link);
end $$;

create or replace function notify_admins(p_kind text, p_text text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, text, link)
    select id, p_kind, p_text, p_link from profiles where is_admin;
end $$;

-- new message -> the other party
create or replace function trg_notify_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype; v_to uuid;
begin
  select * into b from bookings where id = new.booking_id;
  if not found then return new; end if;
  if new.sender_id = b.customer_id then v_to := b.artisan_id;
  elsif new.sender_id = b.artisan_id then v_to := b.customer_id;
  else return new; end if;
  perform notify(v_to, 'message',
    'New message from ' || coalesce(new.sender_name, 'someone') || ' about ' || b.ref,
    '#/chat?booking=' || new.booking_id);
  return new;
end $$;
drop trigger if exists trg_messages_notify on messages;
create trigger trg_messages_notify after insert on messages
  for each row execute function trg_notify_message();

-- new booking -> admins
create or replace function trg_notify_booking_new() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify_admins('booking',
    'New booking ' || new.ref || ' (' || new.service || ', ' || new.city || ')', '#/admin');
  return new;
end $$;
drop trigger if exists trg_bookings_notify_new on bookings;
create trigger trg_bookings_notify_new after insert on bookings
  for each row execute function trg_notify_booking_new();

-- booking status change -> customer + assigned artisan
create or replace function trg_notify_booking_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_label text;
begin
  if new.status is not distinct from old.status then return new; end if;
  v_label := case new.status
    when 'assigned' then 'an artisan was assigned'
    when 'quote_sent' then 'a quote of N' || coalesce(new.quote_amount::text, '') || ' was sent'
    when 'in_progress' then 'work has started'
    when 'completed' then 'the job was marked completed'
    when 'cancelled' then 'it was cancelled'
    else 'status: ' || new.status end;
  perform notify(new.customer_id, 'status', 'Booking ' || new.ref || ': ' || v_label || '.', '#/dashboard');
  if new.artisan_id is not null then
    perform notify(new.artisan_id, 'status', 'Job ' || new.ref || ': ' || v_label || '.', '#/artisan');
  end if;
  return new;
end $$;
drop trigger if exists trg_bookings_notify_status on bookings;
create trigger trg_bookings_notify_status after update on bookings
  for each row execute function trg_notify_booking_status();

-- new artisan application -> admins; decision -> applicant
create or replace function trg_notify_application() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify_admins('application',
      'New artisan application: ' || new.full_name || ' (' || new.trade || ', ' || new.city || ')', '#/admin');
  elsif new.status is distinct from old.status then
    perform notify(new.user_id, 'application',
      'Your artisan application was ' || new.status || '.', '#/artisan');
  end if;
  return new;
end $$;
drop trigger if exists trg_apps_notify on artisan_applications;
create trigger trg_apps_notify after insert or update on artisan_applications
  for each row execute function trg_notify_application();

-- new pending credit purchase -> admins
create or replace function trg_notify_purchase() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.kind = 'purchase' and new.status = 'pending' then
    select full_name into v_name from profiles where id = new.user_id;
    perform notify_admins('purchase',
      'New credit purchase: ' || coalesce(v_name, 'Someone') || ' - ' || new.credits || ' credits', '#/admin');
  end if;
  return new;
end $$;
drop trigger if exists trg_tx_notify on credit_transactions;
create trigger trg_tx_notify after insert on credit_transactions
  for each row execute function trg_notify_purchase();
