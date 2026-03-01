-- Feed table updates: add sub_type, amount_oz, amount_tsp, category columns
-- Repurpose type to be 'milk' or 'solid' (was bottle/breast/solid)

ALTER TABLE feed_entries ADD COLUMN sub_type TEXT DEFAULT '';
ALTER TABLE feed_entries ADD COLUMN amount_oz REAL DEFAULT 0;
ALTER TABLE feed_entries ADD COLUMN amount_tsp REAL DEFAULT 0;
ALTER TABLE feed_entries ADD COLUMN category TEXT DEFAULT '';
