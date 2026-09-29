const prisma = require('../lib/prisma');

const HEARTBEAT_ID = 'scheduler-heartbeat';
const SCHEDULER_STALE_MS = 15 * 60 * 1000;

async function recordSchedulerHeartbeat(options = {}) {
  const db = options.db || prisma;
  const now = options.now ? options.now() : new Date();
  await db.maintenanceJob.upsert({
    where: { id: HEARTBEAT_ID },
    create: { id: HEARTBEAT_ID, lastRunAt: now },
    update: { lastRunAt: now },
  });
  return now;
}

async function getReadiness(options = {}) {
  const db = options.db || prisma;
  const now = options.now ? options.now() : new Date();
  await db.$queryRawUnsafe('SELECT 1');
  const heartbeat = await db.maintenanceJob.findUnique({ where: { id: HEARTBEAT_ID } });
  const schedulerHealthy = Boolean(
    heartbeat?.lastRunAt && now.getTime() - heartbeat.lastRunAt.getTime() <= SCHEDULER_STALE_MS,
  );

  return {
    ready: schedulerHealthy,
    database: 'ok',
    scheduler: schedulerHealthy ? 'ok' : 'stale',
    schedulerLastRunAt: heartbeat?.lastRunAt || null,
  };
}

module.exports = { getReadiness, HEARTBEAT_ID, recordSchedulerHeartbeat, SCHEDULER_STALE_MS };
