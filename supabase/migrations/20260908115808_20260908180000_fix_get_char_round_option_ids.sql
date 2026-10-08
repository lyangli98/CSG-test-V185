-- Fix: get_char_round was using jsonb_agg(x) on a subquery alias, producing
-- [{"value":"uuid"},...] instead of ["uuid",...]. The frontend could never
-- match these objects against char_words.id, so answer options were blank.

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

  SELECT s.lesson_id INTO v_lesson_id
  FROM public.char_quiz_sessions s
  WHERE s.id = p_session_id AND s.user_id = auth.uid();

  IF v_lesson_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;

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

  SELECT COALESCE(jsonb_agg(d.id), '[]'::jsonb) INTO v_option_ids
  FROM (
    SELECT id FROM public.char_words
    WHERE lesson_id = v_lesson_id
      AND id <> v_target_id
    ORDER BY random()
    LIMIT 2
  ) d;

  -- Combine target + distractors and shuffle.
  -- Use x.value (the jsonb scalar) not x (the row) so we get ["uuid",...]
  -- instead of [{"value":"uuid"},...].
  v_option_ids := (
    SELECT COALESCE(jsonb_agg(x.value ORDER BY random()), '[]'::jsonb)
    FROM (
      SELECT value FROM jsonb_array_elements(v_option_ids)
      UNION ALL
      SELECT to_jsonb(v_target_id)
    ) x
  );

  INSERT INTO public.char_quiz_rounds (session_id, word_id, stage, option_ids)
  VALUES (p_session_id, v_target_id, p_stage, v_option_ids)
  RETURNING id INTO v_round_id;

  RETURN QUERY SELECT v_round_id, v_option_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.get_char_round(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_char_round(uuid, uuid, text) TO authenticated;
