PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 0,
  paid_monitors_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE monitors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 5,
  enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  last_checked_at TEXT,
  last_status_code INTEGER,
  last_response_time_ms INTEGER,
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX monitors_due ON monitors(enabled, last_checked_at);
CREATE INDEX monitors_owner ON monitors(user_id, created_at DESC);

CREATE TABLE checks (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  is_up INTEGER NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER NOT NULL,
  error TEXT,
  attempts INTEGER NOT NULL,
  checked_at TEXT NOT NULL
);
CREATE INDEX checks_monitor_time ON checks(monitor_id, checked_at DESC);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  resolved_at TEXT,
  start_reason TEXT
);
CREATE INDEX incidents_monitor_active ON incidents(monitor_id, resolved_at, started_at DESC);
