const prisma = require('../lib/prisma');
const config = require('../config');
const { runMonitor } = require('./monitorRunner');
const { processPendingNotifications } = require('./notificationService');
const { runRetentionCleanup } = require('./retentionService');
const { recordSchedulerHeartbeat } = require('./systemHealthService');

let schedulerTimer;
let schedulerBusy = false;

async function runWithConcurrency(items, limit, operation) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: 'fulfilled', value: await operation(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const workerCount = Math.min(Math.max(1, Math.floor(limit)), items.length, 25);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function runDueMonitors() {
  if (schedulerBusy) return;
  schedulerBusy = true;
  const startedAt = Date.now();

  try {
    const monitors = await prisma.monitor.findMany({
      where: { enabled: true },
      select: { id: true, intervalMinutes: true, lastCheckedAt: true },
    });

    const now = Date.now();
    const due = monitors.filter((monitor) => {
      if (!monitor.lastCheckedAt) return true;
      return now - monitor.lastCheckedAt.getTime() >= monitor.intervalMinutes * 60_000;
    });

    const results = await runWithConcurrency(
      due,
      config.schedulerConcurrency,
      (monitor) => runMonitor(monitor.id),
    );
    const failed = results.filter((result) => result.status === 'rejected');
    const notificationResults = await processPendingNotifications();
    const retention = await runRetentionCleanup();
    await recordSchedulerHeartbeat();

    console.log(JSON.stringify({
      event: 'scheduler_cycle_completed',
      enabledMonitors: monitors.length,
      dueMonitors: due.length,
      failedMonitors: failed.length,
      notificationRetries: notificationResults.length,
      retentionRan: !retention.skipped,
      durationMs: Date.now() - startedAt,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'scheduler_cycle_failed',
      message: error.message,
      durationMs: Date.now() - startedAt,
    }));
    throw error;
  } finally {
    schedulerBusy = false;
  }
}

function startScheduler() {
  const runSafely = () => runDueMonitors().catch(() => {});
  setTimeout(runSafely, 1_000);
  schedulerTimer = setInterval(runSafely, config.checkIntervalMs);
  console.log(`Monitor scheduler started; scanning every ${config.checkIntervalMs / 1000}s`);
}

function stopScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
}

module.exports = { runDueMonitors, runWithConcurrency, startScheduler, stopScheduler };
