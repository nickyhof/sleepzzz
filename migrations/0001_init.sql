-- SleepZzz Database Schema

CREATE TABLE IF NOT EXISTS sleep_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('nap', 'night')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes REAL NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feed_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('bottle', 'breast', 'solid')),
  time TEXT NOT NULL,
  amount_ml REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diaper_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('wet', 'dirty', 'both')),
  time TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sleep_start ON sleep_entries(start_time);
CREATE INDEX idx_feed_time ON feed_entries(time);
CREATE INDEX idx_diaper_time ON diaper_entries(time);
