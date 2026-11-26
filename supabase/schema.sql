-- ============================================================
-- FIXWELL HANDYMAN - Supabase schema
-- Run once in the Supabase SQL editor on a fresh project.
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text default 'customer',
  city text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists artisan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  full_name text,
  trade text,
  experience text,
  area text,
  city text,
  status text default 'pending',
  applied_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  customer_id uuid references profiles(id) on delete cascade,
  customer_name text,
  service text,
  city text,
  area text,
  urgency text,
  description text,
  status text default 'received',
  artisan_id uuid references profiles(id),
  artisan_name text,
  quote_amount integer,
  created_at timestamptz default now()
);

-- Contact details live apart from the booking so they can be gated
-- behind a credit unlock instead of riding along with the lead.
create table if not exists booking_contacts (
  booking_id uuid primary key references bookings(id) on delete cascade,
  name text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan text,
  billing text,
  amount integer,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan text,
  amount integer,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,
  customer_name text,
  service text,
  city text,
  rating integer,
  comment text,
  created_at timestamptz default now()
);

-- ---------------- CREDITS ----------------

create table if not exists wallets (
  user_id uuid primary key references profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz default now()
);

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  kind text not null,              -- purchase | spend | adjustment
  credits integer not null,        -- positive = in, negative = out
  price_ngn integer,               -- what the purchase would cost (placeholder pricing)
  booking_id uuid references bookings(id),
  status text not null default 'approved',  -- purchases start 'pending' (manual test-mode confirm)
  note text,
  created_at timestamptz default now()
);

create table if not exists contact_unlocks (
  user_id uuid references profiles(id) on delete cascade,
  booking_id uuid references bookings(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, booking_id)
);

-- ---------------- HELPER FUNCTIONS ----------------

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- Atomic credit spend: locks the wallet row, checks balance, records
-- the spend and the unlock in one go. Already-unlocked contacts are
-- returned free (idempotent).
create or replace function spend_credits(p_booking_id uuid, p_cost integer)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_balance int;
  v_contact json;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_cost is null or p_cost < 0 then raise exception 'Invalid cost'; end if;

  if exists (select 1 from contact_unlocks where user_id = v_uid and booking_id = p_booking_id) then
    select json_build_object('name', name, 'phone', phone) into v_contact
      from booking_contacts where booking_id = p_booking_id;
    return json_build_object('contact', v_contact, 'charged', 0);
  end if;

  insert into wallets (user_id, balance) values (v_uid, 0) on conflict (user_id) do nothing;

  update wallets set balance = balance - p_cost, updated_at = now()
    where user_id = v_uid and balance >= p_cost
    returning balance into v_balance;
  if not found then raise exception 'Not enough credits'; end if;

  insert into credit_transactions (user_id, kind, credits, booking_id, status, note)
    values (v_uid, 'spend', -p_cost, p_booking_id, 'approved', 'Contact unlock');
  insert into contact_unlocks (user_id, booking_id) values (v_uid, p_booking_id);

  select json_build_object('name', name, 'phone', phone) into v_contact
    from booking_contacts where booking_id = p_booking_id;
  return json_build_object('contact', v_contact, 'charged', p_cost, 'balance', v_balance);
end $$;

-- Manual (test-mode) purchase approval: admin marks the pending
-- purchase approved and the credits land in the wallet atomically.
create or replace function approve_credit_purchase(p_tx uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tx credit_transactions%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into v_tx from credit_transactions where id = p_tx and status = 'pending' for update;
  if not found then raise exception 'Purchase not found or already handled'; end if;

  update credit_transactions set status = 'approved' where id = p_tx;
  insert into wallets (user_id, balance) values (v_tx.user_id, v_tx.credits)
    on conflict (user_id) do update set balance = wallets.balance + v_tx.credits, updated_at = now();
end $$;

create or replace function reject_credit_purchase(p_tx uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update credit_transactions set status = 'rejected' where id = p_tx and status = 'pending';
end $$;

-- Stop users from promoting themselves: only an existing admin (or the
-- SQL editor) may change is_admin.
create or replace function protect_admin_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin and not is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_admin on profiles;
create trigger trg_protect_admin before update on profiles
  for each row execute function protect_admin_flag();

-- ---------------- ROW LEVEL SECURITY ----------------

alter table profiles enable row level security;
alter table artisan_applications enable row level security;
alter table bookings enable row level security;
alter table booking_contacts enable row level security;
alter table subscriptions enable row level security;
alter table memberships enable row level security;
alter table reviews enable row level security;
alter table wallets enable row level security;
alter table credit_transactions enable row level security;
alter table contact_unlocks enable row level security;

-- profiles
create policy "profiles read own or admin" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles insert own" on profiles for insert
  with check (id = auth.uid());
create policy "profiles update own or admin" on profiles for update
  using (id = auth.uid() or is_admin());

-- artisan applications
create policy "apps insert own" on artisan_applications for insert
  with check (user_id = auth.uid());
create policy "apps read own or admin" on artisan_applications for select
  using (user_id = auth.uid() or is_admin());
create policy "apps update own or admin" on artisan_applications for update
  using (user_id = auth.uid() or is_admin());

-- bookings: customers manage theirs, approved artisans see open leads
-- plus jobs they accepted, admin sees all
create policy "bookings insert own" on bookings for insert
  with check (customer_id = auth.uid());
create policy "bookings read" on bookings for select using (
  customer_id = auth.uid() or artisan_id = auth.uid() or is_admin()
  or (status = 'received' and exists (
    select 1 from artisan_applications a
    where a.user_id = auth.uid() and a.status = 'approved'))
);
create policy "bookings update" on bookings for update
  using (customer_id = auth.uid() or artisan_id = auth.uid() or is_admin());

-- booking contacts: the customer, admin, or an artisan who unlocked it
create policy "contacts insert own booking" on booking_contacts for insert
  with check (exists (select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "contacts read gated" on booking_contacts for select using (
  is_admin()
  or exists (select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid())
  or exists (select 1 from contact_unlocks u where u.booking_id = booking_contacts.booking_id and u.user_id = auth.uid())
);

-- subscriptions / memberships
create policy "subs insert own" on subscriptions for insert with check (user_id = auth.uid());
create policy "subs read own or admin" on subscriptions for select
  using (user_id = auth.uid() or is_admin());
create policy "membs insert own" on memberships for insert with check (user_id = auth.uid());
create policy "membs read own or admin" on memberships for select
  using (user_id = auth.uid() or is_admin());

-- reviews: anyone can read (they power the landing page), customers write theirs
create policy "reviews read all" on reviews for select using (true);
create policy "reviews insert own" on reviews for insert with check (customer_id = auth.uid());

-- wallets: read own; clients may only create their own empty wallet.
-- All balance changes go through the security-definer functions.
create policy "wallets read own or admin" on wallets for select
  using (user_id = auth.uid() or is_admin());
create policy "wallets create own empty" on wallets for insert
  with check (user_id = auth.uid() and balance = 0);

-- credit transactions: read own; create only a pending purchase for yourself
create policy "tx read own or admin" on credit_transactions for select
  using (user_id = auth.uid() or is_admin());
create policy "tx insert own pending purchase" on credit_transactions for insert
  with check (user_id = auth.uid() and kind = 'purchase' and status = 'pending' and credits > 0);

-- unlocks: read own; rows are written only by spend_credits()
create policy "unlocks read own" on contact_unlocks for select
  using (user_id = auth.uid() or is_admin());
