-- Brief wake-ups linked to sleep entries
CREATE TABLE IF NOT EXISTS wake_ups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sleep_entry_id INTEGER REFERENCES sleep_entries(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
