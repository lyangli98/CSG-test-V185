/*
# Restrict character progress RPC execution

1. Purpose
- Ensures the verified character-progress RPC is callable only by signed-in students.

2. Security
- Revokes EXECUTE on `public.record_char_progress(uuid, jsonb)` from the anonymous role.
- Keeps EXECUTE granted to the authenticated role.
- Does not change tables, columns, or row-level security policies.
*/

REVOKE EXECUTE ON FUNCTION public.record_char_progress(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_char_progress(uuid, jsonb) TO authenticated;
