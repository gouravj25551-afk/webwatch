const { Resend } = require('resend');
const config = require('../config');

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

function emailTemplate({ title, monitor, message, accent }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102019">
      <div style="padding:20px 24px;background:#102019;color:white;border-radius:12px 12px 0 0">
        <strong>WebWatch</strong>
      </div>
      <div style="padding:28px 24px;border:1px solid #dce6e0;border-top:0;border-radius:0 0 12px 12px">
        <p style="margin:0 0 10px;color:${accent};font-weight:700">${title}</p>
        <h1 style="font-size:22px;margin:0 0 12px">${monitor.name}</h1>
        <p style="color:#607068">${message}</p>
        <p><a href="${monitor.url}">${monitor.url}</a></p>
      </div>
    </div>`;
}

async function sendAlert({ type, monitor, result, incident }) {
  const isRecovery = type === 'recovery';
  const subject = isRecovery
    ? `Recovered: ${monitor.name} is back online`
    : `Down: ${monitor.name} is unreachable`;
  const message = isRecovery
    ? `The website recovered after an incident that started at ${incident.startedAt.toISOString()}. Current response time: ${result.responseTimeMs} ms.`
    : `WebWatch tried ${result.attempts} times and could not reach the website. ${result.error || `HTTP status ${result.statusCode}`}`;

  if (!resend) {
    console.log(`[email preview] ${subject} -> ${monitor.alertEmail}`);
    return { preview: true };
  }

  const { data, error } = await resend.emails.send({
    from: config.alertFrom,
    to: monitor.alertEmail,
    subject,
    html: emailTemplate({
      title: isRecovery ? 'Website recovered' : 'Downtime detected',
      monitor,
      message,
      accent: isRecovery ? '#08764f' : '#c34848',
    }),
  });

  if (error) throw new Error(`Resend email failed: ${error.message}`);
  return data;
}

module.exports = { sendAlert };
