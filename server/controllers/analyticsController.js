const analytics = require('../services/analyticsService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { buildRange } = require('../utils/dates');

const getRangeOrFail = (req) => {
  const range = buildRange(req.query.from, req.query.to);
  if (!range) throw new AppError('Valid "from" and "to" dates (YYYY-MM-DD) are required', 400);
  return range;
};

exports.summary = asyncHandler(async (req, res) => {
  const { start, end } = getRangeOrFail(req);
  const data = await analytics.getSummary(req.user._id, start, end);
  res.json({ success: true, data });
});

exports.categories = asyncHandler(async (req, res) => {
  const { start, end } = getRangeOrFail(req);
  const data = await analytics.getCategoryTotals(req.user._id, start, end);
  res.json({ success: true, data });
});

exports.trends = asyncHandler(async (req, res) => {
  const { start, end } = getRangeOrFail(req);
  const groupBy = ['day', 'week', 'month'].includes(req.query.groupBy) ? req.query.groupBy : 'day';
  const data = await analytics.getTrends(req.user._id, start, end, groupBy);
  res.json({ success: true, data });
});

exports.comparison = asyncHandler(async (req, res) => {
  const { start, end } = getRangeOrFail(req);
  const [categories, monthly, weekly] = await Promise.all([
    analytics.getCategoryComparison(req.user._id, start, end),
    analytics.getMonthlyTotals(req.user._id, 6),
    analytics.getWeeklyTotals(req.user._id, 8),
  ]);
  res.json({ success: true, data: { categories, monthly, weekly } });
});

const Income = require('../models/Income');
const metrics = require('../services/metricsService');

const monthParams = (req) => {
  const now = new Date();
  const match = /^(\d{4})-(\d{2})$/.exec(req.query.month || '');
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const month = match ? Number(match[2]) : now.getUTCMonth() + 1;
  if (month < 1 || month > 12) throw new AppError('Month must be YYYY-MM', 400);
  return { year, month };
};

/** Income vs expenses for a range, plus the last 6 months for the cash-flow chart. */
exports.cashflow = asyncHandler(async (req, res) => {
  const { start, end } = getRangeOrFail(req);
  const [current, income, expense, monthly] = await Promise.all([
    analytics.getCashflow(req.user._id, start, end),
    analytics.getTrends(req.user._id, start, end, 'day', Income),
    analytics.getTrends(req.user._id, start, end, 'day'),
    analytics.getMonthlyCashflow(req.user._id, 6),
  ]);
  res.json({ success: true, data: { ...current, income: current.income, dailyIncome: income, dailyExpenses: expense, monthly } });
});

exports.forecast = asyncHandler(async (req, res) => {
  const { year, month } = monthParams(req);
  res.json({ success: true, data: await metrics.getForecast(req.user._id, year, month) });
});

exports.health = asyncHandler(async (req, res) => {
  const { year, month } = monthParams(req);
  res.json({ success: true, data: await metrics.getHealth(req.user._id, year, month) });
});

/** Daily expense totals for the spending heatmap calendar. */
exports.heatmap = asyncHandler(async (req, res) => {
  const { start, end } = getRangeOrFail(req);
  res.json({ success: true, data: await analytics.getTrends(req.user._id, start, end, 'day') });
});
