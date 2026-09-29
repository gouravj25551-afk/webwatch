process.env.JWT_SECRET ||= 'test-only-secret-at-least-32-characters-long';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runWithConcurrency } = require('../src/services/scheduler');

test('runs monitor work with a fixed concurrency ceiling', async () => {
  let active = 0;
  let peak = 0;
  const items = Array.from({ length: 8 }, (_, index) => index);

  const results = await runWithConcurrency(items, 3, async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    if (item === 4) throw new Error('expected failure');
    return item * 2;
  });

  assert.equal(peak, 3);
  assert.equal(results[3].value, 6);
  assert.equal(results[4].status, 'rejected');
  assert.equal(results.length, items.length);
});
