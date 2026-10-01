ALTER TABLE monitors ADD COLUMN alert_email TEXT;
ALTER TABLE monitors ADD COLUMN alert_email_verified_at TEXT;
ALTER TABLE monitors ADD COLUMN alert_on_down INTEGER NOT NULL DEFAULT 1;
ALTER TABLE monitors ADD COLUMN alert_on_recovery INTEGER NOT NULL DEFAULT 1;

CREATE TABLE monitor_alert_tokens (
  token_hash TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX monitor_alert_tokens_monitor ON monitor_alert_tokens(monitor_id);
