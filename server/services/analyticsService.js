const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const { DAY_MS, addDays, startOfTodayUTC, effectiveEnd, effectiveDays, toISODate } = require('../utils/dates');

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const round = (n) => Math.round(n * 100) / 100;

/** Base $match for live (not soft-deleted) records of one user inside [start, end). */
const live = (userId, start, end, extra = {}) => ({
  userId: oid(userId),
  deletedAt: null,
  date: { $gte: start, $lt: end },
  ...extra,
});

/** Totals per category inside [start, end), sorted high -> low, with percentage share. */
const getCategoryTotals = async (userId, start, end) => {
  const rows = await Expense.aggregate([
    { $match: live(userId, start, end) },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  const grand = rows.reduce((sum, r) => sum + r.total, 0);
  return rows.map((r) => ({
    category: r._id,
    total: round(r.total),
    count: r.count,
    percentage: grand > 0 ? round((r.total / grand) * 100) : 0,
  }));
};

const totalsOf = async (Model, userId, start, end, extra) => {
  const [agg] = await Model.aggregate([
    { $match: live(userId, start, end, extra) },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return { total: round(agg?.total || 0), count: agg?.count || 0 };
};

const getTotals = (userId, start, end) => totalsOf(Expense, userId, start, end);
const getIncomeTotals = (userId, start, end) => totalsOf(Income, userId, start, end);
/** Spending created by recurring rules (rent, subscriptions): used to separate fixed from everyday spend. */
const getRecurringSpent = (userId, start, end) => totalsOf(Expense, userId, start, end, { recurringId: { $ne: null } });

/** Income, expenses, net and savings rate for a range. */
const getCashflow = async (userId, start, end) => {
  const [inc, exp] = await Promise.all([getIncomeTotals(userId, start, end), getTotals(userId, start, end)]);
  const net = round(inc.total - exp.total);
  return {
    income: inc.total,
    incomeCount: inc.count,
    expenses: exp.total,
    net,
    savingsRate: inc.total > 0 ? round((net / inc.total) * 100) : null,
  };
};

/** Summary for a range, plus comparison against the preceding period of equal elapsed length. */
const getSummary = async (userId, start, end) => {
  const [totals, categories, cash] = await Promise.all([
    getTotals(userId, start, end),
    getCategoryTotals(userId, start, end),
    getCashflow(userId, start, end),
  ]);

  const days = effectiveDays(start, end);
  const elapsedMs = effectiveEnd(end) - start;
  const prevStart = new Date(start.getTime() - Math.max(elapsedMs, DAY_MS));
  const previous = await getTotals(userId, prevStart, start);

  const change = round(totals.total - previous.total);
  const changePct = previous.total > 0 ? round((change / previous.total) * 100) : null;

  return {
    total: totals.total,
    count: totals.count,
    days,
    dailyAverage: round(totals.total / days),
    highestCategory: categories[0] || null,
    lowestCategory: categories.length ? categories[categories.length - 1] : null,
    comparison: { previousTotal: previous.total, change, changePct },
    income: cash.income,
    net: cash.net,
    savingsRate: cash.savingsRate,
  };
};

const FORMATS = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m' };

/** Spend grouped by day / week / month. Days are zero-filled so line charts have no gaps. */
const getTrends = async (userId, start, end, groupBy = 'day', Model = Expense) => {
  const format = FORMATS[groupBy] || FORMATS.day;
  const rows = await Model.aggregate([
    { $match: live(userId, start, end) },
    {
      $group: {
        _id: { $dateToString: { format, date: '$date', timezone: 'UTC' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r]));

  if (groupBy === 'day') {
    const out = [];
    const lastDay = new Date(Math.min(end.getTime(), addDays(startOfTodayUTC(), 1).getTime()));
    const stop = lastDay > start ? lastDay : end;
    for (let d = new Date(start), i = 0; d < stop && i < 400; d = addDays(d, 1), i += 1) {
      const key = toISODate(d);
      const row = map.get(key);
      out.push({ label: key, total: round(row?.total || 0), count: row?.count || 0 });
    }
    return out;
  }
  return rows.map((r) => ({ label: r._id, total: round(r.total), count: r.count }));
};

const monthKeys = (months) => {
  const now = startOfTodayUTC();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const keys = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return { start, end, keys };
};

/** Last N calendar months (including current), zero-filled. */
const getMonthlyTotals = async (userId, months = 6) => {
  const { start, end, keys } = monthKeys(months);
  const rows = await getTrends(userId, start, end, 'month');
  const map = new Map(rows.map((r) => [r.label, r]));
  return keys.map((key) => ({ label: key, total: map.get(key)?.total || 0, count: map.get(key)?.count || 0 }));
};

/** Last N months of income vs expenses vs net, zero-filled. */
const getMonthlyCashflow = async (userId, months = 6) => {
  const { start, end, keys } = monthKeys(months);
  const [exp, inc] = await Promise.all([
    getTrends(userId, start, end, 'month', Expense),
    getTrends(userId, start, end, 'month', Income),
  ]);
  const e = new Map(exp.map((r) => [r.label, r.total]));
  const i = new Map(inc.map((r) => [r.label, r.total]));
  return keys.map((key) => {
    const income = i.get(key) || 0;
    const expenses = e.get(key) || 0;
    return { label: key, income, expenses, net: round(income - expenses) };
  });
};

/** Last N ISO weeks of spending. */
const getWeeklyTotals = async (userId, weeks = 8) => {
  const end = addDays(startOfTodayUTC(), 1);
  const start = addDays(end, -weeks * 7);
  return getTrends(userId, start, end, 'week');
};

/** Category totals for the range vs. the preceding period of the same length. */
const getCategoryComparison = async (userId, start, end) => {
  const elapsedMs = Math.max(effectiveEnd(end) - start, DAY_MS);
  const prevStart = new Date(start.getTime() - elapsedMs);
  const [current, previous] = await Promise.all([
    getCategoryTotals(userId, start, end),
    getCategoryTotals(userId, prevStart, start),
  ]);
  const names = [...new Set([...current.map((c) => c.category), ...previous.map((c) => c.category)])];
  return names
    .map((category) => ({
      category,
      current: current.find((c) => c.category === category)?.total || 0,
      previous: previous.find((c) => c.category === category)?.total || 0,
    }))
    .sort((a, b) => b.current - a.current);
};

/** Spent per category inside a range, as a plain map. Used by budgets. */
const getSpentMap = async (userId, start, end) => {
  const rows = await getCategoryTotals(userId, start, end);
  return new Map(rows.map((r) => [r.category, r.total]));
};

module.exports = {
  getCategoryTotals,
  getTotals,
  getIncomeTotals,
  getRecurringSpent,
  getCashflow,
  getSummary,
  getTrends,
  getMonthlyTotals,
  getMonthlyCashflow,
  getWeeklyTotals,
  getCategoryComparison,
  getSpentMap,
};
