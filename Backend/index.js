const app = require('./src/app');
const config = require('./src/config');
const prisma = require('./src/lib/prisma');
const { startScheduler, stopScheduler } = require('./src/services/scheduler');

if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log(`WebWatch API running on http://localhost:${config.port}`);
    startScheduler();
  });

  async function shutdown(signal) {
    console.log(`${signal} received; shutting down WebWatch`);
    stopScheduler();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;
