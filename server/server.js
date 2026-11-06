require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { materialize } = require('./services/recurringService');
const { purgeExpiredDemos } = require('./services/demoService');

const PORT = process.env.PORT || 5000;

const runJobs = async () => {
  try {
    const { created } = await materialize();
    const purged = await purgeExpiredDemos();
    if (created || purged) logger.info('Background jobs finished', { recurringCreated: created, demoPurged: purged });
  } catch (err) {
    logger.error('Background job failed', { message: err.message });
  }
};

const start = async () => {
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
    process.exit(1);
  }
  try {
    await connectDB();
    const server = app.listen(PORT, () => logger.info(`SpendWise API listening on http://localhost:${PORT}`));
    runJobs();
    setInterval(runJobs, 60 * 60 * 1000).unref(); // hourly; safe with several instances (atomic claims)
    const stop = () => server.close(() => process.exit(0));
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
  } catch (err) {
    logger.error('Failed to start server', { message: err.message });
    process.exit(1);
  }
};

start();
