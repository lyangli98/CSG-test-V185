/*
# Final Test Schema

## Summary
Creates tables for the final cumulative test that appears at the bottom of each episode's lesson page, after all 4 activity icons. Admin creates one final test per episode and adds multiple-choice questions covering all 4 activities (character, sentence, speaking, vlog).

## New Tables

### final_tests
One final test per episode (the cumulative assessment shown after all lessons).
- id: uuid primary key
- episode_id: integer (which episode this test belongs to)
- title: display name
- description: optional subtitle/instructions
- sort_order: ordering
- created_at: timestamp

### final_test_questions
Multiple-choice questions within a final test. Each question is tagged with a question_type so the test can cover all 4 activities.
- id: uuid primary key
- test_id: references final_tests (cascade delete)
- question_type: text — one of 'character', 'sentence', 'speaking', 'vlog'
- question: text — the question prompt in English
- chinese: text — the Hanzi shown in the question (if applicable)
- pinyin: text — pinyin for the question word
- option_a, option_b, option_c, option_d: text — four answer choices
- correct_option: text — 'a', 'b', 'c', or 'd'
- audio_url: text — optional audio for the question
- image_url: text — optional image for the question
- sort_order: integer
- created_at: timestamp

## Security
- RLS enabled on both tables.
- Readable by anon + authenticated (students need to see tests).
- Writable by authenticated (admin manages content).
*/

CREATE TABLE IF NOT EXISTS final_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id integer NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE final_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "final_tests_select" ON final_tests;
CREATE POLICY "final_tests_select" ON final_tests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "final_tests_insert" ON final_tests;
CREATE POLICY "final_tests_insert" ON final_tests FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "final_tests_update" ON final_tests;
CREATE POLICY "final_tests_update" ON final_tests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "final_tests_delete" ON final_tests;
CREATE POLICY "final_tests_delete" ON final_tests FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS final_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES final_tests(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'character',
  question text NOT NULL,
  chinese text,
  pinyin text,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL DEFAULT 'a',
  audio_url text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE final_test_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "final_test_questions_select" ON final_test_questions;
CREATE POLICY "final_test_questions_select" ON final_test_questions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "final_test_questions_insert" ON final_test_questions;
CREATE POLICY "final_test_questions_insert" ON final_test_questions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "final_test_questions_update" ON final_test_questions;
CREATE POLICY "final_test_questions_update" ON final_test_questions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "final_test_questions_delete" ON final_test_questions;
CREATE POLICY "final_test_questions_delete" ON final_test_questions FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_final_tests_episode ON final_tests(episode_id);
CREATE INDEX IF NOT EXISTS idx_final_test_questions_test ON final_test_questions(test_id);
