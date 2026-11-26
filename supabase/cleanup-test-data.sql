-- ============================================================
-- FIXWELL - remove demo/test data
-- Run this in the SQL editor when you are done reviewing the demo.
-- It deletes the three test accounts' profiles; every booking,
-- wallet, transaction, application and review they created is
-- removed automatically by the database (cascade).
-- ============================================================

delete from profiles
where id in (
  select id from auth.users where email in (
    'dahbosspurekid+fwcustomer@gmail.com',
    'dahbosspurekid+fwartisan@gmail.com',
    'dahbosspurekid+fwadmin@gmail.com'
  )
);

-- Afterwards (optional): in Authentication -> Users you can also
-- delete the same three test logins so the project is spotless.

-- ============================================================
-- Make YOURSELF admin - do this once, after you sign up on the
-- site with your own email. Uncomment the two lines, put your
-- email in, and Run:
--
-- update profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
-- ============================================================
