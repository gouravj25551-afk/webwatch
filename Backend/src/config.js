require('dotenv').config();

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const config = {
  port: numberFromEnv('PORT', 3001),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  cookieName: process.env.COOKIE_NAME || 'webwatch_token',
  jwtSecret: process.env.JWT_SECRET,
  checkIntervalMs: numberFromEnv('CHECK_INTERVAL_MS', 30_000),
  resendApiKey: process.env.RESEND_API_KEY || '',
  alertFrom: process.env.ALERT_FROM || 'WebWatch <onboarding@resend.dev>',
  cronSecret: process.env.CRON_SECRET || '',
  isProduction: process.env.NODE_ENV === 'production',
  dodoApiKey: process.env.DODO_PAYMENTS_API_KEY || '',
  dodoWebhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || '',
  dodoMode: process.env.DODO_PAYMENTS_MODE || 'test_mode',
  dodoProductId: process.env.DODO_PAYMENTS_PRODUCT_ID || '',
  billingEnabled: process.env.BILLING_ENABLED === 'true',
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  accountEmailsEnabled: process.env.ACCOUNT_EMAILS_ENABLED === 'true',
  schedulerConcurrency: numberFromEnv('SCHEDULER_CONCURRENCY', 10),
  checkRetentionDays: numberFromEnv('CHECK_RETENTION_DAYS', 30),
  notificationRetentionDays: numberFromEnv('NOTIFICATION_RETENTION_DAYS', 90),
  incidentRetentionDays: numberFromEnv('INCIDENT_RETENTION_DAYS', 365),
};

if (!config.jwtSecret || config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

if (config.billingEnabled && (!config.dodoApiKey || !config.dodoWebhookKey || !config.dodoProductId)) {
  throw new Error('Dodo API key, webhook key, and product ID are required when billing is enabled.');
}

if (config.requireEmailVerification && !config.accountEmailsEnabled) {
  throw new Error('ACCOUNT_EMAILS_ENABLED must be true when email verification is required.');
}

module.exports = config;
