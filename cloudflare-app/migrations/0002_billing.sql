CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dodo_payment_id TEXT UNIQUE,
  dodo_session_id TEXT UNIQUE,
  dodo_subscription_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL DEFAULT 100,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX payments_user_time ON payments(user_id, created_at DESC);
