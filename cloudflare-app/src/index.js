import DodoPayments from 'dodopayments';

const encoder = new TextEncoder();
const DAY = 86_400_000;
const FREE_MONITOR_LIMIT = 1;
// Cloudflare Workers supports PBKDF2 iteration counts up to 100,000.
const PASSWORD_ITERATIONS = 100_000;

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const error = (message, status = 400) => json({ success: false, message }, status);

function dodoClient(env) {
  if (!env.DODO_PAYMENTS_API_KEY) return null;
  return new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY || null,
    environment: env.DODO_PAYMENTS_MODE === 'live_mode' ? 'live_mode' : 'test_mode',
  });
}

function paymentData(event) {
  return event?.data || event || {};
}

async function fulfillDodoPayment(env, event) {
  const data = paymentData(event);
  const metadata = data.metadata || {};
  const paymentId = String(metadata.paymentId || '');
  if (!paymentId || String(metadata.type || '') !== 'SITE_MONITOR_SLOT') return;
  const quantity = Math.max(1, Math.floor(Number(metadata.quantity) || 1));
  const payment = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first();
  if (!payment || payment.user_id !== String(metadata.userId || '') || payment.status === 'SUCCESS') return;
  const updatedAt = now();
  const result = await env.DB.prepare("UPDATE payments SET status = 'SUCCESS', dodo_payment_id = ?, dodo_subscription_id = COALESCE(?, dodo_subscription_id), updated_at = ? WHERE id = ? AND status = 'PENDING'")
    .bind(data.payment_id || null, data.subscription_id || null, updatedAt, paymentId).run();
  if (!result.meta.changes) return;
  await env.DB.prepare('UPDATE users SET paid_monitors_count = paid_monitors_count + ?, updated_at = ? WHERE id = ?').bind(quantity, updatedAt, payment.user_id).run();
}

async function handleDodoWebhook(request, env) {
  if (!env.DODO_PAYMENTS_WEBHOOK_KEY) return error('Dodo webhook signing key is not configured', 503);
  const rawBody = await request.text();
  let event;
  try {
    event = dodoClient(env).webhooks.unwrap(rawBody, {
      headers: {
        'webhook-id': request.headers.get('webhook-id') || '',
        'webhook-signature': request.headers.get('webhook-signature') || '',
        'webhook-timestamp': request.headers.get('webhook-timestamp') || '',
      },
      key: env.DODO_PAYMENTS_WEBHOOK_KEY,
    });
  } catch {
    return error('Invalid webhook signature', 401);
  }
  if (event?.type === 'payment.succeeded') await fulfillDodoPayment(env, event);
  return json({ received: true });
}

function cors(request, env) {
  const origin = request.headers.get('origin');
  const allowed = env.CLIENT_ORIGIN;
  return origin && origin === allowed ? {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type, x-csrf-token',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    vary: 'Origin',
  } : {};
}

function cookieValue(request, name) {
  const value = request.headers.get('cookie') || '';
  return value.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}
