const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const config = require('./config');
const authRoutes = require('./routes/auth');
const monitorRoutes = require('./routes/monitors');
const { checkWebsite } = require('./services/websiteChecker');
const { runDueMonitors } = require('./services/scheduler');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'WebWatch API is healthy' });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'WebWatch API is healthy' });
});

app.post('/api/check', async (req, res, next) => {
  try {
    const result = await checkWebsite(req.body.url, { attempts: 1, timeoutMs: 5_000 });
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/cron', async (req, res, next) => {
  try {
    if (!config.cronSecret) {
      return res.status(503).json({ success: false, message: 'Cron runner is not configured' });
    }

    if (req.headers.authorization !== `Bearer ${config.cronSecret}`) {
      return res.status(401).json({ success: false, message: 'Invalid cron credentials' });
    }

    await runDueMonitors();
    return res.json({ success: true, message: 'Due monitors processed' });
  } catch (error) {
    return next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});
app.use(errorHandler);

module.exports = app;
