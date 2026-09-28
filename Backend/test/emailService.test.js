const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAlertPayload, escapeHtml, singleLine } = require('../src/services/emailService');

test('escapes user-controlled content in alert email HTML', () => {
  const payload = buildAlertPayload({
    type: 'down',
    recipient: 'owner@example.com',
    monitor: {
      name: '<script>alert("x")</script>',
      url: 'https://example.com/?value=<unsafe>',
    },
    result: {
      attempts: 3,
      statusCode: null,
      error: '<img src=x onerror=alert(1)>',
    },
    incident: { startedAt: new Date('2026-09-28T00:00:00.000Z') },
  });

  assert.equal(payload.to, 'owner@example.com');
  assert.equal(payload.from.startsWith('WebWatch <'), true);
  assert.equal(payload.html.includes('<script>'), false);
  assert.equal(payload.html.includes('<img'), false);
  assert.match(payload.html, /&lt;script&gt;/);
  assert.match(payload.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('keeps alert subjects on one line', () => {
  assert.equal(singleLine('My site\r\nBcc: attacker@example.com'), 'My site Bcc: attacker@example.com');
});

test('escapes all HTML-sensitive characters', () => {
  assert.equal(escapeHtml(`<tag attr="x">Tom & Jerry's</tag>`), '&lt;tag attr=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/tag&gt;');
});
