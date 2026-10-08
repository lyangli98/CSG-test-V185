/*
# Fix: drop blocking unique constraint on char_quiz_rounds

1. Purpose
- The UNIQUE(session_id, word_id, stage, option_ids) constraint blocks
  retry rounds and repeated correct rounds when the same distractor set
  is randomly selected (guaranteed with ≤3 words per lesson, since
  jsonb array comparison is order-insensitive).
- This caused "nothing to choose" at Step 2 and prevented the
  achievement popup from showing (complete_char_quiz could not verify
  enough correct rounds).

2. Security
- No impact on RLS or function security.
- The server still tracks every round and verifies correctness.
- Dropping the constraint only allows multiple round rows per
  word+stage, which is required for the 3-correct-answers flow.
*/

ALTER TABLE public.char_quiz_rounds
  DROP CONSTRAINT IF EXISTS char_quiz_rounds_session_id_word_id_stage_option_i_key;
