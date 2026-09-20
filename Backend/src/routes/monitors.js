const express = require('express');
const prisma = require('../lib/prisma');
const config = require('../config');
const requireAuth = require('../middleware/auth');
const { validatePublicUrl } = require('../services/urlSafety');
const { runMonitor } = require('../services/monitorRunner');

const router = express.Router();
router.use(requireAuth);

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function monitorWithStats(monitor) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalChecks, successfulChecks, activeIncident] = await Promise.all([
    prisma.check.count({ where: { monitorId: monitor.id, checkedAt: { gte: since } } }),
    prisma.check.count({ where: { monitorId: monitor.id, checkedAt: { gte: since }, isUp: true } }),
    prisma.incident.findFirst({
      where: { monitorId: monitor.id, resolvedAt: null },
      orderBy: { startedAt: 'desc' },
    }),
  ]);

  return {
    ...monitor,
    uptimePercentage: totalChecks ? Number(((successfulChecks / totalChecks) * 100).toFixed(2)) : null,
    totalChecks,
    activeIncident,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const monitors = await prisma.monitor.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, monitors: await Promise.all(monitors.map(monitorWithStats)) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const currentCount = await prisma.monitor.count({ where: { userId: req.user.id } });
    if (currentCount >= config.maxMonitorsPerUser) {
      return res.status(403).json({ success: false, message: `Free beta allows ${config.maxMonitorsPerUser} monitors` });
    }

    const { parsedUrl } = await validatePublicUrl(req.body.url);
    const name = typeof req.body.name === 'string' && req.body.name.trim()
      ? req.body.name.trim().slice(0, 80)
      : parsedUrl.hostname;
    const alertEmail = req.body.alertEmail
      ? String(req.body.alertEmail).trim().toLowerCase()
      : req.user.email;
    const intervalMinutes = Number(req.body.intervalMinutes || 5);

    if (!validEmail(alertEmail)) {
      return res.status(400).json({ success: false, message: 'Enter a valid alert email' });
    }

    if (![1, 5, 10, 15].includes(intervalMinutes)) {
      return res.status(400).json({ success: false, message: 'Interval must be 1, 5, 10, or 15 minutes' });
    }

    const monitor = await prisma.monitor.create({
      data: {
        userId: req.user.id,
        name,
        url: parsedUrl.toString(),
        alertEmail,
        intervalMinutes,
      },
    });

    const checkedMonitor = await runMonitor(monitor.id);
    return res.status(201).json({ success: true, monitor: await monitorWithStats(checkedMonitor || monitor) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/check', async (req, res, next) => {
  try {
    const monitor = await prisma.monitor.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!monitor) return res.status(404).json({ success: false, message: 'Monitor not found' });
    if (!monitor.enabled) return res.status(400).json({ success: false, message: 'Resume the monitor before checking it' });

    const checkedMonitor = await runMonitor(monitor.id);
    return res.json({ success: true, monitor: await monitorWithStats(checkedMonitor || monitor) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const monitor = await prisma.monitor.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!monitor) return res.status(404).json({ success: false, message: 'Monitor not found' });

    const data = {};
    if (typeof req.body.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim().slice(0, 80);
    if (typeof req.body.enabled === 'boolean') {
      data.enabled = req.body.enabled;
      data.status = req.body.enabled ? 'UNKNOWN' : 'PAUSED';
      if (req.body.enabled) data.lastCheckedAt = null;
    }
    if (req.body.alertEmail !== undefined) {
      const alertEmail = String(req.body.alertEmail).trim().toLowerCase();
      if (!validEmail(alertEmail)) return res.status(400).json({ success: false, message: 'Enter a valid alert email' });
      data.alertEmail = alertEmail;
    }
    if (req.body.intervalMinutes !== undefined) {
      const intervalMinutes = Number(req.body.intervalMinutes);
      if (![1, 5, 10, 15].includes(intervalMinutes)) {
        return res.status(400).json({ success: false, message: 'Interval must be 1, 5, 10, or 15 minutes' });
      }
      data.intervalMinutes = intervalMinutes;
    }
    if (req.body.url !== undefined) {
      const { parsedUrl } = await validatePublicUrl(req.body.url);
      data.url = parsedUrl.toString();
      data.status = 'UNKNOWN';
      data.lastCheckedAt = null;
    }

    const updated = await prisma.monitor.update({ where: { id: monitor.id }, data });
    return res.json({ success: true, monitor: await monitorWithStats(updated) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const monitor = await prisma.monitor.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!monitor) return res.status(404).json({ success: false, message: 'Monitor not found' });

    await prisma.monitor.delete({ where: { id: monitor.id } });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/history', async (req, res, next) => {
  try {
    const monitor = await prisma.monitor.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!monitor) return res.status(404).json({ success: false, message: 'Monitor not found' });

    const requestedDays = Number(req.query.days || 7);
    const days = [1, 7, 30].includes(requestedDays) ? requestedDays : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [checks, incidents] = await Promise.all([
      prisma.check.findMany({
        where: { monitorId: monitor.id, checkedAt: { gte: since } },
        orderBy: { checkedAt: 'desc' },
        take: 500,
      }),
      prisma.incident.findMany({
        where: { monitorId: monitor.id, startedAt: { gte: since } },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
    ]);

    const upChecks = checks.filter((check) => check.isUp).length;
    const uptimePercentage = checks.length ? Number(((upChecks / checks.length) * 100).toFixed(2)) : null;
    return res.json({ success: true, monitor, checks, incidents, uptimePercentage, days });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
