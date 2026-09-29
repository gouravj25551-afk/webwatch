const prisma = require('../lib/prisma');
const { checkWebsite } = require('./websiteChecker');
const { buildAlertPayload } = require('./emailService');
const { deliverNotification, notificationData } = require('./notificationService');

const runningMonitorIds = new Set();

async function runMonitor(monitorId) {
  if (runningMonitorIds.has(monitorId)) return null;
  runningMonitorIds.add(monitorId);
  let claimed = false;

  try {
    const now = new Date();
    const claim = await prisma.monitor.updateMany({
      where: {
        id: monitorId,
        enabled: true,
        OR: [
          { checkLeaseUntil: null },
          { checkLeaseUntil: { lt: now } },
        ],
      },
      data: { checkLeaseUntil: new Date(now.getTime() + 2 * 60_000) },
    });

    if (claim.count === 0) return null;
    claimed = true;

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
      include: { user: { select: { email: true } } },
    });

    if (!monitor || !monitor.enabled) return null;

    const alertRecipient = monitor.user.email;
    const result = await checkWebsite(monitor.url, { attempts: 3, timeoutMs: 5_000 });
    let notificationId = null;

    await prisma.$transaction(async (tx) => {
      await tx.check.create({
        data: {
          monitorId: monitor.id,
          isUp: result.isUp,
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
          error: result.error,
          attempts: result.attempts,
        },
      });

      if (result.isUp) {
        const incident = await tx.incident.findFirst({
          where: { monitorId: monitor.id, resolvedAt: null },
          orderBy: { startedAt: 'desc' },
        });

        if (incident) {
          const resolvedIncident = await tx.incident.update({
            where: { id: incident.id },
            data: { resolvedAt: new Date() },
          });
          const payload = buildAlertPayload({
            type: 'recovery', monitor, result, incident: resolvedIncident, recipient: alertRecipient,
          });
          const notification = await tx.notification.create({
            data: notificationData({ incidentId: resolvedIncident.id, type: 'recovery', payload }),
          });
          notificationId = notification.id;
        }

        await tx.monitor.update({
          where: { id: monitor.id },
          data: {
            status: 'UP',
            lastCheckedAt: new Date(),
            lastStatusCode: result.statusCode,
            lastResponseTimeMs: result.responseTimeMs,
            lastError: null,
            consecutiveFailures: 0,
            alertEmail: alertRecipient,
          },
        });
      } else {
        const activeIncident = await tx.incident.findFirst({
          where: { monitorId: monitor.id, resolvedAt: null },
          orderBy: { startedAt: 'desc' },
        });

        if (!activeIncident) {
          const incident = await tx.incident.create({
            data: {
              monitorId: monitor.id,
              startReason: result.error || `HTTP status ${result.statusCode}`,
            },
          });
          const payload = buildAlertPayload({
            type: 'down', monitor, result, incident, recipient: alertRecipient,
          });
          const notification = await tx.notification.create({
            data: notificationData({ incidentId: incident.id, type: 'down', payload }),
          });
          notificationId = notification.id;
        }

        await tx.monitor.update({
          where: { id: monitor.id },
          data: {
            status: 'DOWN',
            lastCheckedAt: new Date(),
            lastStatusCode: result.statusCode,
            lastResponseTimeMs: result.responseTimeMs,
            lastError: result.error,
            consecutiveFailures: { increment: 1 },
            alertEmail: alertRecipient,
          },
        });
      }
    });

    if (notificationId) {
      try {
        await deliverNotification(notificationId);
      } catch (error) {
        console.error(`Alert delivery queued for retry for monitor ${monitor.id}:`, error.message);
      }
    }

    return prisma.monitor.findUnique({ where: { id: monitor.id } });
  } finally {
    if (claimed) {
      await prisma.monitor.updateMany({
        where: { id: monitorId },
        data: { checkLeaseUntil: null },
      }).catch((error) => console.error(`Could not release monitor lease ${monitorId}:`, error.message));
    }
    runningMonitorIds.delete(monitorId);
  }
}

module.exports = { runMonitor };
