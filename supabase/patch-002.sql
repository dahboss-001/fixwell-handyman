-- ============================================================
-- FIXWELL patch 002 - run once in the SQL editor after patch 001
-- 1) In-app messaging: one conversation per booking, visible only
--    to that booking's customer, its artisan, and admins.
-- 2) payment_ref column for Paystack references (used when the
--    payment integration goes live).
-- 3) credit_wallet(): atomic wallet top-up callable ONLY by the
--    service role (the payment-verify function), never by clients.
-- ============================================================

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  sender_name text,
  body text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "msgs read parties" on messages for select using (
  is_admin() or exists (
    select 1 from bookings b where b.id = booking_id
    and (b.customer_id = auth.uid() or b.artisan_id = auth.uid()))
);

create policy "msgs insert parties" on messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from bookings b where b.id = booking_id
    and (b.customer_id = auth.uid() or b.artisan_id = auth.uid())
    and b.artisan_id is not null)
);

alter table credit_transactions add column if not exists payment_ref text;

create or replace function credit_wallet(p_user uuid, p_credits integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_credits is null or p_credits <= 0 then raise exception 'Invalid credit amount'; end if;
  insert into wallets (user_id, balance) values (p_user, p_credits)
    on conflict (user_id) do update set balance = wallets.balance + p_credits, updated_at = now();
end $$;

revoke execute on function credit_wallet(uuid, integer) from public, anon, authenticated;
grant execute on function credit_wallet(uuid, integer) to service_role;
