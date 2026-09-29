const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');

async function requireAuth(req, res, next) {
  const token = req.cookies[config.cookieName];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, sessionVersion: true, emailVerifiedAt: true },
    });

    if (!user || (payload.sessionVersion ?? 0) !== user.sessionVersion) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireAuth;
