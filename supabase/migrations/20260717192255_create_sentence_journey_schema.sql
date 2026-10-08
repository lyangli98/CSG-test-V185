
-- Sentence Journey: lesson containers
CREATE TABLE sentence_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id integer NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sentence_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_sentence_lessons" ON sentence_lessons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_sentence_lessons" ON sentence_lessons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_sentence_lessons" ON sentence_lessons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sentence_lessons" ON sentence_lessons FOR DELETE TO authenticated USING (true);

-- Sentence Journey: individual questions (fill_blank or dialogue)
CREATE TABLE sentence_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES sentence_lessons(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  question_type text NOT NULL CHECK (question_type IN ('fill_blank', 'dialogue')),

  -- preview card fields (shown before fill_blank exercise begins)
  preview_chinese text,
  preview_pinyin text,
  preview_meaning text,
  preview_audio_url text,

  -- fill_blank fields
  sentence_meaning text,
  sentence_audio_url text,
  slot_config jsonb NOT NULL DEFAULT '[]',    -- [{text, prefilled: bool}]
  word_tiles jsonb NOT NULL DEFAULT '[]',     -- [{chinese, pinyin, audio_url, meaning}]
  correct_answer jsonb NOT NULL DEFAULT '[]', -- ordered array of chinese strings for blank slots

  -- dialogue fields
  speaker_a_name text DEFAULT 'Speaker A',
  speaker_a_avatar text DEFAULT '👩',
  speaker_a_chinese text,
  speaker_a_meaning text,
  speaker_a_audio_url text,
  speaker_b_name text DEFAULT 'You',
  speaker_b_avatar text DEFAULT '👤',
  speaker_b_prompt text,
  speaker_b_correct jsonb NOT NULL DEFAULT '[]',
  speaker_b_audio_url text,
  dialogue_word_tiles jsonb NOT NULL DEFAULT '[]',

  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sentence_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_sentence_questions" ON sentence_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_sentence_questions" ON sentence_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_sentence_questions" ON sentence_questions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sentence_questions" ON sentence_questions FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_sentence_questions_lesson_id ON sentence_questions(lesson_id);
CREATE INDEX idx_sentence_lessons_episode_id ON sentence_lessons(episode_id);

-- Progress tracking
CREATE TABLE sentence_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES sentence_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE sentence_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_sentence_progress" ON sentence_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_sentence_progress" ON sentence_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_sentence_progress" ON sentence_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_sentence_progress" ON sentence_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
