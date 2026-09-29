const prisma = require('../lib/prisma');
const { sendEmailPayload } = require('./emailService');

const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_LEASE_MS = 2 * 60_000;

function retryDelayMs(attempts) {
  return Math.min(5 * (2 ** Math.max(attempts - 1, 0)), 60) * 60_000;
}

function notificationData({ incidentId, type, payload }) {
  return {
    incidentId,
    type,
    recipient: payload.to,
    sender: payload.from,
    subject: payload.subject,
    html: payload.html,
  };
}

async function deliverNotification(notificationId, options = {}) {
  const db = options.db || prisma;
  const send = options.send || sendEmailPayload;
  const now = options.now ? options.now() : new Date();

  const claim = await db.notification.updateMany({
    where: {
      id: notificationId,
      status: 'PENDING',
      nextAttemptAt: { lte: now },
      OR: [
        { deliveryLeaseUntil: null },
        { deliveryLeaseUntil: { lt: now } },
      ],
    },
    data: { deliveryLeaseUntil: new Date(now.getTime() + DELIVERY_LEASE_MS) },
  });

  if (claim.count === 0) return null;

  const notification = await db.notification.findUnique({ where: { id: notificationId } });
  if (!notification) return null;

  const attempts = notification.attempts + 1;

  try {
    const result = await send(
      {
        from: notification.sender,
        to: notification.recipient,
        subject: notification.subject,
        html: notification.html,
      },
      { idempotencyKey: `webwatch-notification-${notification.id}` },
    );

    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: 'SENT',
        attempts,
        sentAt: now,
        providerMessageId: result && result.id ? result.id : null,
        lastError: null,
        deliveryLeaseUntil: null,
      },
    });

    return { sent: true, notificationId: notification.id };
  } catch (error) {
    const exhausted = attempts >= MAX_DELIVERY_ATTEMPTS;
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: exhausted ? 'FAILED' : 'PENDING',
        attempts,
        nextAttemptAt: new Date(now.getTime() + retryDelayMs(attempts)),
        lastError: String(error.message || error).slice(0, 1000),
        deliveryLeaseUntil: null,
      },
    });
    throw error;
  }
}

async function processPendingNotifications(limit = 50) {
  const now = new Date();
  const notifications = await prisma.notification.findMany({
    where: {
      status: 'PENDING',
      nextAttemptAt: { lte: now },
      OR: [
        { deliveryLeaseUntil: null },
        { deliveryLeaseUntil: { lt: now } },
      ],
    },
    select: { id: true },
    orderBy: { nextAttemptAt: 'asc' },
    take: limit,
  });

  return Promise.allSettled(notifications.map(({ id }) => deliverNotification(id)));
}

module.exports = {
  DELIVERY_LEASE_MS,
  MAX_DELIVERY_ATTEMPTS,
  deliverNotification,
  notificationData,
  processPendingNotifications,
  retryDelayMs,
};
