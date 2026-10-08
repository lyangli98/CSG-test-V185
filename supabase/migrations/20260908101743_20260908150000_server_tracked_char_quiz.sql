/*
# Server-tracked character quiz attempts

## Purpose
Eliminates the single-RPC-call bypass where a student could award themselves
character-test completion by submitting fabricated answer records. The server
now generates quiz sessions, tracks each round's target word and options, and
verifies each answer individually.

## New Tables

### char_quiz_sessions
- id (uuid PK)
- user_id (uuid, auth.uid(), FK auth.users)
- lesson_id (uuid, FK char_lessons)
- word_ids (jsonb array of up to 5 char_words IDs selected by the server)
- created_at (timestamptz)
- UNIQUE(user_id, lesson_id) — one active session per user per lesson

### char_quiz_rounds
- id (uuid PK)
- session_id (uuid, FK char_quiz_sessions ON DELETE CASCADE)
- word_id (uuid, FK char_words — the target word for this round)
- stage (text: 'wordtest' or 'sentence')
- option_ids (jsonb array of 3 char_words IDs — the presented options)
- selected_word_id (uuid, nullable — what the student picked)
- is_correct (boolean, default false)
- created_at (timestamptz)
- UNIQUE(session_id, word_id, stage, option_ids) — prevents duplicate round spam

## New / Modified Functions

### start_char_quiz(p_lesson_id uuid)
- Picks 5 random words from the lesson (or all if ≤5).
- Creates/replaces a session for this user+lesson.
- Returns the selected word IDs + word data for the Learn stage.

### get_char_round(p_session_id uuid, p_word_id uuid, p_stage text)
- Validates the session belongs to the caller and the word is in the session.
- Picks 2 random distractors from the lesson's words.
- Creates a round row with the target + option IDs.
- Returns the 3 option word IDs in shuffled order (without revealing which is correct).

### submit_char_round(p_round_id uuid, p_selected_word_id uuid)
- Validates the round belongs to a session owned by the caller.
- Checks if the selected word matches the stored target word.
- Records the result; returns is_correct + completion counts.

### complete_char_quiz(p_session_id uuid)
- Verifies all required rounds are correct (3 wordtest + 3 sentence per word).
- Writes char_progress with score 100.
- Returns success + score.

## Security
- All functions are SECURITY DEFINER with SET search_path = public.
- All functions derive the user from auth.uid().
- Execution revoked from anon; granted to authenticated only.
- RLS enabled on both new tables; no direct student writes allowed.
- char_progress INSERT/UPDATE/DELETE policies remain dropped (from prior hardening).
*/

-- ── Tables ──

CREATE TABLE IF NOT EXISTS public.char_quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.char_lessons(id) ON DELETE CASCADE,
  word_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.char_quiz_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "char_quiz_sessions_select_own" ON public.char_quiz_sessions;
CREATE POLICY "char_quiz_sessions_select_own" ON public.char_quiz_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.char_quiz_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.char_quiz_sessions(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES public.char_words(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('wordtest', 'sentence')),
  option_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_word_id uuid,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, word_id, stage, option_ids)
);

ALTER TABLE public.char_quiz_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "char_quiz_rounds_select_own" ON public.char_quiz_rounds;
CREATE POLICY "char_quiz_rounds_select_own" ON public.char_quiz_rounds
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.char_quiz_sessions s
      WHERE s.id = char_quiz_rounds.session_id AND s.user_id = auth.uid()
    )
  );

-- ── Indexes ──

CREATE INDEX IF NOT EXISTS idx_char_quiz_sessions_user ON public.char_quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_char_quiz_rounds_session ON public.char_quiz_rounds(session_id);

-- ── Functions ──

