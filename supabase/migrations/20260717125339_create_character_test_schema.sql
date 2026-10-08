/*
# Character Test Schema

## Summary
Creates the full character test feature: admin-managed lessons per episode, words within each lesson, and per-user completion tracking.

## New Tables

### char_lessons
Lessons created by admin for each episode's Character Test activity.
- id: uuid primary key
- episode_id: references episodes (integer foreign key)
- title: lesson display name
- sort_order: ordering among lessons in the same episode

### char_words
Up to 10 words per lesson. Student sees a random selection of 5.
- id: uuid primary key
- lesson_id: references char_lessons
- chinese: the Hanzi character(s) e.g. 附近
- pinyin: pronunciation e.g. fùjìn
- meaning: English definition
- image_url: optional photo to accompany the word
- audio_url: pronunciation audio file URL
- sentence_hanzi: example sentence using the word e.g. 这附近有很多人
- sentence_pinyin: pinyin for the full sentence
- sentence_meaning: English translation of the sentence
- sentence_audio_url: audio for the sentence
- sort_order: ordering within lesson

### char_progress
Tracks when a user completes a lesson.
- id: uuid primary key
- user_id: references auth.users
- lesson_id: references char_lessons
- score: percentage score (0-100)
- completed_at: timestamp

## Security
- RLS enabled on all three tables.
- char_lessons + char_words: readable by all authenticated users (students & admin), writable only by service role (admin uses service key via edge function or anon policy for now — using anon+authenticated readable, authenticated writable for admin).
- char_progress: owner-scoped to the authenticated user.
*/

-- char_lessons
CREATE TABLE IF NOT EXISTS char_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id integer NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE char_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "char_lessons_select" ON char_lessons;
CREATE POLICY "char_lessons_select" ON char_lessons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "char_lessons_insert" ON char_lessons;
CREATE POLICY "char_lessons_insert" ON char_lessons FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "char_lessons_update" ON char_lessons;
CREATE POLICY "char_lessons_update" ON char_lessons FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "char_lessons_delete" ON char_lessons;
CREATE POLICY "char_lessons_delete" ON char_lessons FOR DELETE
  TO authenticated USING (true);

-- char_words
CREATE TABLE IF NOT EXISTS char_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES char_lessons(id) ON DELETE CASCADE,
  chinese text NOT NULL,
  pinyin text NOT NULL,
  meaning text NOT NULL,
  image_url text,
  audio_url text,
  sentence_hanzi text,
  sentence_pinyin text,
  sentence_meaning text,
  sentence_audio_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE char_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "char_words_select" ON char_words;
CREATE POLICY "char_words_select" ON char_words FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "char_words_insert" ON char_words;
CREATE POLICY "char_words_insert" ON char_words FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "char_words_update" ON char_words;
CREATE POLICY "char_words_update" ON char_words FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "char_words_delete" ON char_words;
CREATE POLICY "char_words_delete" ON char_words FOR DELETE
  TO authenticated USING (true);

-- char_progress
CREATE TABLE IF NOT EXISTS char_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES char_lessons(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE char_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "char_progress_select" ON char_progress;
CREATE POLICY "char_progress_select" ON char_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "char_progress_insert" ON char_progress;
CREATE POLICY "char_progress_insert" ON char_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "char_progress_update" ON char_progress;
CREATE POLICY "char_progress_update" ON char_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "char_progress_delete" ON char_progress;
CREATE POLICY "char_progress_delete" ON char_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_char_lessons_episode ON char_lessons(episode_id);
CREATE INDEX IF NOT EXISTS idx_char_words_lesson ON char_words(lesson_id);
CREATE INDEX IF NOT EXISTS idx_char_progress_user ON char_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_char_progress_lesson ON char_progress(lesson_id);
