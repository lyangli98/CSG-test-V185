/*
# Revoke execution on the legacy record_char_progress RPC

1. Purpose
- The previous record_char_progress(uuid, jsonb) RPC was bypassable: a student
  could submit fabricated answer records where word_id = selected_word_id and
  award themselves full completion in a single call.
- The frontend now uses the server-tracked quiz system (start_char_quiz,
  get_char_round, submit_char_round, complete_char_quiz) instead.
- This migration revokes EXECUTE on the old RPC from all student roles so it
  can no longer be called directly, even though the frontend no longer uses it.

2. Security
- REVOKE EXECUTE from authenticated and anon.
- Does not drop the function (keeps migration history clean); it simply becomes
  uncallable by any student-facing role.
*/

REVOKE EXECUTE ON FUNCTION public.record_char_progress(uuid, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_char_progress(uuid, jsonb) FROM anon;
