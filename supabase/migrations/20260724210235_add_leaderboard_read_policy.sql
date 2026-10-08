-- Allow any authenticated user to read profile rows for the leaderboard.
-- Keeps the existing owner-scoped SELECT policy; this adds a public-read
-- policy so the leaderboard can rank all learners.
DROP POLICY IF EXISTS "select_all_profiles_leaderboard" ON profiles;
CREATE POLICY "select_all_profiles_leaderboard" ON profiles FOR SELECT
  TO authenticated USING (true);
