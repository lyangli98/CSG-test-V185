-- The UNIQUE(session_id, word_id, stage, option_ids) constraint can cause
-- INSERT failures when the same 3 options come up in the same order for
-- the same word+stage. This makes get_char_round return NULL (blank options)
-- intermittently. Drop the constraint to allow duplicate option sets.

ALTER TABLE public.char_quiz_rounds
  DROP CONSTRAINT IF EXISTS char_quiz_rounds_session_id_word_id_stage_option_ids_key;
