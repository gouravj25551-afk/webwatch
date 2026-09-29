const prisma = require('../lib/prisma');
const config = require('../config');

const JOB_ID = 'data-retention';
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LEASE_MS = 10 * 60 * 1000;
const BATCH_SIZE = 2_000;
const MAX_BATCHES_PER_TARGET = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

function retentionCutoffs(now = new Date()) {
  return {
    checks: new Date(now.getTime() - config.checkRetentionDays * DAY_MS),
    notifications: new Date(now.getTime() - config.notificationRetentionDays * DAY_MS),
    incidents: new Date(now.getTime() - config.incidentRetentionDays * DAY_MS),
    authTokens: new Date(now.getTime() - 7 * DAY_MS),
  };
}

async function deleteInBatches(db, query, cutoff) {
  let deleted = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_TARGET; batch += 1) {
    const count = await db.$executeRawUnsafe(query, cutoff);
    deleted += count;
    if (count < BATCH_SIZE) break;
  }
  return deleted;
}

async function claimRetentionRun(db, now) {
  await db.maintenanceJob.upsert({
    where: { id: JOB_ID },
    create: { id: JOB_ID },
    update: {},
  });

  const claim = await db.maintenanceJob.updateMany({
    where: {
      id: JOB_ID,
      AND: [
        { OR: [{ lastRunAt: null }, { lastRunAt: { lt: new Date(now.getTime() - RUN_INTERVAL_MS) } }] },
        { OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      ],
    },
    data: { leaseUntil: new Date(now.getTime() + LEASE_MS) },
  });
  return claim.count === 1;
}

async function runRetentionCleanup(options = {}) {
  const db = options.db || prisma;
  const now = options.now ? options.now() : new Date();
  if (!(await claimRetentionRun(db, now))) return { skipped: true };

  const cutoffs = retentionCutoffs(now);
  const queries = {
    checks: `DELETE FROM "Check" WHERE "id" IN (SELECT "id" FROM "Check" WHERE "checkedAt" < $1 LIMIT ${BATCH_SIZE})`,
    notifications: `DELETE FROM "Notification" WHERE "id" IN (SELECT "id" FROM "Notification" WHERE "createdAt" < $1 LIMIT ${BATCH_SIZE})`,
    incidents: `DELETE FROM "Incident" WHERE "id" IN (SELECT "id" FROM "Incident" WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" < $1 LIMIT ${BATCH_SIZE})`,
    authTokens: `DELETE FROM "AuthToken" WHERE "id" IN (SELECT "id" FROM "AuthToken" WHERE "createdAt" < $1 AND ("usedAt" IS NOT NULL OR "expiresAt" < $1) LIMIT ${BATCH_SIZE})`,
  };

  try {
    const deleted = {};
    deleted.checks = await deleteInBatches(db, queries.checks, cutoffs.checks);
    deleted.notifications = await deleteInBatches(db, queries.notifications, cutoffs.notifications);
    deleted.incidents = await deleteInBatches(db, queries.incidents, cutoffs.incidents);
    deleted.authTokens = await deleteInBatches(db, queries.authTokens, cutoffs.authTokens);

    await db.maintenanceJob.update({
      where: { id: JOB_ID },
      data: { lastRunAt: now, leaseUntil: null },
    });
    console.log(JSON.stringify({ event: 'retention_cleanup_completed', deleted }));
    return { skipped: false, deleted };
  } catch (error) {
    await db.maintenanceJob.updateMany({
      where: { id: JOB_ID },
      data: { leaseUntil: null },
    }).catch(() => {});
    throw error;
  }
}

module.exports = {
  BATCH_SIZE,
  MAX_BATCHES_PER_TARGET,
  claimRetentionRun,
  deleteInBatches,
  retentionCutoffs,
  runRetentionCleanup,
};
