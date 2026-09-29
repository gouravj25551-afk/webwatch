const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const prisma = require('../lib/prisma');
const config = require('../config');
const requireAuth = require('../middleware/auth');
const { consumeAuthToken, hashToken, issueAuthToken } = require('../services/authTokenService');
const { accountEmailTemplate, sendEmailPayload } = require('../services/emailService');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again later.' },
});

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 72;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
  };
}

function setSessionCookie(res, user) {
  const token = jwt.sign(
    { email: user.email, sessionVersion: user.sessionVersion ?? 0 },
    config.jwtSecret,
    { subject: user.id, expiresIn: '7d' },
  );

  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function accountUrl(path, token) {
  const url = new URL('/', config.clientOrigin);
  url.searchParams.set(path, token);
  return url.toString();
}

async function sendVerificationEmail(user) {
  const token = await issueAuthToken(user.id, 'EMAIL_VERIFICATION');
  return sendEmailPayload({
    from: config.alertFrom,
    to: user.email,
    subject: 'Verify your WebWatch email',
    html: accountEmailTemplate({
      title: 'Verify your email',
      message: 'Confirm this email address to activate automatic monitoring alerts. This link expires in 24 hours.',
      actionLabel: 'Verify email',
      actionUrl: accountUrl('verify', token),
    }),
  }, { idempotencyKey: `webwatch-verify-${user.id}-${hashToken(token).slice(0, 16)}` });
}

async function sendResetEmail(user) {
  const token = await issueAuthToken(user.id, 'PASSWORD_RESET');
  return sendEmailPayload({
    from: config.alertFrom,
    to: user.email,
    subject: 'Reset your WebWatch password',
    html: accountEmailTemplate({
      title: 'Reset your password',
      message: 'Use this secure link to choose a new password. It expires in one hour. Ignore this email if you did not request it.',
      actionLabel: 'Reset password',
      actionUrl: accountUrl('reset', token),
    }),
  }, { idempotencyKey: `webwatch-reset-${user.id}-${hashToken(token).slice(0, 16)}` });
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;

    if (!validEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be 8 to 72 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });

    if (config.requireEmailVerification) {
      try {
        await sendVerificationEmail(user);
      } catch (emailError) {
        console.error('Verification email failed', { userId: user.id, message: emailError.message });
      }
      return res.status(201).json({
        success: true,
        verificationRequired: true,
        message: 'Account created. Check your email to verify it before logging in.',
      });
    }

    setSessionCookie(res, user);
    return res.status(201).json({ success: true, user: publicUser(user) });
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
    if (config.requireEmailVerification && !user.emailVerifiedAt) {
      return res.status(403).json({
        success: false,
        verificationRequired: true,
        message: 'Verify your email before logging in.',
      });
    }

    setSessionCookie(res, user);
    return res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/verify-email', authLimiter, async (req, res, next) => {
  try {
    const user = await consumeAuthToken(req.body.token, 'EMAIL_VERIFICATION', (tx, userId) => tx.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    }));

    if (!user) return res.status(400).json({ success: false, message: 'Verification link is invalid or expired' });
    setSessionCookie(res, user);
    return res.json({ success: true, user: publicUser(user), message: 'Email verified successfully.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/resend-verification', authLimiter, async (req, res, next) => {
  try {
    if (!config.accountEmailsEnabled) {
      return res.status(503).json({ success: false, message: 'Account emails will be available after the WebWatch sending domain is verified.' });
    }
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = validEmail(email) ? await prisma.user.findUnique({ where: { email } }) : null;
    if (user && !user.emailVerifiedAt) {
      try {
        await sendVerificationEmail(user);
      } catch (emailError) {
        console.error('Verification email failed', { userId: user.id, message: emailError.message });
      }
    }
    return res.json({ success: true, message: 'If this account needs verification, a new link has been sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    if (!config.accountEmailsEnabled) {
      return res.status(503).json({ success: false, message: 'Password reset will be available after the WebWatch sending domain is verified.' });
    }
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = validEmail(email) ? await prisma.user.findUnique({ where: { email } }) : null;
    if (user) {
      try {
        await sendResetEmail(user);
      } catch (emailError) {
        console.error('Password reset email failed', { userId: user.id, message: emailError.message });
      }
    }
    return res.json({ success: true, message: 'If an account exists for this email, a reset link has been sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    if (!validPassword(req.body.password)) {
      return res.status(400).json({ success: false, message: 'Password must be 8 to 72 characters' });
    }
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await consumeAuthToken(req.body.token, 'PASSWORD_RESET', (tx, userId) => tx.user.update({
      where: { id: userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }));

    if (!user) return res.status(400).json({ success: false, message: 'Reset link is invalid or expired' });
    setSessionCookie(res, user);
    return res.json({ success: true, user: publicUser(user), message: 'Password updated successfully.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, { path: '/' });
  return res.json({ success: true });
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ success: true, user: publicUser(req.user) });
});

module.exports = router;
