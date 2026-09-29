process.env.JWT_SECRET ||= 'test-only-secret-at-least-32-characters-long';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getReadiness,
  HEARTBEAT_ID,
  recordSchedulerHeartbeat,
  SCHEDULER_STALE_MS,
} = require('../src/services/systemHealthService');

test('records a successful scheduler heartbeat', async () => {
  let upsert;
  const now = new Date('2026-09-30T12:00:00.000Z');
  const db = { maintenanceJob: { upsert: async (args) => { upsert = args; } } };

  await recordSchedulerHeartbeat({ db, now: () => now });

  assert.equal(upsert.where.id, HEARTBEAT_ID);
  assert.equal(upsert.update.lastRunAt, now);
});

test('reports ready when the database responds and scheduler is recent', async () => {
  const now = new Date('2026-09-30T12:00:00.000Z');
  const db = {
    $queryRawUnsafe: async () => [{ '?column?': 1 }],
    maintenanceJob: {
      findUnique: async () => ({ lastRunAt: new Date(now.getTime() - SCHEDULER_STALE_MS + 1) }),
    },
  };

  const result = await getReadiness({ db, now: () => now });
  assert.equal(result.ready, true);
  assert.equal(result.database, 'ok');
  assert.equal(result.scheduler, 'ok');
});

test('reports stale when the scheduler heartbeat is too old', async () => {
  const now = new Date('2026-09-30T12:00:00.000Z');
  const db = {
    $queryRawUnsafe: async () => [{ '?column?': 1 }],
    maintenanceJob: {
      findUnique: async () => ({ lastRunAt: new Date(now.getTime() - SCHEDULER_STALE_MS - 1) }),
    },
  };

  const result = await getReadiness({ db, now: () => now });
  assert.equal(result.ready, false);
  assert.equal(result.scheduler, 'stale');
});
