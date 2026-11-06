const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/security');
const clientDate = require('./middleware/clientDate');

const app = express();

// Behind Render/Heroku/nginx the real client IP (needed by rate limiting) comes from X-Forwarded-For.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim()) : true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Date'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// Strips keys such as $ne / $gt from body, query and params so they can never reach a Mongo query.
app.use(mongoSanitize());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'SpendWise API is running' }));

app.use('/api', apiLimiter);
app.use('/api', clientDate);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/meta', require('./routes/metaRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/income', require('./routes/incomeRoutes'));
app.use('/api/recurring', require('./routes/recurringRoutes'));
app.use('/api/import', require('./routes/importRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/savings', require('./routes/savingsRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/insights', require('./routes/insightsRoutes'));
app.use('/api/debts', require('./routes/debtRoutes'));
app.use('/api/backup', require('./routes/backupRoutes'));

// Optional: serve the built React client from this server (single-host deployment)
if (process.env.SERVE_CLIENT === 'true') {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
