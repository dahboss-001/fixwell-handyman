-- ============================================================
-- FIXWELL HANDYMAN - PATCH 011
-- Open-lead alerts: when a booking is created, every approved
-- artisan in the same city whose trade matches the service gets
-- an in-app notification. Artisans with trade "Other trade" get
-- all alerts for their city.
-- ADDITIVE + RE-RUNNABLE: one new trigger function, one trigger.
-- Safe to run after patches 001-010.
-- ============================================================

create or replace function trg_notify_open_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, text, link)
  select a.user_id, 'open_lead',
         'New ' || new.service || ' job in ' || new.city || ' (' || new.ref || '). Open your artisan dashboard to send a quote.',
         '#/artisan'
  from artisan_applications a
  where a.status = 'approved'
    and a.city = new.city
    and (a.trade = new.service or a.trade = 'Other trade')
    and a.user_id <> new.customer_id;
  return new;
end;
$$;

drop trigger if exists trg_notify_open_lead on bookings;
create trigger trg_notify_open_lead after insert on bookings
  for each row execute function trg_notify_open_lead();
