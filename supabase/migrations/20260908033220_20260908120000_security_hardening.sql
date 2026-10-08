-- Security hardening: fixed definer paths, admin-only content writes,
-- server-mediated progress, and answer-free student question reads.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;

DROP POLICY IF EXISTS "char_lessons_insert" ON public.char_lessons;
CREATE POLICY "char_lessons_insert" ON public.char_lessons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "char_lessons_update" ON public.char_lessons;
CREATE POLICY "char_lessons_update" ON public.char_lessons FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "char_lessons_delete" ON public.char_lessons;
CREATE POLICY "char_lessons_delete" ON public.char_lessons FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "char_words_insert" ON public.char_words;
CREATE POLICY "char_words_insert" ON public.char_words FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "char_words_update" ON public.char_words;
CREATE POLICY "char_words_update" ON public.char_words FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "char_words_delete" ON public.char_words;
CREATE POLICY "char_words_delete" ON public.char_words FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "episodes_insert" ON public.episodes;
CREATE POLICY "episodes_insert" ON public.episodes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "episodes_update" ON public.episodes;
CREATE POLICY "episodes_update" ON public.episodes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "episodes_delete" ON public.episodes;
CREATE POLICY "episodes_delete" ON public.episodes FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "final_tests_insert" ON public.final_tests;
CREATE POLICY "final_tests_insert" ON public.final_tests FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "final_tests_update" ON public.final_tests;
CREATE POLICY "final_tests_update" ON public.final_tests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "final_tests_delete" ON public.final_tests;
CREATE POLICY "final_tests_delete" ON public.final_tests FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "final_test_questions_select" ON public.final_test_questions;
CREATE POLICY "final_test_questions_select" ON public.final_test_questions FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "final_test_questions_insert" ON public.final_test_questions;
CREATE POLICY "final_test_questions_insert" ON public.final_test_questions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "final_test_questions_update" ON public.final_test_questions;
CREATE POLICY "final_test_questions_update" ON public.final_test_questions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "final_test_questions_delete" ON public.final_test_questions;
CREATE POLICY "final_test_questions_delete" ON public.final_test_questions FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "sentence_lessons_insert" ON public.sentence_lessons;
CREATE POLICY "sentence_lessons_insert" ON public.sentence_lessons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "sentence_lessons_update" ON public.sentence_lessons;
CREATE POLICY "sentence_lessons_update" ON public.sentence_lessons FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "sentence_lessons_delete" ON public.sentence_lessons;
CREATE POLICY "sentence_lessons_delete" ON public.sentence_lessons FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "sentence_questions_select" ON public.sentence_questions;
CREATE POLICY "sentence_questions_select" ON public.sentence_questions FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "sentence_questions_insert" ON public.sentence_questions;
CREATE POLICY "sentence_questions_insert" ON public.sentence_questions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "sentence_questions_update" ON public.sentence_questions;
CREATE POLICY "sentence_questions_update" ON public.sentence_questions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "sentence_questions_delete" ON public.sentence_questions;
CREATE POLICY "sentence_questions_delete" ON public.sentence_questions FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_own_progress" ON public.user_progress;
DROP POLICY IF EXISTS "update_own_progress" ON public.user_progress;
DROP POLICY IF EXISTS "delete_own_progress" ON public.user_progress;
DROP POLICY IF EXISTS "char_progress_insert" ON public.char_progress;
DROP POLICY IF EXISTS "char_progress_update" ON public.char_progress;
DROP POLICY IF EXISTS "char_progress_delete" ON public.char_progress;
DROP POLICY IF EXISTS "insert_sentence_progress" ON public.sentence_progress;
DROP POLICY IF EXISTS "update_sentence_progress" ON public.sentence_progress;
DROP POLICY IF EXISTS "delete_sentence_progress" ON public.sentence_progress;

CREATE OR REPLACE FUNCTION public.record_user_progress(p_lesson_id uuid)
RETURNS TABLE(success boolean, score integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = p_lesson_id) THEN
    RETURN QUERY SELECT false, 0; RETURN;
  END IF;
  INSERT INTO public.user_progress (user_id, lesson_id, points_earned)
  VALUES (auth.uid(), p_lesson_id, 100)
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET points_earned = 100;
  RETURN QUERY SELECT true, 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_char_progress(p_lesson_id uuid, p_word_ids jsonb)
