/*
# Verify character quiz answers server-side

1. Purpose
- Replaces the previous character-progress RPC that treated a list of lesson word IDs as proof of completion.
- The browser now submits the quiz's target word, selected word, and quiz stage for each choice.

2. Modified database behavior
- Drops and recreates `public.record_char_progress` with a new signature: (p_lesson_id uuid, p_answers jsonb).
- Validates submitted target and selected words against `public.char_words` for the requested lesson.
- Counts only selections where the selected word matches the authoritative target word.
- Requires at least the number of words presented by the current quiz (up to five) to have passed both quiz stages three times each.
- Writes `char_progress` only when the verified submitted set is complete.

3. Security
- Keeps the function SECURITY DEFINER with a fixed `search_path`.
- Derives the user from `auth.uid()`.
- Execution available to authenticated students only; revoked from anon and public.
- The old word-ID-only payload is no longer accepted.

4. Important limitation
- The function verifies answer claims and authoritative values it receives, but cannot cryptographically prove that every submitted choice was physically clicked in the browser. Adding server-tracked quiz attempts would require a schema change outside this scope.
*/

DROP FUNCTION IF EXISTS public.record_char_progress(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.record_char_progress(
  p_lesson_id uuid,
  p_answers jsonb
)
RETURNS TABLE(success boolean, score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_lesson_words integer;
  minimum_words integer;
  submitted_words integer;
  completed_words integer;
  calculated_score integer;
BEGIN
  IF auth.uid() IS NULL
     OR jsonb_typeof(p_answers) <> 'array'
     OR NOT EXISTS (
       SELECT 1 FROM public.char_lessons
       WHERE id = p_lesson_id
     ) THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  SELECT count(*) INTO total_lesson_words
  FROM public.char_words
  WHERE lesson_id = p_lesson_id;

  minimum_words := LEAST(5, total_lesson_words);

  WITH submitted AS (
    SELECT
      answer->>'word_id' AS word_id,
      answer->>'selected_word_id' AS selected_word_id,
      answer->>'stage' AS stage
    FROM jsonb_array_elements(p_answers) AS entries(answer)
    WHERE jsonb_typeof(answer) = 'object'
  ), valid_targets AS (
    SELECT DISTINCT s.word_id
    FROM submitted s
    JOIN public.char_words target
      ON target.id::text = s.word_id
     AND target.lesson_id = p_lesson_id
  )
  SELECT count(*) INTO submitted_words
  FROM valid_targets;

  WITH submitted AS (
    SELECT
      answer->>'word_id' AS word_id,
      answer->>'selected_word_id' AS selected_word_id,
      answer->>'stage' AS stage
    FROM jsonb_array_elements(p_answers) AS entries(answer)
    WHERE jsonb_typeof(answer) = 'object'
  ), verified AS (
    SELECT s.word_id, s.stage
    FROM submitted s
    JOIN public.char_words target
      ON target.id::text = s.word_id
     AND target.lesson_id = p_lesson_id
    JOIN public.char_words selected
      ON selected.id::text = s.selected_word_id
     AND selected.lesson_id = p_lesson_id
    WHERE s.word_id = s.selected_word_id
      AND s.stage IN ('wordtest', 'sentence')
  ), counts AS (
    SELECT
      word_id,
      count(*) FILTER (WHERE stage = 'wordtest') AS wordtest_correct,
      count(*) FILTER (WHERE stage = 'sentence') AS sentence_correct
    FROM verified
    GROUP BY word_id
  )
  SELECT count(*) INTO completed_words
  FROM counts
  WHERE wordtest_correct >= 3
    AND sentence_correct >= 3;

  calculated_score := CASE
    WHEN submitted_words = 0 THEN 0
    ELSE LEAST(100, (completed_words * 100) / submitted_words)
  END;

  IF submitted_words >= minimum_words
     AND submitted_words > 0
     AND completed_words = submitted_words THEN
    INSERT INTO public.char_progress (user_id, lesson_id, score)
    VALUES (auth.uid(), p_lesson_id, calculated_score)
    ON CONFLICT (user_id, lesson_id) DO UPDATE
      SET score = GREATEST(public.char_progress.score, EXCLUDED.score);
    RETURN QUERY SELECT true, calculated_score;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, calculated_score;
END;
$$;

REVOKE ALL ON FUNCTION public.record_char_progress(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_char_progress(uuid, jsonb) TO authenticated;