async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}
async function integrationKey(env) {
  if (!env.INTEGRATION_ENCRYPTION_KEY) throw new Error('Alert integrations are not configured');
  return crypto.subtle.importKey('raw', base64UrlToBytes(env.INTEGRATION_ENCRYPTION_KEY), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encryptIntegration(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await integrationKey(env), encoder.encode(value));
  return { ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)), iv: bytesToBase64Url(iv) };
}
async function decryptIntegration(ciphertext, iv, env) {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlToBytes(iv) }, await integrationKey(env), base64UrlToBytes(ciphertext));
  return new TextDecoder().decode(plaintext);
}
async function slackOAuthState(userId, env) {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ userId, exp: Date.now() + 10 * 60_000, nonce: id() })));
  return `${payload}.${await hmac(payload, env.JWT_SECRET)}`;
}
async function slackOAuthUser(state, env) {
  const [payload, signature] = String(state || '').split('.');
  if (!payload || !signature || signature !== await hmac(payload, env.JWT_SECRET)) return null;
  try { const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))); return data.exp > Date.now() && typeof data.userId === 'string' ? data.userId : null; } catch { return null; }
}
async function sessionFor(user, env) {
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ sub: user.id, sv: user.session_version, exp: Math.floor(Date.now() / 1000) + 604800 })));
  return `${header}.${payload}.${await hmac(`${header}.${payload}`, env.JWT_SECRET)}`;
}
async function currentUser(request, env) {
  const token = cookieValue(request, env.COOKIE_NAME || 'webwatch_token');
  if (!token || !env.JWT_SECRET) return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature || signature !== await hmac(`${header}.${payload}`, env.JWT_SECRET)) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (claims.exp <= Date.now() / 1000) return null;
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(claims.sub).first();
    return user && user.session_version === claims.sv ? user : null;
  } catch { return null; }
}
async function passwordHash(password, salt = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16))), iterations = PASSWORD_ITERATIONS, pepper = '') {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pepper ? `${pepper}:${password}` : password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: base64UrlToBytes(salt), iterations }, key, 256);
  return { salt, hash: bytesToBase64Url(new Uint8Array(bits)), iterations };
}
async function passwordMatches(password, user, env) {
  const pepper = Number(user.password_pepper_version || 0) > 0 ? env.PASSWORD_PEPPER : '';
  const computed = await passwordHash(password, user.password_salt, Number(user.password_iterations || 100000), pepper);
  return computed.hash === user.password_hash;
}
function publicUser(user) { return { id: user.id, email: user.email, emailVerified: Boolean(user.email_verified_at), createdAt: user.created_at }; }
function publicIncident(incident) {
  return incident && { id: incident.id, monitorId: incident.monitor_id, startedAt: incident.started_at, resolvedAt: incident.resolved_at, startReason: incident.start_reason, notifications: [] };
}
function publicMonitor(monitor) {
  return {
    id: monitor.id, name: monitor.name, url: monitor.url, alertEmail: monitor.alert_email || monitor.email,
    alertEmailVerified: Boolean(monitor.alert_email_verified_at), alertOnDown: Boolean(monitor.alert_on_down), alertOnRecovery: Boolean(monitor.alert_on_recovery),
    intervalMinutes: monitor.interval_minutes, enabled: Boolean(monitor.enabled), status: monitor.status,
    lastCheckedAt: monitor.last_checked_at, lastStatusCode: monitor.last_status_code,
    lastResponseTimeMs: monitor.last_response_time_ms, lastError: monitor.last_error,
    consecutiveFailures: monitor.consecutive_failures, createdAt: monitor.created_at, updatedAt: monitor.updated_at,
  };
}
function publicCheck(check) {
  return { id: check.id, monitorId: check.monitor_id, isUp: Boolean(check.is_up), statusCode: check.status_code, responseTimeMs: check.response_time_ms, error: check.error, attempts: check.attempts, checkedAt: check.checked_at };
}
function setSession(response, token, env) {
  const csrf = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  response.headers.append('set-cookie', `${env.COOKIE_NAME || 'webwatch_token'}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
  response.headers.append('set-cookie', `webwatch_csrf=${csrf}; Path=/; Secure; SameSite=Strict; Max-Age=604800`);
  return response;
}
function clearSession(response, env) {
  response.headers.append('set-cookie', `${env.COOKIE_NAME || 'webwatch_token'}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  response.headers.append('set-cookie', 'webwatch_csrf=; Path=/; Secure; SameSite=Strict; Max-Age=0');
  return response;
}
function clientIp(request) { return request.headers.get('cf-connecting-ip') || 'unknown'; }
function sameOrigin(request, env) { return request.headers.get('origin') === env.CLIENT_ORIGIN; }
function csrfValid(request) { const token = cookieValue(request, 'webwatch_csrf'); return Boolean(token && request.headers.get('x-csrf-token') === token); }
async function tokenHash(value, env) { return hmac(value, env.JWT_SECRET); }
async function createAuthToken(env, user, type) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const createdAt = now(); const expiresAt = new Date(Date.now() + (type === 'verify_email' ? DAY : 60 * 60_000)).toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_tokens WHERE user_id = ? AND type = ?').bind(user.id, type),
    env.DB.prepare('INSERT INTO auth_tokens (token_hash, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)').bind(await tokenHash(token, env), user.id, type, expiresAt, createdAt),
  ]);
  return token;
}
async function consumeAuthToken(env, token, type) {
  const hash = await tokenHash(String(token || ''), env);
  const record = await env.DB.prepare('SELECT * FROM auth_tokens WHERE token_hash = ? AND type = ?').bind(hash, type).first();
  if (!record || record.expires_at <= now()) { if (record) await env.DB.prepare('DELETE FROM auth_tokens WHERE token_hash = ?').bind(hash).run(); return null; }
  await env.DB.prepare('DELETE FROM auth_tokens WHERE token_hash = ?').bind(hash).run();
  return record;
}
async function sendAccountEmail(env, recipient, subject, html) {
  if (!env.RESEND_API_KEY || !env.ALERT_FROM) throw new Error('Account email is not configured');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.ALERT_FROM, to: [recipient], subject, html }) });
  if (!response.ok) throw new Error('Could not send account email');
}
async function sendVerificationEmail(env, user) {
  const token = await createAuthToken(env, user, 'verify_email'); const link = `${env.CLIENT_ORIGIN}/?verify=${encodeURIComponent(token)}`;
  await sendAccountEmail(env, user.email, 'Verify your WebWatch email', `<h2>Verify your email</h2><p>Open this link to activate your WebWatch account:</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`);
}
async function sendPasswordResetEmail(env, user) {
  const token = await createAuthToken(env, user, 'reset_password'); const link = `${env.CLIENT_ORIGIN}/?reset=${encodeURIComponent(token)}`;
  await sendAccountEmail(env, user.email, 'Reset your WebWatch password', `<h2>Reset your password</h2><p>Open this link to choose a new password:</p><p><a href="${link}">Reset password</a></p><p>This link expires in one hour. If you did not ask for this, ignore this email.</p>`);
}
async function sendAlertVerificationEmail(env, monitor, recipient) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const createdAt = now(); const expiresAt = new Date(Date.now() + DAY).toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM monitor_alert_tokens WHERE monitor_id = ?').bind(monitor.id),
    env.DB.prepare('INSERT INTO monitor_alert_tokens (token_hash, monitor_id, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?)').bind(await tokenHash(token, env), monitor.id, recipient, expiresAt, createdAt),
  ]);
  const link = `${env.CLIENT_ORIGIN}/?verify-alert=${encodeURIComponent(token)}`;
  await sendAccountEmail(env, recipient, 'Confirm your WebWatch alert email', `<h2>Confirm alert email</h2><p>Use this link to receive WebWatch alerts for <strong>${monitor.name.replace(/[<>]/g, '')}</strong>.</p><p><a href="${link}">Confirm alert email</a></p><p>This link expires in 24 hours.</p>`);
}
function validSlackWebhook(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' && url.hostname === 'hooks.slack.com' && /^\/services\/[^/]+\/[^/]+\/[^/]+$/.test(url.pathname) ? url.toString() : null;
  } catch { return null; }
}
async function slackWebhooksForUser(env, userId) {
  // Slack is deliberately held for the paid plan during the launch period.
  // This check also prevents an old saved connection from receiving alerts.
  if (env.BILLING_ENABLED !== 'true') return [];
  const hooks = env.SLACK_WEBHOOK_URL ? [env.SLACK_WEBHOOK_URL] : [];
  const integration = await env.DB.prepare('SELECT slack_webhook_ciphertext, slack_webhook_iv, slack_enabled FROM user_alert_integrations WHERE user_id = ?').bind(userId).first();
  if (integration?.slack_enabled && integration.slack_webhook_ciphertext && integration.slack_webhook_iv) {
    try {
      const webhook = await decryptIntegration(integration.slack_webhook_ciphertext, integration.slack_webhook_iv, env);
      if (validSlackWebhook(webhook)) hooks.push(webhook);
    } catch { /* A bad integration must not prevent email alerts. */ }
  }
  return [...new Set(hooks)];
}
async function sendSlackMessage(webhooks, text) {
  await Promise.allSettled(webhooks.map((webhook) => fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, unfurl_links: false, unfurl_media: false }) })));
}
async function enforceRateLimit(env, scope, subject, limit, windowMs) {
  const existing = await env.DB.prepare('SELECT window_started_at, attempts FROM auth_rate_limits WHERE scope = ? AND subject = ?').bind(scope, subject).first();
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  if (!existing || existing.window_started_at < cutoff) {
    await env.DB.prepare('INSERT INTO auth_rate_limits (scope, subject, window_started_at, attempts) VALUES (?, ?, ?, 1) ON CONFLICT(scope, subject) DO UPDATE SET window_started_at = excluded.window_started_at, attempts = 1').bind(scope, subject, now()).run();
    return true;
  }
  if (existing.attempts >= limit) return false;
  await env.DB.prepare('UPDATE auth_rate_limits SET attempts = attempts + 1 WHERE scope = ? AND subject = ?').bind(scope, subject).run();
  return true;
}
function validUrl(value) {
  let parsed;
  try { parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(String(value || '')) ? value : `https://${value}`); } catch { return null; }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host) || host === '::1') return null;
  return parsed;
}
function monitorFetchError(caught) {
  if (caught?.name === 'TimeoutError') return 'Request timed out after 5 seconds';
  const message = String(caught?.message || '').toLowerCase();
  if (/certificate|tls|ssl/.test(message)) return 'TLS/SSL certificate or secure-connection error';
  if (/dns|hostname|name.*resolv|could not resolve/.test(message)) return 'DNS lookup failed';
  if (/refused|connection|connect/.test(message)) return 'Connection to the website failed';
  return 'Network request failed';
}
async function checkUrl(url, attempts = 3) {
  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000), headers: { 'user-agent': 'WebWatch/1.0 uptime-monitor' } });
      const isUp = response.status >= 200 && response.status < 400;
      result = { isUp, statusCode: response.status, responseTimeMs: Date.now() - started, error: isUp ? null : `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`, attempts: attempt };
    } catch (caught) { result = { isUp: false, statusCode: null, responseTimeMs: Date.now() - started, error: monitorFetchError(caught), attempts: attempt }; }
    if (result.isUp) return result;
  }
  return result;
}
async function sendAlert(env, monitor, type, result, incidentStartedAt) {
  if (!monitor.alert_email_verified_at || (type === 'down' && !monitor.alert_on_down) || (type === 'recovery' && !monitor.alert_on_recovery)) return;
  const isTest = type === 'test';
  const recovered = type === 'recovery';
  const site = String(monitor.name || new URL(monitor.url).hostname).replace(/[<>]/g, '');
  const reason = result.error || `HTTP ${result.statusCode}`;
  const subject = isTest ? `WebWatch test alert: ${site}` : recovered ? `WebWatch: ${site} is responding again` : `WebWatch: ${site} needs attention`;
  const headline = isTest ? 'Your alerts are working' : recovered ? 'Your website is responding again' : 'Your website needs attention';
  const message = isTest ? `This is a test alert for ${site}. No incident was detected.` : recovered
    ? `WebWatch confirmed that ${site} is responding normally again.`
    : `WebWatch checked ${site} ${result.attempts} times and could not confirm that it is available.`;
  const detail = isTest ? `Sent at: ${now()}.` : recovered ? `Incident started: ${incidentStartedAt}.` : `Check result: ${reason}.`;
  const text = `${headline}\n\n${message}\n${detail}\n\nMonitored address: ${monitor.url}\n\nYou are receiving this because this address is the owner of this WebWatch monitor.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f8f6;font-family:Arial,sans-serif;color:#17231d"><div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #dce7df;border-radius:12px;overflow:hidden"><div style="padding:20px 24px;background:#10261c;color:#ffffff;font-size:18px;font-weight:700">WebWatch</div><div style="padding:28px 24px"><p style="margin:0 0 10px;color:${recovered ? '#08764f' : '#9b3a3a'};font-weight:700">${recovered ? 'RECOVERY CONFIRMED' : 'MONITORING ALERT'}</p><h1 style="font-size:22px;line-height:1.3;margin:0 0 14px">${headline}</h1><p style="line-height:1.55;margin:0 0 12px">${message}</p><p style="line-height:1.55;margin:0 0 18px"><strong>${recovered ? 'Details' : 'Check result'}:</strong> ${detail.replace(/[<>]/g, '')}</p><p style="margin:0;padding:12px;background:#f5f8f6;border-radius:8px;word-break:break-word"><a href="${monitor.url}" style="color:#08764f">${monitor.url}</a></p><p style="margin:22px 0 0;color:#637169;font-size:12px;line-height:1.5">You are receiving this because this address is the owner of this WebWatch monitor.</p></div></div></body></html>`;
  const jobs = [];
  if (env.RESEND_API_KEY && env.ALERT_FROM) jobs.push(fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.ALERT_FROM, to: [monitor.alert_email], subject, html, text }) }));
  const slackWebhooks = await slackWebhooksForUser(env, monitor.user_id);
  if (slackWebhooks.length) {
    const emoji = isTest ? ':test_tube:' : recovered ? ':white_check_mark:' : ':warning:';
    const status = isTest ? 'TEST ALERT' : recovered ? 'RECOVERY' : 'NEEDS ATTENTION';
    const slackText = `${emoji} *WebWatch ${status}*\n*${site}*\n${message}\n*${recovered ? 'Details' : 'Check result'}:* ${detail}\n<${monitor.url}|Open monitored website>`;
    jobs.push(sendSlackMessage(slackWebhooks, slackText));
  }
  await Promise.allSettled(jobs);
}
async function runMonitor(env, monitor) {
  const result = await checkUrl(monitor.url);
  const checkedAt = now();
  const activeIncident = await env.DB.prepare('SELECT id, started_at FROM incidents WHERE monitor_id = ? AND resolved_at IS NULL ORDER BY started_at DESC LIMIT 1').bind(monitor.id).first();
  const statements = [env.DB.prepare('INSERT INTO checks (id, monitor_id, is_up, status_code, response_time_ms, error, attempts, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id(), monitor.id, result.isUp ? 1 : 0, result.statusCode, result.responseTimeMs, result.error, result.attempts, checkedAt)];
  if (result.isUp) {
    if (activeIncident) { statements.push(env.DB.prepare('UPDATE incidents SET resolved_at = ? WHERE id = ?').bind(checkedAt, activeIncident.id)); }
    statements.push(env.DB.prepare("UPDATE monitors SET status = 'UP', last_checked_at = ?, last_status_code = ?, last_response_time_ms = ?, last_error = NULL, consecutive_failures = 0, updated_at = ? WHERE id = ?").bind(checkedAt, result.statusCode, result.responseTimeMs, checkedAt, monitor.id));
  } else {
    if (!activeIncident) { statements.push(env.DB.prepare('INSERT INTO incidents (id, monitor_id, started_at, start_reason) VALUES (?, ?, ?, ?)').bind(id(), monitor.id, checkedAt, result.error || `HTTP ${result.statusCode}`)); }
    statements.push(env.DB.prepare("UPDATE monitors SET status = 'DOWN', last_checked_at = ?, last_status_code = ?, last_response_time_ms = ?, last_error = ?, consecutive_failures = consecutive_failures + 1, updated_at = ? WHERE id = ?").bind(checkedAt, result.statusCode, result.responseTimeMs, result.error, checkedAt, monitor.id));
  }
  await env.DB.batch(statements);
  if (result.isUp && activeIncident) await sendAlert(env, monitor, 'recovery', result, activeIncident.started_at);
  if (!result.isUp && !activeIncident) await sendAlert(env, monitor, 'down', result, checkedAt);
  return (await env.DB.prepare('SELECT * FROM monitors WHERE id = ?').bind(monitor.id).first());
}
async function monitorWithStats(env, monitor) {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const stats = await env.DB.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(is_up), 0) AS successful FROM checks WHERE monitor_id = ? AND checked_at >= ?').bind(monitor.id, since).first();
  const activeIncident = await env.DB.prepare('SELECT * FROM incidents WHERE monitor_id = ? AND resolved_at IS NULL ORDER BY started_at DESC LIMIT 1').bind(monitor.id).first();
  return { ...publicMonitor(monitor), uptimePercentage: stats.total ? Number((stats.successful / stats.total * 100).toFixed(2)) : null, totalChecks: stats.total, activeIncident: publicIncident(activeIncident) };
}
async function api(request, env) {
  const url = new URL(request.url); const path = url.pathname;
  if (path === '/health' || path === '/api/health') return json({ success: true, message: 'WebWatch API is healthy', capabilities: { accountEmails: Boolean(env.RESEND_API_KEY), slackAlerts: env.BILLING_ENABLED === 'true' } });
  if (path === '/api/health/ready') return json({ success: true, ready: true, database: 'ok', scheduler: 'cloudflare-cron' });
  if (path === '/api/webhooks/dodo' && request.method === 'POST') return handleDodoWebhook(request, env);
  if (path === '/api/integrations/slack/callback' && request.method === 'GET') {
    const userId = await slackOAuthUser(url.searchParams.get('state'), env);
    const returnUrl = new URL(env.CLIENT_ORIGIN);
    if (!userId || url.searchParams.get('error') || !env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) { returnUrl.searchParams.set('slack', 'error'); return Response.redirect(returnUrl.toString(), 302); }
    const redirectUri = `${env.CLIENT_ORIGIN}/api/integrations/slack/callback`;
    const credentials = btoa(`${env.SLACK_CLIENT_ID}:${env.SLACK_CLIENT_SECRET}`);
    const response = await fetch('https://slack.com/api/oauth.v2.access', { method: 'POST', headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: url.searchParams.get('code') || '', redirect_uri: redirectUri }) });
    const data = await response.json().catch(() => ({})); const webhook = validSlackWebhook(data?.incoming_webhook?.url);
    if (!response.ok || !data.ok || !webhook) { returnUrl.searchParams.set('slack', 'error'); return Response.redirect(returnUrl.toString(), 302); }
    try {
      const encrypted = await encryptIntegration(webhook, env); const updatedAt = now();
      await env.DB.prepare('INSERT INTO user_alert_integrations (user_id, slack_webhook_ciphertext, slack_webhook_iv, slack_enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(user_id) DO UPDATE SET slack_webhook_ciphertext = excluded.slack_webhook_ciphertext, slack_webhook_iv = excluded.slack_webhook_iv, slack_enabled = 1, updated_at = excluded.updated_at').bind(userId, encrypted.ciphertext, encrypted.iv, updatedAt, updatedAt).run();
      returnUrl.searchParams.set('slack', 'connected');
    } catch { returnUrl.searchParams.set('slack', 'error'); }
    return Response.redirect(returnUrl.toString(), 302);
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !sameOrigin(request, env)) return error('Invalid request origin', 403);
  if (path === '/api/check' && request.method === 'POST') { const body = await request.json(); const target = validUrl(body.url); return target ? json({ success: true, ...(await checkUrl(target.toString(), 1)) }) : error('Enter a public HTTP or HTTPS URL'); }
  if (path === '/api/auth/register' && request.method === 'POST') {
    const { email: inputEmail, password } = await request.json(); const email = String(inputEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Enter a valid email address');
    if (typeof password !== 'string' || password.length < 10 || password.length > 72) return error('Password must be 10 to 72 characters');
    if (!await enforceRateLimit(env, 'register_ip', clientIp(request), 5, 60 * 60_000)) return error('Too many attempts. Try again later.', 429);
    const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      if (!existing.email_verified_at) { await sendVerificationEmail(env, existing); return json({ success: true, verificationRequired: true, message: 'You have already signed up. Check your email for the verification link.' }); }
      return error('You have already signed up. Please log in instead.', 409);
    }
    if (!env.PASSWORD_PEPPER) return error('Account setup is temporarily unavailable. Please try again shortly.', 503);
    const passwordData = await passwordHash(password, undefined, PASSWORD_ITERATIONS, env.PASSWORD_PEPPER); const createdAt = now(); const user = { id: id(), email, password_hash: passwordData.hash, password_salt: passwordData.salt, password_iterations: passwordData.iterations, password_pepper_version: 1, session_version: 0, created_at: createdAt, updated_at: createdAt };
    await env.DB.prepare('INSERT INTO users (id, email, password_hash, password_salt, password_iterations, password_pepper_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(user.id, user.email, user.password_hash, user.password_salt, user.password_iterations, user.password_pepper_version, user.created_at, user.updated_at).run();
    try { await sendVerificationEmail(env, user); } catch { await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run(); return error('Could not send verification email. Please try again.', 503); }
    return json({ success: true, verificationRequired: true, message: 'Check your email for a verification link.' }, 201);
  }
  if (path === '/api/auth/login' && request.method === 'POST') {
    const { email: inputEmail, password } = await request.json(); const email = String(inputEmail || '').trim().toLowerCase();
    if (!await enforceRateLimit(env, 'login_ip', clientIp(request), 8, 15 * 60_000) || !await enforceRateLimit(env, 'login_email', email, 8, 15 * 60_000)) return error('Too many attempts. Try again in 15 minutes.', 429);
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (!user || typeof password !== 'string' || !(await passwordMatches(password, user, env))) return error('Invalid email or password', 401);
    if (!user.email_verified_at) { await sendVerificationEmail(env, user); return json({ success: true, verificationRequired: true, message: 'Check your email for a verification link.' }); }
    if (Number(user.password_iterations || 100000) < PASSWORD_ITERATIONS || Number(user.password_pepper_version || 0) === 0) { const upgraded = await passwordHash(password, undefined, PASSWORD_ITERATIONS, env.PASSWORD_PEPPER); await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, password_pepper_version = 1, updated_at = ? WHERE id = ?').bind(upgraded.hash, upgraded.salt, upgraded.iterations, now(), user.id).run(); user.password_hash = upgraded.hash; user.password_salt = upgraded.salt; user.password_iterations = upgraded.iterations; user.password_pepper_version = 1; }
    return setSession(json({ success: true, user: publicUser(user) }), await sessionFor(user, env), env);
  }
  if (path === '/api/auth/verify-email' && request.method === 'POST') {
    const { token } = await request.json(); const record = await consumeAuthToken(env, token, 'verify_email'); if (!record) return error('This verification link is invalid or expired.', 400);
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(record.user_id).first(); if (!user) return error('This verification link is invalid or expired.', 400);
    const verifiedAt = now(); await env.DB.prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?').bind(verifiedAt, verifiedAt, user.id).run(); user.email_verified_at = verifiedAt;
    return setSession(json({ success: true, message: 'Email verified. Welcome to WebWatch!', user: publicUser(user) }), await sessionFor(user, env), env);
  }
  if (path === '/api/monitors/verify-alert-email' && request.method === 'POST') {
    const { token } = await request.json(); const hash = await tokenHash(String(token || ''), env);
    const record = await env.DB.prepare('SELECT * FROM monitor_alert_tokens WHERE token_hash = ?').bind(hash).first();
    if (!record || record.expires_at <= now()) { if (record) await env.DB.prepare('DELETE FROM monitor_alert_tokens WHERE token_hash = ?').bind(hash).run(); return error('This alert-email link is invalid or expired.', 400); }
    const monitor = await env.DB.prepare('SELECT m.*, u.email FROM monitors m JOIN users u ON u.id = m.user_id WHERE m.id = ?').bind(record.monitor_id).first();
    if (!monitor || monitor.alert_email !== record.email) return error('This alert-email link is invalid or expired.', 400);
    const verifiedAt = now(); await env.DB.batch([
      env.DB.prepare('UPDATE monitors SET alert_email_verified_at = ?, updated_at = ? WHERE id = ?').bind(verifiedAt, verifiedAt, monitor.id),
      env.DB.prepare('DELETE FROM monitor_alert_tokens WHERE token_hash = ?').bind(hash),
    ]);
    monitor.alert_email_verified_at = verifiedAt;
    await runMonitor(env, monitor);
    return json({ success: true, message: 'Alert email confirmed. Monitoring is now active.' });
  }
  if (path === '/api/auth/forgot-password' && request.method === 'POST') {
    const { email: inputEmail } = await request.json(); const email = String(inputEmail || '').trim().toLowerCase();
    if (!await enforceRateLimit(env, 'forgot_ip', clientIp(request), 5, 60 * 60_000) || !await enforceRateLimit(env, 'forgot_email', email, 3, 60 * 60_000)) return error('Too many reset requests. Please try again later.', 429);
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (!user) return error('No account exists for this email. Create an account first.', 404);
    if (!user.email_verified_at) { await sendVerificationEmail(env, user); return json({ success: true, verificationRequired: true, message: 'Your account needs email verification first. We sent a new verification link.' }); }
    try { await sendPasswordResetEmail(env, user); } catch { return error('Could not send the reset email. Please try again.', 503); }
    return json({ success: true, message: 'A password-reset link has been sent to your email.' });
  }
  if (path === '/api/auth/reset-password' && request.method === 'POST') {
    const { token, password } = await request.json(); if (typeof password !== 'string' || password.length < 10 || password.length > 72) return error('Password must be 10 to 72 characters');
    if (!await enforceRateLimit(env, 'reset_ip', clientIp(request), 10, 60 * 60_000)) return error('Too many attempts. Try again later.', 429);
    const record = await consumeAuthToken(env, token, 'reset_password'); if (!record) return error('This reset link is invalid or expired.', 400);
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(record.user_id).first(); if (!user) return error('This reset link is invalid or expired.', 400);
    if (!env.PASSWORD_PEPPER) return error('Account setup is temporarily unavailable. Please try again shortly.', 503);
    const passwordData = await passwordHash(password, undefined, PASSWORD_ITERATIONS, env.PASSWORD_PEPPER); const updatedAt = now(); await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, password_pepper_version = 1, session_version = session_version + 1, updated_at = ? WHERE id = ?').bind(passwordData.hash, passwordData.salt, passwordData.iterations, updatedAt, user.id).run();
    user.password_hash = passwordData.hash; user.password_salt = passwordData.salt; user.password_iterations = passwordData.iterations; user.password_pepper_version = 1; user.session_version += 1;
    return setSession(json({ success: true, message: 'Password updated.', user: publicUser(user) }), await sessionFor(user, env), env);
  }
  const user = await currentUser(request, env);
  if (path === '/api/auth/me') return user ? json({ success: true, user: publicUser(user) }) : error('Authentication required', 401);
  if (!user) return error('Authentication required', 401);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !csrfValid(request)) return error('Invalid security token. Refresh the page and try again.', 403);
  if (path === '/api/auth/logout' && request.method === 'POST') return clearSession(json({ success: true }), env);
  if (path === '/api/billing/summary') {
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM monitors WHERE user_id = ?').bind(user.id).first();
    const paid = await env.DB.prepare('SELECT paid_monitors_count FROM users WHERE id = ?').bind(user.id).first();
    const { results: payments } = await env.DB.prepare('SELECT id, quantity, amount, currency, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(user.id).all();
    const billingEnabled = env.BILLING_ENABLED === 'true';
    const monitorLimit = billingEnabled ? Number(paid?.paid_monitors_count || 0) : FREE_MONITOR_LIMIT;
    return json({ success: true, billingEnabled, monitorLimit, freeMonitorLimit: FREE_MONITOR_LIMIT, paidMonitorsCount: Number(paid?.paid_monitors_count || 0), activeMonitorsCount: count.count, availableSlots: Math.max(0, monitorLimit - count.count), pricePerSiteUsd: 1, payments: payments.map((payment) => ({ id: payment.id, quantity: payment.quantity, amount: payment.amount, currency: payment.currency, status: payment.status, createdAt: payment.created_at })) });
  }
  if (path === '/api/billing/create-checkout' && request.method === 'POST') {
    if (env.BILLING_ENABLED !== 'true' || !env.DODO_PAYMENTS_PRODUCT_ID || !dodoClient(env)) return error('Billing is not configured yet.', 503);
    const body = await request.json().catch(() => ({}));
    const quantity = Math.floor(Number(body.quantity || 1));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 25) return error('Choose between 1 and 25 site slots.');
    const createdAt = now(); const paymentId = id();
    await env.DB.prepare('INSERT INTO payments (id, user_id, quantity, amount, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(paymentId, user.id, quantity, quantity * 100, 'USD', 'PENDING', createdAt, createdAt).run();
    try {
      const session = await dodoClient(env).checkoutSessions.create({
        product_cart: [{ product_id: env.DODO_PAYMENTS_PRODUCT_ID, quantity }],
        customer: { email: user.email, name: user.email.split('@')[0] },
        metadata: { userId: user.id, paymentId, quantity: String(quantity), type: 'SITE_MONITOR_SLOT' },
        return_url: `${env.CLIENT_ORIGIN}/?payment=return&payment_id=${paymentId}`,
      });
      if (!session?.session_id || !session?.checkout_url) throw new Error('Dodo did not return checkout details');
      await env.DB.prepare('UPDATE payments SET dodo_session_id = ?, updated_at = ? WHERE id = ?').bind(session.session_id, now(), paymentId).run();
      return json({ success: true, checkoutUrl: session.checkout_url, paymentId, isTest: env.DODO_PAYMENTS_MODE !== 'live_mode' });
    } catch (caught) {
      await env.DB.prepare("UPDATE payments SET status = 'FAILED', updated_at = ? WHERE id = ?").bind(now(), paymentId).run();
      console.error('Dodo checkout error', caught?.message || caught);
      return error('Could not start Dodo checkout. Please try again.', 502);
    }
  }
  if (path === '/api/billing/verify-session' && request.method === 'POST') {
    const body = await request.json().catch(() => ({})); const paymentId = String(body.paymentId || '');
    const payment = paymentId && await env.DB.prepare('SELECT status FROM payments WHERE id = ? AND user_id = ?').bind(paymentId, user.id).first();
    const paid = await env.DB.prepare('SELECT paid_monitors_count FROM users WHERE id = ?').bind(user.id).first();
    return json({ success: true, paymentStatus: payment?.status || null, fulfilled: payment?.status === 'SUCCESS', paidMonitorsCount: Number(paid?.paid_monitors_count || 0), availableSlots: 0 });
  }
  if (path === '/api/integrations' && request.method === 'GET') {
    const integration = await env.DB.prepare('SELECT slack_webhook_ciphertext, slack_enabled, updated_at FROM user_alert_integrations WHERE user_id = ?').bind(user.id).first();
    return json({ success: true, slack: { available: env.BILLING_ENABLED === 'true', configured: Boolean(integration?.slack_webhook_ciphertext), enabled: Boolean(integration?.slack_enabled) && env.BILLING_ENABLED === 'true', updatedAt: integration?.updated_at || null } });
  }
  if (path === '/api/integrations/slack/connect' && request.method === 'GET') {
    if (env.BILLING_ENABLED !== 'true') return error('Slack alerts are part of the upcoming paid plan.', 403);
    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) return error('Slack connection is not configured yet.', 503);
    const redirectUri = `${env.CLIENT_ORIGIN}/api/integrations/slack/callback`;
    const authorizeUrl = new URL('https://slack.com/oauth/v2/authorize');
    authorizeUrl.searchParams.set('client_id', env.SLACK_CLIENT_ID);
    authorizeUrl.searchParams.set('scope', 'incoming-webhook');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', await slackOAuthState(user.id, env));
    return json({ success: true, authorizeUrl: authorizeUrl.toString() });
  }
  if (path === '/api/integrations/slack' && request.method === 'PUT') {
    if (env.BILLING_ENABLED !== 'true') return error('Slack alerts are part of the upcoming paid plan.', 403);
    const body = await request.json().catch(() => ({})); const webhook = validSlackWebhook(body.webhookUrl);
    if (!webhook) return error('Paste a valid Slack Incoming Webhook URL.');
    let encrypted;
    try { encrypted = await encryptIntegration(webhook, env); } catch { return error('Slack integrations are temporarily unavailable. Try again shortly.', 503); }
    const updatedAt = now();
    await env.DB.prepare('INSERT INTO user_alert_integrations (user_id, slack_webhook_ciphertext, slack_webhook_iv, slack_enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(user_id) DO UPDATE SET slack_webhook_ciphertext = excluded.slack_webhook_ciphertext, slack_webhook_iv = excluded.slack_webhook_iv, slack_enabled = 1, updated_at = excluded.updated_at').bind(user.id, encrypted.ciphertext, encrypted.iv, updatedAt, updatedAt).run();
    return json({ success: true, slack: { configured: true, enabled: true, updatedAt } });
  }
  if (path === '/api/integrations/slack' && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM user_alert_integrations WHERE user_id = ?').bind(user.id).run();
    return json({ success: true });
  }
  if (path === '/api/monitors' && request.method === 'GET') { const { results } = await env.DB.prepare('SELECT m.*, u.email FROM monitors m JOIN users u ON u.id = m.user_id WHERE m.user_id = ? ORDER BY m.created_at DESC').bind(user.id).all(); return json({ success: true, monitors: await Promise.all(results.map((item) => monitorWithStats(env, item))) }); }
  if (path === '/api/monitors' && request.method === 'POST') {
    const body = await request.json(); const target = validUrl(body.url); if (!target) return error('Enter a public HTTP or HTTPS URL');
    const own = await env.DB.prepare('SELECT COUNT(*) AS count FROM monitors WHERE user_id = ?').bind(user.id).first();
    const entitlement = await env.DB.prepare('SELECT paid_monitors_count FROM users WHERE id = ?').bind(user.id).first();
    const limit = Number(entitlement?.paid_monitors_count || 0);
    if (env.BILLING_ENABLED !== 'true' && own.count >= FREE_MONITOR_LIMIT) return json({ success: false, message: 'The free launch plan includes one website. The $1 plan with two websites and Slack alerts is coming soon.', planUnavailable: true }, 403);
    if (env.BILLING_ENABLED === 'true' && own.count >= limit) return json({ success: false, message: 'Buy a $1/month site slot before adding another monitor.', requiresPayment: true }, 402);
    const interval = Number(body.intervalMinutes || 5); if (![5, 10, 15].includes(interval)) return error('Interval must be 5, 10, or 15 minutes');
    const alertEmail = String(body.alertEmail || user.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) return error('Enter a valid alert email address');
    const createdAt = now(); const customRecipient = alertEmail !== user.email;
    const monitor = { id: id(), user_id: user.id, name: String(body.name || target.hostname).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 80) || target.hostname, url: target.toString(), interval_minutes: interval, enabled: 1, status: 'UNKNOWN', alert_email: alertEmail, alert_email_verified_at: customRecipient ? null : createdAt, alert_on_down: body.alertOnDown === false ? 0 : 1, alert_on_recovery: body.alertOnRecovery === false ? 0 : 1, created_at: createdAt, updated_at: createdAt, email: user.email };
    await env.DB.prepare('INSERT INTO monitors (id, user_id, name, url, interval_minutes, enabled, status, alert_email, alert_email_verified_at, alert_on_down, alert_on_recovery, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(monitor.id, monitor.user_id, monitor.name, monitor.url, monitor.interval_minutes, 1, monitor.status, monitor.alert_email, monitor.alert_email_verified_at, monitor.alert_on_down, monitor.alert_on_recovery, createdAt, createdAt).run();
    if (customRecipient) {
      try { await sendAlertVerificationEmail(env, monitor, alertEmail); } catch { await env.DB.prepare('DELETE FROM monitors WHERE id = ?').bind(monitor.id).run(); return error('Could not send the alert-email verification. Try again.', 503); }
      return json({ success: true, verificationRequired: true, message: 'Confirm the alert email before monitoring starts.', monitor: await monitorWithStats(env, monitor) }, 201);
    }
    return json({ success: true, monitor: await monitorWithStats(env, await runMonitor(env, monitor)) }, 201);
  }
  const testAlertMatch = path.match(/^\/api\/monitors\/([^/]+)\/test-alert$/);
  if (testAlertMatch && request.method === 'POST') {
    const monitor = await env.DB.prepare('SELECT m.*, u.email FROM monitors m JOIN users u ON u.id = m.user_id WHERE m.id = ? AND m.user_id = ?').bind(testAlertMatch[1], user.id).first();
    if (!monitor) return error('Monitor not found', 404);
    if (!monitor.alert_email_verified_at) return error('Confirm the alert email before sending a test alert.', 409);
    await sendAlert(env, monitor, 'test', { attempts: 1, error: null, statusCode: null }, null);
    return json({ success: true, message: env.BILLING_ENABLED === 'true' ? 'Test alert sent to your verified email and connected Slack channels.' : 'Test email alert sent to your verified email.' });
  }
  const match = path.match(/^\/api\/monitors\/([^/]+)(?:\/(check|history))?$/); if (!match) return error('Route not found', 404);
  const monitor = await env.DB.prepare('SELECT m.*, u.email FROM monitors m JOIN users u ON u.id = m.user_id WHERE m.id = ? AND m.user_id = ?').bind(match[1], user.id).first(); if (!monitor) return error('Monitor not found', 404);
  if (match[2] === 'check' && request.method === 'POST') return json({ success: true, monitor: await monitorWithStats(env, await runMonitor(env, monitor)) });
  if (match[2] === 'history' && request.method === 'GET') { const days = [1, 7, 30].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 7; const since = new Date(Date.now() - days * DAY).toISOString(); const checks = await env.DB.prepare('SELECT * FROM checks WHERE monitor_id = ? AND checked_at >= ? ORDER BY checked_at DESC LIMIT 500').bind(monitor.id, since).all(); const incidents = await env.DB.prepare('SELECT * FROM incidents WHERE monitor_id = ? AND started_at >= ? ORDER BY started_at DESC LIMIT 100').bind(monitor.id, since).all(); const up = checks.results.filter((check) => check.is_up).length; return json({ success: true, monitor: publicMonitor(monitor), checks: checks.results.map(publicCheck), incidents: incidents.results.map(publicIncident), uptimePercentage: checks.results.length ? Number((up / checks.results.length * 100).toFixed(2)) : null, days }); }
  if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM monitors WHERE id = ? AND user_id = ?').bind(monitor.id, user.id).run(); return json({ success: true }); }
  if (request.method === 'PATCH') { const body = await request.json(); const enabled = typeof body.enabled === 'boolean' ? body.enabled : Boolean(monitor.enabled); const interval = body.intervalMinutes === undefined ? monitor.interval_minutes : Number(body.intervalMinutes); if (![5, 10, 15].includes(interval)) return error('Interval must be 5, 10, or 15 minutes'); const target = body.url === undefined ? null : validUrl(body.url); if (body.url !== undefined && !target) return error('Enter a public HTTP or HTTPS URL'); const updatedAt = now(); await env.DB.prepare("UPDATE monitors SET name = ?, url = ?, interval_minutes = ?, enabled = ?, status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?").bind(typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : monitor.name, target?.toString() || monitor.url, interval, enabled ? 1 : 0, enabled ? 'UNKNOWN' : 'PAUSED', enabled ? null : monitor.last_checked_at, updatedAt, monitor.id).run(); return json({ success: true, monitor: await monitorWithStats(env, { ...(await env.DB.prepare('SELECT m.*, u.email FROM monitors m JOIN users u ON u.id=m.user_id WHERE m.id=?').bind(monitor.id).first()), enabled }) }); }
  return error('Route not found', 404);
}
async function runScheduled(env) {
  const { results } = await env.DB.prepare('SELECT m.*, u.email FROM monitors m JOIN users u ON u.id = m.user_id WHERE m.enabled = 1 AND m.alert_email_verified_at IS NOT NULL AND (m.last_checked_at IS NULL OR m.last_checked_at <= datetime(?, \'-\' || m.interval_minutes || \' minutes\')) ORDER BY m.last_checked_at ASC LIMIT 10').bind(now()).all();
  await Promise.allSettled(results.map((monitor) => runMonitor(env, monitor)));
}
export default {
  async fetch(request, env) {
    const headers = cors(request, env); if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    const rawResponse = !url.pathname.startsWith('/api/') && url.pathname !== '/health' ? await env.ASSETS.fetch(request) : await api(request, env);
    const response = new Response(rawResponse.body, rawResponse);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    response.headers.set('x-content-type-options', 'nosniff');
    response.headers.set('x-frame-options', 'DENY');
    response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
    return response;
  },
  async scheduled(controller, env, ctx) { ctx.waitUntil(runScheduled(env)); },
};
