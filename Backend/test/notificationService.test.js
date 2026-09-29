const test = require('node:test');
const assert = require('node:assert/strict');
const {
  deliverNotification,
  notificationData,
  retryDelayMs,
} = require('../src/services/notificationService');

function mockDb(notification) {
  const updates = [];
  return {
    updates,
    notification: {
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => notification,
      update: async (args) => {
        updates.push(args);
        return args;
      },
    },
  };
}

const baseNotification = {
  id: 'notification-1',
  attempts: 0,
  sender: 'WebWatch <alerts@example.com>',
  recipient: 'owner@example.com',
  subject: 'Down: example.com',
  html: '<p>Down</p>',
};

test('stores the exact alert payload needed for a later retry', () => {
  assert.deepEqual(notificationData({
    incidentId: 'incident-1',
    type: 'down',
    payload: {
      from: baseNotification.sender,
      to: baseNotification.recipient,
      subject: baseNotification.subject,
      html: baseNotification.html,
    },
  }), {
    incidentId: 'incident-1',
    type: 'down',
    recipient: baseNotification.recipient,
    sender: baseNotification.sender,
    subject: baseNotification.subject,
    html: baseNotification.html,
  });
});

test('marks a successful notification as sent', async () => {
  const db = mockDb(baseNotification);
  const now = new Date('2026-09-30T00:00:00.000Z');
  let sendOptions;

  await deliverNotification(baseNotification.id, {
    db,
    now: () => now,
    send: async (payload, options) => {
      sendOptions = options;
      return { id: 'resend-1' };
    },
  });

  assert.equal(db.updates[0].data.status, 'SENT');
  assert.equal(db.updates[0].data.attempts, 1);
  assert.equal(db.updates[0].data.providerMessageId, 'resend-1');
  assert.deepEqual(db.updates[0].data.sentAt, now);
  assert.equal(sendOptions.idempotencyKey, 'webwatch-notification-notification-1');
});

test('keeps a temporary failure pending with exponential backoff', async () => {
  const db = mockDb(baseNotification);
  const now = new Date('2026-09-30T00:00:00.000Z');

  await assert.rejects(() => deliverNotification(baseNotification.id, {
    db,
    now: () => now,
    send: async () => { throw new Error('temporary Resend error'); },
  }), /temporary Resend error/);

  assert.equal(db.updates[0].data.status, 'PENDING');
  assert.equal(db.updates[0].data.attempts, 1);
  assert.equal(db.updates[0].data.nextAttemptAt.getTime(), now.getTime() + retryDelayMs(1));
});

test('stops retrying after the fifth failed delivery', async () => {
  const db = mockDb({ ...baseNotification, attempts: 4 });

  await assert.rejects(() => deliverNotification(baseNotification.id, {
    db,
    send: async () => { throw new Error('permanent failure'); },
  }));

  assert.equal(db.updates[0].data.status, 'FAILED');
  assert.equal(db.updates[0].data.attempts, 5);
});

test('does not send when another worker already holds the delivery lease', async () => {
  const db = mockDb(baseNotification);
  db.notification.updateMany = async () => ({ count: 0 });
  let sendCalled = false;

  const result = await deliverNotification(baseNotification.id, {
    db,
    send: async () => {
      sendCalled = true;
      return { id: 'should-not-send' };
    },
  });

  assert.equal(result, null);
  assert.equal(sendCalled, false);
  assert.equal(db.updates.length, 0);
});
