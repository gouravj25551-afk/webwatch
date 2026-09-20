const prisma = require('./src/lib/prisma');
const { startScheduler, stopScheduler } = require('./src/services/scheduler');

let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; stopping WebWatch worker`);
  stopScheduler();
  await prisma.$disconnect();
  process.exit(exitCode);
}

async function start() {
  await prisma.$connect();
  console.log('WebWatch worker connected to PostgreSQL');
  startScheduler();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught worker error:', error);
  shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (error) => {
  console.error('Unhandled worker rejection:', error);
  shutdown('unhandledRejection', 1);
});

start().catch((error) => {
  console.error('WebWatch worker failed to start:', error);
  process.exit(1);
});