RETURNS TABLE(success boolean, score integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE valid_words integer; submitted_words integer; calculated_score integer;
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_word_ids) <> 'array'
     OR NOT EXISTS (SELECT 1 FROM public.char_lessons WHERE id = p_lesson_id) THEN
    RETURN QUERY SELECT false, 0; RETURN;
  END IF;
  SELECT count(*) INTO submitted_words FROM
    (SELECT DISTINCT value #>> '{}' AS word_id FROM jsonb_array_elements(p_word_ids)) submitted;
  SELECT count(*) INTO valid_words FROM public.char_words w
    WHERE w.lesson_id = p_lesson_id
      AND w.id::text IN (SELECT DISTINCT value #>> '{}' FROM jsonb_array_elements(p_word_ids));
  calculated_score := CASE WHEN submitted_words = 0 THEN 0
    ELSE LEAST(100, (valid_words * 100) / submitted_words) END;
  INSERT INTO public.char_progress (user_id, lesson_id, score)
  VALUES (auth.uid(), p_lesson_id, calculated_score)
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET score = GREATEST(public.char_progress.score, EXCLUDED.score);
  RETURN QUERY SELECT true, calculated_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_sentence_answer(
  p_lesson_id uuid, p_question_id uuid, p_answers jsonb, p_submissions jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE(is_correct boolean, completed boolean, score integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE question_correct jsonb; current_correct boolean := false;
  total_questions integer; verified_questions integer := 0; q record; submission jsonb; expected jsonb;
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_answers) <> 'array'
     OR jsonb_typeof(p_submissions) <> 'array'
     OR NOT EXISTS (SELECT 1 FROM public.sentence_questions WHERE id = p_question_id AND lesson_id = p_lesson_id) THEN
    RETURN QUERY SELECT false, false, 0; RETURN;
  END IF;
  SELECT CASE WHEN question_type = 'fill_blank' THEN correct_answer ELSE speaker_b_correct END INTO question_correct
  FROM public.sentence_questions WHERE id = p_question_id AND lesson_id = p_lesson_id;
  current_correct := question_correct = p_answers;
  IF NOT current_correct THEN RETURN QUERY SELECT false, false, 0; RETURN; END IF;
  SELECT count(*) INTO total_questions FROM public.sentence_questions WHERE lesson_id = p_lesson_id;
  FOR q IN SELECT id, question_type, correct_answer, speaker_b_correct FROM public.sentence_questions WHERE lesson_id = p_lesson_id LOOP
    SELECT s->'answers' INTO submission FROM jsonb_array_elements(p_submissions) AS items(s)
    WHERE s->>'question_id' = q.id::text LIMIT 1;
    expected := CASE WHEN q.question_type = 'fill_blank' THEN q.correct_answer ELSE q.speaker_b_correct END;
    IF submission IS NOT NULL AND expected = submission THEN verified_questions := verified_questions + 1; END IF;
  END LOOP;
  IF verified_questions = total_questions AND total_questions > 0 THEN
    INSERT INTO public.sentence_progress (user_id, lesson_id) VALUES (auth.uid(), p_lesson_id)
    ON CONFLICT (user_id, lesson_id) DO NOTHING;
    RETURN QUERY SELECT true, true, 100;
  END IF;
  RETURN QUERY SELECT true, false, (verified_questions * 100) / GREATEST(total_questions, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_sentence_questions(p_lesson_id uuid)
RETURNS TABLE(
  id uuid, lesson_id uuid, sort_order integer, question_type text,
  preview_chinese text, preview_pinyin text, preview_meaning text, preview_audio_url text,
  sentence_meaning text, sentence_audio_url text, slot_config jsonb, word_tiles jsonb,
  speaker_a_name text, speaker_a_avatar text, speaker_a_chinese text, speaker_a_meaning text,
  speaker_a_audio_url text, speaker_b_name text, speaker_b_avatar text, speaker_b_prompt text,
  speaker_b_answer_count integer, speaker_b_audio_url text, dialogue_word_tiles jsonb, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT q.id, q.lesson_id, q.sort_order, q.question_type,
    q.preview_chinese, q.preview_pinyin, q.preview_meaning, q.preview_audio_url,
    q.sentence_meaning, q.sentence_audio_url, q.slot_config, q.word_tiles,
    q.speaker_a_name, q.speaker_a_avatar, q.speaker_a_chinese, q.speaker_a_meaning,
    q.speaker_a_audio_url, q.speaker_b_name, q.speaker_b_avatar, q.speaker_b_prompt,
    jsonb_array_length(q.speaker_b_correct), q.speaker_b_audio_url, q.dialogue_word_tiles, q.created_at
  FROM public.sentence_questions q WHERE q.lesson_id = p_lesson_id ORDER BY q.sort_order;
$$;

CREATE OR REPLACE FUNCTION public.get_student_final_test_questions(p_test_id uuid)
RETURNS TABLE(
  id uuid, test_id uuid, question_type text, question text, chinese text, pinyin text,
  option_a text, option_b text, option_c text, option_d text,
  audio_url text, image_url text, sort_order integer, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id, test_id, question_type, question, chinese, pinyin,
    option_a, option_b, option_c, option_d, audio_url, image_url, sort_order, created_at
  FROM public.final_test_questions WHERE test_id = p_test_id ORDER BY sort_order;
$$;

REVOKE ALL ON FUNCTION public.record_user_progress(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_char_progress(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_sentence_answer(uuid, uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_sentence_questions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_final_test_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_user_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_char_progress(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_sentence_answer(uuid, uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_sentence_questions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_final_test_questions(uuid) TO anon, authenticated;
