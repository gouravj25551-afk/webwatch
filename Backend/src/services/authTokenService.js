const crypto = require('node:crypto');
const prisma = require('../lib/prisma');

const TOKEN_TTL = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function issueAuthToken(userId, type, options = {}) {
  const db = options.db || prisma;
  const now = options.now ? options.now() : new Date();
  const token = crypto.randomBytes(32).toString('hex');

  await db.$transaction(async (tx) => {
    await tx.authToken.deleteMany({ where: { userId, type, usedAt: null } });
    await tx.authToken.create({
      data: {
        userId,
        type,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + TOKEN_TTL[type]),
      },
    });
  });

  return token;
}

async function consumeAuthToken(token, type, operation, options = {}) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = options.db || prisma;
  const now = options.now ? options.now() : new Date();
  const tokenHash = hashToken(token);

  return db.$transaction(async (tx) => {
    const record = await tx.authToken.findUnique({ where: { tokenHash } });
    if (!record || record.type !== type || record.usedAt || record.expiresAt <= now) return null;

    const claimed = await tx.authToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return null;

    return operation(tx, record.userId);
  });
}

module.exports = { TOKEN_TTL, consumeAuthToken, hashToken, issueAuthToken };
