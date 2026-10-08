/*
# Episodes table + sort_order on lessons

## Summary
- Creates an `episodes` table so episodes are editable from the admin panel (title, subtitle, sort_order) instead of hardcoded.
- Adds `sort_order` to the `lessons` table so vlog lessons can be drag-reordered.
- Seeds the episodes table with the existing hardcoded data.
*/

-- ── episodes table ──
CREATE TABLE IF NOT EXISTS episodes (
  id integer PRIMARY KEY,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  unlocked boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "episodes_select" ON episodes;
CREATE POLICY "episodes_select" ON episodes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "episodes_insert" ON episodes;
CREATE POLICY "episodes_insert" ON episodes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "episodes_update" ON episodes;
CREATE POLICY "episodes_update" ON episodes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "episodes_delete" ON episodes;
CREATE POLICY "episodes_delete" ON episodes FOR DELETE
  TO authenticated USING (true);

-- ── add sort_order to lessons ──
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- ── seed existing episodes ──
INSERT INTO episodes (id, title, subtitle, sort_order, unlocked) VALUES
  (1, 'Basics',     'Introduction to Chinese',   0, true),
  (2, 'Greetings',  'Common phrases',            1, false),
  (3, 'Numbers',    'Counting in Chinese',       2, false),
  (4, 'Family',     'Family members vocabulary', 3, false),
  (5, 'Food & Drink','Ordering at a restaurant', 4, false),
  (6, 'Travel',     'Getting around China',      5, false)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_episodes_sort ON episodes(sort_order);
