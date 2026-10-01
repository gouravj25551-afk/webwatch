CREATE TABLE user_alert_integrations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  slack_webhook_ciphertext TEXT,
  slack_webhook_iv TEXT,
  slack_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
