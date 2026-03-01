-- Remove CHECK constraint on feed_entries.type to allow 'milk' value
-- SQLite doesn't support ALTER CONSTRAINT, so we recreate the table

CREATE TABLE feed_entries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('milk', 'solid', 'bottle', 'breast')),
  time TEXT NOT NULL,
  amount_ml REAL DEFAULT 0,
  amount_oz REAL DEFAULT 0,
  amount_tsp REAL DEFAULT 0,
  sub_type TEXT DEFAULT '',
  category TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO feed_entries_new SELECT id, type, time, amount_ml, amount_oz, amount_tsp, sub_type, category, notes, created_at FROM feed_entries;
DROP TABLE feed_entries;
ALTER TABLE feed_entries_new RENAME TO feed_entries;
CREATE INDEX idx_feed_time ON feed_entries(time);
