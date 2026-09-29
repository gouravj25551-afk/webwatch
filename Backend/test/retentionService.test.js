process.env.JWT_SECRET ||= 'test-only-secret-at-least-32-characters-long';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BATCH_SIZE,
  deleteInBatches,
  retentionCutoffs,
  runRetentionCleanup,
} = require('../src/services/retentionService');

test('calculates the configured retention windows', () => {
  const now = new Date('2026-09-30T12:00:00.000Z');
  const cutoffs = retentionCutoffs(now);

  assert.equal(cutoffs.checks.toISOString(), '2026-08-31T12:00:00.000Z');
  assert.equal(cutoffs.notifications.toISOString(), '2026-07-02T12:00:00.000Z');
  assert.equal(cutoffs.incidents.toISOString(), '2025-09-30T12:00:00.000Z');
  assert.equal(cutoffs.authTokens.toISOString(), '2026-09-23T12:00:00.000Z');
});

test('deletes in bounded batches and stops after a partial batch', async () => {
  const counts = [BATCH_SIZE, BATCH_SIZE, 42];
  let calls = 0;
  const db = { $executeRawUnsafe: async () => counts[calls++] };

  const deleted = await deleteInBatches(db, 'DELETE TEST', new Date());

  assert.equal(deleted, BATCH_SIZE * 2 + 42);
  assert.equal(calls, 3);
});

test('skips cleanup when another scheduler owns the daily lease', async () => {
  let rawCalls = 0;
  const db = {
    maintenanceJob: {
      upsert: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
    $executeRawUnsafe: async () => { rawCalls += 1; return 0; },
  };

  assert.deepEqual(await runRetentionCleanup({ db }), { skipped: true });
  assert.equal(rawCalls, 0);
});

test('records one completed cleanup after processing every target', async () => {
  const updates = [];
  let rawCalls = 0;
  const db = {
    maintenanceJob: {
      upsert: async () => ({}),
      updateMany: async () => ({ count: 1 }),
      update: async (args) => { updates.push(args); return {}; },
    },
    $executeRawUnsafe: async () => { rawCalls += 1; return 0; },
  };

  const result = await runRetentionCleanup({
    db,
    now: () => new Date('2026-09-30T12:00:00.000Z'),
  });

  assert.deepEqual(result.deleted, { checks: 0, notifications: 0, incidents: 0, authTokens: 0 });
  assert.equal(rawCalls, 4);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].data.leaseUntil, null);
});
