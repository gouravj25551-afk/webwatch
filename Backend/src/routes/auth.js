const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const prisma = require('../lib/prisma');
const config = require('../config');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
});

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setSessionCookie(res, user) {
  const token = jwt.sign({ email: user.email }, config.jwtSecret, {
    subject: user.id,
    expiresIn: '7d',
  });

  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;

    if (!validEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ success: false, message: 'Password must be 8 to 72 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 12) },
      select: { id: true, email: true, createdAt: true },
    });

    setSessionCookie(res, user);
    return res.status(201).json({ success: true, user });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    setSessionCookie(res, user);
    return res.json({ success: true, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, { path: '/' });
  return res.json({ success: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) return res.status(401).json({ success: false, message: 'Account not found' });
    return res.json({ success: true, user });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
