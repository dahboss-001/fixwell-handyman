-- ============================================================
-- Fixwell Handyman - patch-006 (additive, run after patch-005)
-- Quote comparison: several artisans can quote one open booking,
-- the customer picks the quote they want.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
-- Nothing destructive: existing tables, columns and rows unchanged.
-- ============================================================

-- ---------- 1) quotes table ----------
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  artisan_id uuid references profiles(id) on delete cascade,
  artisan_name text,
  amount integer not null,
  note text,
  status text default 'pending',  -- pending | accepted | declined | withdrawn
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- one live quote per artisan per booking
create unique index if not exists quotes_pending_uidx
  on quotes(booking_id, artisan_id) where status = 'pending';

alter table quotes enable row level security;

-- reads only; writes go through the RPCs below
create policy "quotes read involved or admin" on quotes for select
  using (
    artisan_id = auth.uid()
    or is_admin()
    or exists (select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid())
  );

-- ---------- 2) artisan sends (or updates) a quote on an open booking ----------
create or replace function artisan_send_quote(p_booking uuid, p_amount integer, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me profiles%rowtype;
  v_b bookings%rowtype;
  v_q quotes%rowtype;
  v_new boolean := false;
begin
  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null or v_me.role <> 'artisan' then raise exception 'Artisans only'; end if;
  if is_suspended() then raise exception 'Account suspended'; end if;
  if not exists (select 1 from artisan_applications a where a.user_id = auth.uid() and a.status = 'approved') then
    raise exception 'Only approved artisans can quote';
  end if;
  select * into v_b from bookings where id = p_booking;
  if not found then raise exception 'Booking not found'; end if;
  if v_b.status <> 'received' then raise exception 'This booking is no longer open for quotes'; end if;
  if p_amount is null or p_amount < 500 then raise exception 'Quote must be at least ₦500'; end if;

  select * into v_q from quotes where booking_id = p_booking and artisan_id = auth.uid() and status = 'pending';
  if found then
    update quotes set amount = p_amount, note = p_note, updated_at = now() where id = v_q.id;
    perform notify(v_b.customer_id, 'quote',
      coalesce(v_me.full_name, 'An artisan') || ' updated their quote on ' || v_b.ref || ' to ₦' || p_amount || '.', '#/dashboard');
  else
    v_new := true;
    insert into quotes (booking_id, artisan_id, artisan_name, amount, note)
      values (p_booking, auth.uid(), v_me.full_name, p_amount, p_note)
      returning * into v_q;
    perform notify(v_b.customer_id, 'quote',
      'New quote on ' || v_b.ref || ': ₦' || p_amount || ' from ' || coalesce(v_me.full_name, 'an artisan') || '.', '#/dashboard');
  end if;
  return v_q.id;
end $$;

-- ---------- 3) artisan withdraws their own pending quote ----------
create or replace function artisan_withdraw_quote(p_quote uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update quotes set status = 'withdrawn', updated_at = now()
    where id = p_quote and artisan_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Quote not found or already handled'; end if;
end $$;

-- ---------- 4) customer picks a quote ----------
create or replace function customer_accept_quote(p_quote uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_q quotes%rowtype;
  v_b bookings%rowtype;
  v_other record;
begin
  select * into v_q from quotes where id = p_quote and status = 'pending';
  if not found then raise exception 'Quote not found or already handled'; end if;
  select * into v_b from bookings where id = v_q.booking_id;
  if v_b.customer_id <> auth.uid() then raise exception 'Only the customer can pick a quote'; end if;
  if v_b.status <> 'received' then raise exception 'This booking already has an artisan'; end if;

  update quotes set status = 'accepted', updated_at = now() where id = v_q.id;
  for v_other in select id, artisan_id from quotes where booking_id = v_b.id and status = 'pending' loop
    update quotes set status = 'declined', updated_at = now() where id = v_other.id;
    perform notify(v_other.artisan_id, 'quote',
      'Your quote on ' || v_b.ref || ' was not chosen this time.', '#/artisan');
  end loop;
  update bookings set
    artisan_id = v_q.artisan_id,
    artisan_name = v_q.artisan_name,
    quote_amount = v_q.amount,
    status = 'in_progress'
    where id = v_b.id;
  perform notify(v_q.artisan_id, 'quote',
    'Your quote of ₦' || v_q.amount || ' on ' || v_b.ref || ' was accepted. The job is yours.', '#/artisan');
end $$;

-- ---------- 5) safety net: if a booking leaves "received" any other way
-- (cancelled, or accepted the old way), close its remaining pending quotes
create or replace function trg_close_quotes_on_booking_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if old.status = 'received' and new.status is distinct from 'received' then
    for v in select id, artisan_id from quotes where booking_id = new.id and status = 'pending' loop
      update quotes set status = 'declined', updated_at = now() where id = v.id;
      perform notify(v.artisan_id, 'quote',
        'Booking ' || new.ref || ' is no longer open, so your quote was not taken.', '#/artisan');
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists trg_bookings_close_quotes on bookings;
create trigger trg_bookings_close_quotes after update of status on bookings
  for each row execute function trg_close_quotes_on_booking_change();
