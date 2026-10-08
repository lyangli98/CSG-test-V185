-- Fix: Recreate handle_new_user with explicit search_path to avoid runtime failures
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(split_part(NEW.email, '@', 1), 'Learner')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Clean up duplicate lessons (migration was applied twice)
DELETE FROM lessons a USING lessons b
WHERE a.ctid < b.ctid
  AND a.episode_id = b.episode_id
  AND a.lesson_number = b.lesson_number;
