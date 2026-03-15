-- Cache for AI-generated insights (single-row table, upserted by cron)
CREATE TABLE IF NOT EXISTS insights_cache (
  id INTEGER PRIMARY KEY DEFAULT 1,
  insights_text TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
