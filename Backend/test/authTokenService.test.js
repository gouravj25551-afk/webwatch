process.env.JWT_SECRET ||= 'test-only-secret-at-least-32-characters-long';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TOKEN_TTL, consumeAuthToken, hashToken, issueAuthToken } = require('../src/services/authTokenService');

function fakeDb() {
  const records = [];
  const tx = {
    authToken: {
      deleteMany: async ({ where }) => {
        for (let index = records.length - 1; index >= 0; index -= 1) {
          const item = records[index];
          if (item.userId === where.userId && item.type === where.type && item.usedAt === null) records.splice(index, 1);
        }
      },
      create: async ({ data }) => {
        const record = { id: `token-${records.length + 1}`, usedAt: null, ...data };
        records.push(record);
        return record;
      },
      findUnique: async ({ where }) => records.find((item) => item.tokenHash === where.tokenHash) || null,
      updateMany: async ({ where, data }) => {
        const record = records.find((item) => item.id === where.id && item.usedAt === null);
        if (!record) return { count: 0 };
        Object.assign(record, data);
        return { count: 1 };
      },
    },
  };
  return { records, $transaction: async (operation) => operation(tx) };
}

test('issues only a SHA-256 token hash and replaces an older unused token', async () => {
  const db = fakeDb();
  const now = new Date('2026-09-30T12:00:00.000Z');
  const first = await issueAuthToken('user-1', 'PASSWORD_RESET', { db, now: () => now });
  const second = await issueAuthToken('user-1', 'PASSWORD_RESET', { db, now: () => now });

  assert.notEqual(first, second);
  assert.equal(db.records.length, 1);
  assert.equal(db.records[0].tokenHash, hashToken(second));
  assert.equal(db.records[0].tokenHash.includes(second), false);
  assert.equal(db.records[0].expiresAt.getTime(), now.getTime() + TOKEN_TTL.PASSWORD_RESET);
});

test('consumes a valid token once', async () => {
  const db = fakeDb();
  const now = new Date('2026-09-30T12:00:00.000Z');
  const token = await issueAuthToken('user-1', 'EMAIL_VERIFICATION', { db, now: () => now });
  let operations = 0;
  const operation = async (_tx, userId) => {
    operations += 1;
    return { userId };
  };

  const first = await consumeAuthToken(token, 'EMAIL_VERIFICATION', operation, { db, now: () => now });
  const second = await consumeAuthToken(token, 'EMAIL_VERIFICATION', operation, { db, now: () => now });

  assert.deepEqual(first, { userId: 'user-1' });
  assert.equal(second, null);
  assert.equal(operations, 1);
});

test('rejects malformed, expired, and wrong-purpose tokens', async () => {
  const db = fakeDb();
  const issuedAt = new Date('2026-09-30T12:00:00.000Z');
  const token = await issueAuthToken('user-1', 'PASSWORD_RESET', { db, now: () => issuedAt });
  const operation = async () => ({ changed: true });

  assert.equal(await consumeAuthToken('invalid', 'PASSWORD_RESET', operation, { db }), null);
  assert.equal(await consumeAuthToken(token, 'EMAIL_VERIFICATION', operation, { db, now: () => issuedAt }), null);
  assert.equal(await consumeAuthToken(token, 'PASSWORD_RESET', operation, {
    db,
    now: () => new Date(issuedAt.getTime() + TOKEN_TTL.PASSWORD_RESET + 1),
  }), null);
});
