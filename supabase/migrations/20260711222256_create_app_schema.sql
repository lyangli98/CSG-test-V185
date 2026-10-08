/*
# Create CSG App Schema: Profiles, Admins, Lessons, Progress, Announcements

## Overview
This migration creates the full database schema for the CSG (Learn Chinese With Vlog) app:
user authentication support, admin role management, lesson content, per-user progress
tracking, and a site-wide announcement system with read receipts.

## New Tables
- profiles: extends auth.users with display_name, avatar_emoji, hsk_level, total_points, streak_days
- admins: maps auth.users to admin privileges
- lessons: lesson content with youtube_id for custom player
- user_progress: tracks completed lessons per user (unique per user+lesson)
- announcements: site-wide announcements from admins
- announcement_reads: read receipts for unread badge count

## Security (RLS)
- profiles: owner-scoped CRUD (auth.uid() = id)
- admins: SELECT for all authenticated; INSERT/DELETE only by existing admins
- lessons: SELECT for all authenticated; INSERT/UPDATE/DELETE admin-only via is_admin()
- user_progress: owner-scoped CRUD (auth.uid() = user_id, DEFAULT auth.uid())
- announcements: SELECT for all authenticated; INSERT/UPDATE/DELETE admin-only
- announcement_reads: owner-scoped SELECT/INSERT/DELETE

## Triggers
- handle_new_user: auto-creates profile row on signup with email prefix as display_name
- is_admin(): SECURITY DEFINER helper checking admins table membership

## Seed Data
- 12 lessons (6 episodes × 2 lessons each) with Chinese-learning content

## Important Notes
1. Email confirmation is OFF.
2. To grant admin access after signing up:
   INSERT INTO admins (user_id) VALUES ('your-auth-user-uuid');
   Find your UUID: SELECT id, email FROM auth.users;
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_emoji text NOT NULL DEFAULT '🎯',
  hsk_level text NOT NULL DEFAULT 'HSK 1',
  total_points integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- ADMINS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admins" ON admins;
CREATE POLICY "select_admins" ON admins FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_admins" ON admins;
CREATE POLICY "insert_admins" ON admins FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_admins" ON admins;
CREATE POLICY "delete_admins" ON admins FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));

-- ============================================================
-- IS_ADMIN() HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$;

-- ============================================================
-- LESSONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id integer NOT NULL,
  lesson_number integer NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  youtube_id text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_lessons" ON lessons;
CREATE POLICY "insert_lessons" ON lessons FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_lessons" ON lessons;
CREATE POLICY "update_lessons" ON lessons FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_lessons" ON lessons;
CREATE POLICY "delete_lessons" ON lessons FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================
-- USER_PROGRESS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  points_earned integer NOT NULL DEFAULT 100,
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_progress" ON user_progress;
CREATE POLICY "select_own_progress" ON user_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_progress" ON user_progress;
CREATE POLICY "insert_own_progress" ON user_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_progress" ON user_progress;
CREATE POLICY "update_own_progress" ON user_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_progress" ON user_progress;
CREATE POLICY "delete_own_progress" ON user_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '📢',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_announcements" ON announcements;
CREATE POLICY "select_announcements" ON announcements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_announcements" ON announcements;
CREATE POLICY "insert_announcements" ON announcements FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_announcements" ON announcements;
CREATE POLICY "update_announcements" ON announcements FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_announcements" ON announcements;
CREATE POLICY "delete_announcements" ON announcements FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================
-- ANNOUNCEMENT_READS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE (user_id, announcement_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reads" ON announcement_reads;
CREATE POLICY "select_own_reads" ON announcement_reads FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reads" ON announcement_reads;
CREATE POLICY "insert_own_reads" ON announcement_reads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reads" ON announcement_reads;
CREATE POLICY "delete_own_reads" ON announcement_reads FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(split_part(NEW.email, '@', 1), 'Learner')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED DATA: Lessons (6 episodes × 2 lessons = 12 lessons)
-- ============================================================
INSERT INTO lessons (episode_id, lesson_number, title, subtitle, youtube_id, duration_minutes) VALUES
  (1, 1, 'Pinyin Basics', 'Learn the four tones and pinyin fundamentals', 'dQw4w9WgXcQ', 15),
  (1, 2, 'Stroke Order', 'Understanding Chinese character stroke order', 'dQw4w9WgXcQ', 12),
  (2, 1, 'Hello and Goodbye', 'Essential greeting phrases for daily life', 'dQw4w9WgXcQ', 10),
  (2, 2, 'Polite Introductions', 'How to introduce yourself in Chinese', 'dQw4w9WgXcQ', 14),
  (3, 1, 'Counting 1-100', 'Master numbers and counting in Chinese', 'dQw4w9WgXcQ', 11),
  (3, 2, 'Telling Time', 'Express time and dates naturally', 'dQw4w9WgXcQ', 13),
  (4, 1, 'Family Members', 'Vocabulary for family relationships', 'dQw4w9WgXcQ', 9),
  (4, 2, 'Talking About Family', 'Describe your family in conversation', 'dQw4w9WgXcQ', 16),
  (5, 1, 'Ordering Food', 'Restaurant phrases and etiquette', 'dQw4w9WgXcQ', 12),
  (5, 2, 'Chinese Cuisine', 'Dish names and food culture vocabulary', 'dQw4w9WgXcQ', 15),
  (6, 1, 'Asking Directions', 'Navigate cities and ask for help', 'dQw4w9WgXcQ', 14),
  (6, 2, 'Transportation', 'Trains, taxis, and travel phrases', 'dQw4w9WgXcQ', 11)
ON CONFLICT DO NOTHING;