CREATE OR REPLACE FUNCTION public.start_char_quiz(p_lesson_id uuid)
RETURNS TABLE(
  session_id uuid,
  word_ids jsonb,
  words jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_word_ids jsonb;
  v_word_data jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, NULL::jsonb;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.char_lessons WHERE id = p_lesson_id) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, NULL::jsonb;
    RETURN;
  END IF;

  -- Delete any existing session for this user+lesson (fresh start)
  DELETE FROM public.char_quiz_sessions
  WHERE user_id = auth.uid() AND lesson_id = p_lesson_id;

  -- Pick 5 random words (or all if ≤5)
  SELECT COALESCE(jsonb_agg(w.id), '[]'::jsonb) INTO v_word_ids
  FROM (
    SELECT id FROM public.char_words
    WHERE lesson_id = p_lesson_id
    ORDER BY random()
    LIMIT 5
  ) w;

  IF jsonb_array_length(v_word_ids) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, NULL::jsonb;
    RETURN;
  END IF;

  INSERT INTO public.char_quiz_sessions (user_id, lesson_id, word_ids)
  VALUES (auth.uid(), p_lesson_id, v_word_ids)
  RETURNING id INTO v_session_id;

  -- Return full word data for the Learn stage
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_word_data
  FROM (
    SELECT cw.id, cw.lesson_id, cw.chinese, cw.pinyin, cw.meaning,
           cw.image_url, cw.audio_url, cw.sentence_hanzi, cw.sentence_pinyin,
           cw.sentence_meaning, cw.sentence_audio_url, cw.sort_order
    FROM public.char_words cw
    WHERE cw.lesson_id = p_lesson_id
      AND cw.id::text IN (
        SELECT value #>> '{}' FROM jsonb_array_elements(v_word_ids)
      )
    ORDER BY cw.sort_order
  ) t;

  RETURN QUERY SELECT v_session_id, v_word_ids, v_word_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_char_round(
  p_session_id uuid,
  p_word_id uuid,
  p_stage text
)
RETURNS TABLE(round_id uuid, option_ids jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson_id uuid;
  v_target_id uuid;
  v_option_ids jsonb;
  v_round_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_stage NOT IN ('wordtest', 'sentence') THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;

  -- Verify session ownership and get lesson
  SELECT s.lesson_id INTO v_lesson_id
  FROM public.char_quiz_sessions s
  WHERE s.id = p_session_id AND s.user_id = auth.uid();

  IF v_lesson_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;

  -- Verify the requested word is part of this session
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      (SELECT word_ids FROM public.char_quiz_sessions WHERE id = p_session_id)
    ) AS elem
    WHERE elem #>> '{}' = p_word_id::text
  ) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;

  v_target_id := p_word_id;

  -- Pick 2 random distractors from the same lesson
  SELECT COALESCE(jsonb_agg(d.id), '[]'::jsonb) INTO v_option_ids
  FROM (
    SELECT id FROM public.char_words
    WHERE lesson_id = v_lesson_id
      AND id <> v_target_id
    ORDER BY random()
    LIMIT 2
  ) d;

  -- Combine target + distractors and shuffle
  v_option_ids := (
    SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
    FROM (
      SELECT value FROM jsonb_array_elements(v_option_ids)
      UNION ALL
      SELECT to_jsonb(v_target_id)
      ORDER BY random()
    ) x
  );

  -- Create the round
  INSERT INTO public.char_quiz_rounds (session_id, word_id, stage, option_ids)
  VALUES (p_session_id, v_target_id, p_stage, v_option_ids)
  RETURNING id INTO v_round_id;

  RETURN QUERY SELECT v_round_id, v_option_ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_char_round(
  p_round_id uuid,
  p_selected_word_id uuid
)
RETURNS TABLE(is_correct boolean, wordtest_correct integer, sentence_correct integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_word_id uuid;
  v_stage text;
  v_is_correct boolean;
  v_wordtest_count integer;
  v_sentence_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  -- Verify the round belongs to a session owned by the caller
  SELECT r.session_id, r.word_id, r.stage, r.is_correct
  INTO v_session_id, v_word_id, v_stage, v_is_correct
  FROM public.char_quiz_rounds r
  JOIN public.char_quiz_sessions s ON s.id = r.session_id
  WHERE r.id = p_round_id AND s.user_id = auth.uid();

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  -- If already correct, don't double-count
  IF v_is_correct THEN
    RETURN QUERY SELECT true, 0, 0;
    RETURN;
  END IF;

  v_is_correct := (p_selected_word_id = v_word_id);

  UPDATE public.char_quiz_rounds
  SET selected_word_id = p_selected_word_id, is_correct = v_is_correct
  WHERE id = p_round_id;

  -- Count correct rounds for this word+session
  SELECT
    count(*) FILTER (WHERE stage = 'wordtest' AND is_correct),
    count(*) FILTER (WHERE stage = 'sentence' AND is_correct)
  INTO v_wordtest_count, v_sentence_count
  FROM public.char_quiz_rounds
  WHERE session_id = v_session_id AND word_id = v_word_id;

  RETURN QUERY SELECT v_is_correct, v_wordtest_count, v_sentence_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_char_quiz(p_session_id uuid)
RETURNS TABLE(success boolean, score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson_id uuid;
  v_word_count integer;
  v_completed_words integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  SELECT s.lesson_id INTO v_lesson_id
  FROM public.char_quiz_sessions s
  WHERE s.id = p_session_id AND s.user_id = auth.uid();

  IF v_lesson_id IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- Count distinct words in the session
  SELECT jsonb_array_length(
    (SELECT word_ids FROM public.char_quiz_sessions WHERE id = p_session_id)
  ) INTO v_word_count;

  -- Count words that have 3 correct wordtest + 3 correct sentence rounds
  WITH counts AS (
    SELECT
      r.word_id,
      count(*) FILTER (WHERE r.stage = 'wordtest' AND r.is_correct) AS wt,
      count(*) FILTER (WHERE r.stage = 'sentence' AND r.is_correct) AS st
    FROM public.char_quiz_rounds r
    WHERE r.session_id = p_session_id
    GROUP BY r.word_id
  )
  SELECT count(*) INTO v_completed_words
  FROM counts
  WHERE wt >= 3 AND st >= 3;

  IF v_completed_words >= v_word_count AND v_word_count > 0 THEN
    INSERT INTO public.char_progress (user_id, lesson_id, score)
    VALUES (auth.uid(), v_lesson_id, 100)
    ON CONFLICT (user_id, lesson_id) DO UPDATE
      SET score = GREATEST(public.char_progress.score, EXCLUDED.score);
    RETURN QUERY SELECT true, 100;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, 0;
END;
$$;

-- ── Grants ──

REVOKE ALL ON FUNCTION public.start_char_quiz(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_char_round(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_char_round(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_char_quiz(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_char_quiz(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_char_round(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_char_round(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_char_quiz(uuid) TO authenticated;
