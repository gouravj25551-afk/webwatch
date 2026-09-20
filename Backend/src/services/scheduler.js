const prisma = require('../lib/prisma');
const config = require('../config');
const { runMonitor } = require('./monitorRunner');

let schedulerTimer;
let schedulerBusy = false;

async function runDueMonitors() {
  if (schedulerBusy) return;
  schedulerBusy = true;

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

    await Promise.allSettled(due.map((monitor) => runMonitor(monitor.id)));
  } catch (error) {
    console.error('Scheduler cycle failed:', error);
  } finally {
    schedulerBusy = false;
  }
}

function startScheduler() {
  setTimeout(runDueMonitors, 1_000);
  schedulerTimer = setInterval(runDueMonitors, config.checkIntervalMs);
  console.log(`Monitor scheduler started; scanning every ${config.checkIntervalMs / 1000}s`);
}

function stopScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
}

module.exports = { runDueMonitors, startScheduler, stopScheduler };
