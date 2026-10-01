ALTER TABLE users ADD COLUMN email_verified_at TEXT;
ALTER TABLE users ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 600000;

-- Accounts created before email verification was introduced remain usable.
UPDATE users SET email_verified_at = created_at, password_iterations = 100000 WHERE email_verified_at IS NULL;

CREATE TABLE auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('verify_email', 'reset_password')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX auth_tokens_user_type ON auth_tokens(user_id, type);

CREATE TABLE auth_rate_limits (
  scope TEXT NOT NULL,
  subject TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, subject)
);
