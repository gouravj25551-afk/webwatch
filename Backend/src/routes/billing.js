const express = require('express');
const prisma = require('../lib/prisma');
const config = require('../config');
const requireAuth = require('../middleware/auth');
const { createCheckoutSession } = require('../services/dodoPayments');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/billing/summary
 * Returns billing info, slot quota, and recent transaction history
 */
router.get('/summary', async (req, res, next) => {
  try {
    const [user, activeMonitorsCount, payments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, paidMonitorsCount: true },
      }),
      prisma.monitor.count({ where: { userId: req.user.id } }),
      prisma.payment.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const paidSlots = user ? user.paidMonitorsCount : 0;
    const monitorLimit = config.billingEnabled ? paidSlots : config.maxMonitorsPerUser;
    const availableSlots = Math.max(0, monitorLimit - activeMonitorsCount);

    return res.json({
      success: true,
      billingEnabled: config.billingEnabled,
      monitorLimit,
      paidMonitorsCount: paidSlots,
      activeMonitorsCount,
      availableSlots,
      pricePerSiteUsd: 1.0,
      payments,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/billing/create-checkout
 * Creates a Dodo Payments checkout session for $1 per site slot
 */
router.post('/create-checkout', async (req, res, next) => {
  try {
    if (!config.billingEnabled) {
      return res.status(503).json({ success: false, message: 'Paid plans are not enabled during the free beta.' });
    }
    const parsedQuantity = Number.parseInt(req.body.quantity || 1, 10);
    const quantity = Number.isInteger(parsedQuantity) ? Math.min(Math.max(parsedQuantity, 1), 10) : 1;

    const result = await createCheckoutSession({
      user: req.user,
      quantity,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/billing/verify-session
 * Returns the server-side payment status. Only a verified webhook can fulfill it.
 */
router.post('/verify-session', async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'paymentId is required' });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId: req.user.id },
      select: { id: true, status: true },
    });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const activeMonitorsCount = await prisma.monitor.count({ where: { userId: req.user.id } });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { paidMonitorsCount: true },
    });

    return res.json({
      success: true,
      paymentStatus: payment.status,
      fulfilled: payment.status === 'SUCCESS',
      paidMonitorsCount: user ? user.paidMonitorsCount : 0,
      availableSlots: Math.max(0, (user ? user.paidMonitorsCount : 0) - activeMonitorsCount),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
