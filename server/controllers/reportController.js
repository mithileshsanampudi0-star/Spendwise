const Expense = require('../models/Expense');
const Income = require('../models/Income');
const analytics = require('../services/analyticsService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { buildRange, monthRange, addDays, toISODate } = require('../utils/dates');

const REPORT_CAP = 5000;

/**
 * GET /api/reports/monthly
 * Use ?month=YYYY-MM for a monthly report, or ?from=YYYY-MM-DD&to=YYYY-MM-DD for a custom range.
 */
exports.monthly = asyncHandler(async (req, res) => {
  let start;
  let end;
  const { month, from, to } = req.query;

  if (month) {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) throw new AppError('Month must be YYYY-MM', 400);
    ({ start, end } = monthRange(Number(match[1]), Number(match[2])));
  } else {
    const range = buildRange(from, to);
    if (!range) throw new AppError('Provide ?month=YYYY-MM or valid ?from and ?to dates', 400);
    ({ start, end } = range);
  }

  const [totals, incomeTotals, categories, expenses, incomes] = await Promise.all([
    analytics.getTotals(req.user._id, start, end),
    analytics.getIncomeTotals(req.user._id, start, end),
    analytics.getCategoryTotals(req.user._id, start, end),
    Expense.find({ userId: req.user._id, deletedAt: null, date: { $gte: start, $lt: end } })
      .sort({ date: 1, _id: 1 })
      .limit(REPORT_CAP),
    Income.find({ userId: req.user._id, deletedAt: null, date: { $gte: start, $lt: end } })
      .sort({ date: 1, _id: 1 })
      .limit(REPORT_CAP),
  ]);
  const r2 = (n) => Math.round(n * 100) / 100;

  res.json({
    success: true,
    data: {
      period: { from: toISODate(start), to: toISODate(addDays(end, -1)) },
      currency: req.user.currency,
      totalExpenses: totals.total,
      totalIncome: incomeTotals.total,
      incomeCount: incomeTotals.count,
      net: r2(incomeTotals.total - totals.total),
      transactionCount: totals.count,
      categories,
      expenses,
      incomes,
      truncated: totals.count > REPORT_CAP || incomeTotals.count > REPORT_CAP,
    },
  });
});
