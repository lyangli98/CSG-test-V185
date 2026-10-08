-- ============================================================
-- COMMUNITY ACCESS: email allowlist + signup gate
-- ============================================================
-- Only emails pre-approved by an admin can sign up.
-- Passwords are stored by Supabase Auth as bcrypt hashes in auth.users
-- (never exposed to the frontend or to any client).
-- Admins issue credentials via the admin-create-user edge function,
-- which inserts the allowlist row then creates the auth user server-side.
-- ============================================================

CREATE TABLE IF NOT EXISTS allowed_emails (
  email text PRIMARY KEY,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Admins can read the allowlist; nobody else can.
DROP POLICY IF EXISTS "select_allowed_emails" ON allowed_emails;
CREATE POLICY "select_allowed_emails" ON allowed_emails FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "insert_allowed_emails" ON allowed_emails;
CREATE POLICY "insert_allowed_emails" ON allowed_emails FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_allowed_emails" ON allowed_emails;
CREATE POLICY "delete_allowed_emails" ON allowed_emails FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================
-- SIGNUP GATE: block any signup whose email is not allowlisted.
-- Runs BEFORE INSERT on auth.users. The admin edge function
-- inserts the allowlist row first, so its subsequent user
-- creation passes this check.
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_email_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the email is not on the allowlist, reject the signup.
  IF NOT EXISTS (SELECT 1 FROM allowed_emails WHERE email = lower(NEW.email)) THEN
    RAISE EXCEPTION 'This email is not invited. Ask an admin for access.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_allowlist ON auth.users;
CREATE TRIGGER on_auth_user_created_allowlist
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION enforce_email_allowlist();
