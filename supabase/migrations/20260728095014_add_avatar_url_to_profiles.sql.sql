/*
# Add avatar_url column to profiles

1. Modified Tables
- `profiles`: adds `avatar_url` (text, nullable) to store an optional profile
  picture image URL. When null, the app falls back to the existing
  `avatar_emoji` field, so no existing user loses their current avatar.
2. Security
- No RLS policy changes. The existing owner-scoped CRUD policies on
  `profiles` already cover the new column because they are row-level
  (auth.uid() = id), not column-level.
3. Important Notes
- Non-destructive: additive column only, no data is dropped or rewritten.
- Idempotent: guarded with IF NOT EXISTS so re-running is safe.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
END $$;
