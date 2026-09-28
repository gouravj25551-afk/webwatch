const { Resend } = require('resend');
const config = require('../config');

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function singleLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function emailTemplate({ title, monitor, message, accent }) {
  const safeUrl = escapeHtml(monitor.url);
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102019">
      <div style="padding:20px 24px;background:#102019;color:white;border-radius:12px 12px 0 0">
        <strong>WebWatch</strong>
      </div>
      <div style="padding:28px 24px;border:1px solid #dce6e0;border-top:0;border-radius:0 0 12px 12px">
        <p style="margin:0 0 10px;color:${accent};font-weight:700">${escapeHtml(title)}</p>
        <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(monitor.name)}</h1>
        <p style="color:#607068">${escapeHtml(message)}</p>
        <p><a href="${safeUrl}">${safeUrl}</a></p>
      </div>
    </div>`;
}

function buildAlertPayload({ type, monitor, result, incident, recipient }) {
  const isRecovery = type === 'recovery';
  const monitorName = singleLine(monitor.name) || 'Website';
  const subject = isRecovery
    ? `Recovered: ${monitorName} is back online`
    : `Down: ${monitorName} is unreachable`;
  const message = isRecovery
    ? `The website recovered after an incident that started at ${incident.startedAt.toISOString()}. Current response time: ${result.responseTimeMs} ms.`
    : `WebWatch tried ${result.attempts} times and could not reach the website. ${result.error || `HTTP status ${result.statusCode}`}`;

  return {
    from: config.alertFrom,
    to: recipient,
    subject,
    html: emailTemplate({
      title: isRecovery ? 'Website recovered' : 'Downtime detected',
      monitor,
      message,
      accent: isRecovery ? '#08764f' : '#c34848',
    }),
  };
}

async function sendAlert({ type, monitor, result, incident, recipient }) {
  const payload = buildAlertPayload({ type, monitor, result, incident, recipient });

  if (!resend) {
    console.log(`[email preview] ${payload.subject} -> ${recipient}`);
    return { preview: true };
  }

  const { data, error } = await resend.emails.send(payload);

  if (error) throw new Error(`Resend email failed: ${error.message}`);
  return data;
}

module.exports = { buildAlertPayload, emailTemplate, escapeHtml, sendAlert, singleLine };
